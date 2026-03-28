"""Service layer — business logic for rental orders."""
from __future__ import annotations

import asyncio
import math
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional
from uuid import UUID

import stripe
import structlog

from api.exceptions.app import AppException, ErrorTypes, UnkownAppException
from api.models.pagination import PaginatedResponse
from api.orders.exceptions import (
    NoDeviceAvailableException,
    OrderAccessDeniedException,
    OrderAlreadyConfirmedException,
    OrderNotCancellableException,
    OrderNotFoundException,
    PaymentVerificationException,
)
from api.orders.models.requests import CreateOrderRequest, UpdateOrderStatusRequest
from api.orders.models.responses import CreateOrderResponse, OrderResponse
from api.orders.repository import OrderRepository
from api.promos.repository import PromoRepository
from api.products.repository import ProductRepository
from api.addresses.repository import AddressRepository

logger = structlog.get_logger(__name__)

GST_RATE = Decimal("0.09")  # 9% CGST and 9% SGST


# ── Pure calculation helpers ───────────────────────────────────────────────────

def _rental_days(start: date, end: date) -> int:
    return (end - start).days + 1


def _calculate_rental_amount(
    price_day: Decimal, price_week: Decimal, price_month: Decimal, days: int
) -> Decimal:
    """
    Calculate rental amount with roundoff logic matching the price calculation endpoint.

    Rules:
    - <7 days: use daily rate
    - ≥7 days and <30 days: use weekly rate (round up, e.g., 2 weeks 2 days = 3 weeks)
    - ≥30 days: use monthly rate (round up, e.g., 1 month 5 days = 2 months)
    """
    if days < 7:
        return price_day * days
    if days < 30:
        weeks = math.ceil(days / 7)
        return price_week * weeks
    # days >= 30
    months = math.ceil(days / 30)
    return price_month * months


def _apply_promo(amount: Decimal, promo_row: dict) -> Decimal:
    """Compute discount amount from a validated promo row."""
    if promo_row["discount_type"] == "percentage":
        discount = amount * Decimal(str(promo_row["discount_value"])) / Decimal("100")
        if promo_row.get("max_discount"):
            discount = min(discount, Decimal(str(promo_row["max_discount"])))
    else:
        discount = min(Decimal(str(promo_row["discount_value"])), amount)
    return discount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _row_to_response(row: dict) -> OrderResponse:
    return OrderResponse(
        id=str(row["id"]),
        customer_id=str(row["customer_id"]),
        product_id=str(row["product_id"]),
        vendor_id=str(row["vendor_id"]),
        address_id=str(row["address_id"]),
        device_id=str(row["device_id"]),
        start_date=row["start_date"],
        end_date=row["end_date"],
        delivery_date=row["delivery_date"],
        return_date=row["return_date"],
        rental_days=row["rental_days"],
        delivery_type=row["delivery_type"],
        promo_code_id=str(row["promo_code_id"]) if row.get("promo_code_id") else None,
        promo_code=row.get("promo_code"),
        security_deposit=float(row["security_deposit"]),
        amount=float(row["amount"]),
        discount=float(row["discount"]),
        net_amount=float(row["net_amount"]),
        cgst_amount=float(row["cgst_amount"]),
        sgst_amount=float(row["sgst_amount"]),
        damage_amount=float(row["damage_amount"]),
        grand_total=float(row["grand_total"]),
        status=row["status"],
        cancellation_reason=row.get("cancellation_reason"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        customer_name=row.get("customer_name"),
        customer_email=row.get("customer_email"),
        customer_mobile=row.get("customer_mobile"),
        product_name=row.get("product_name"),
        vendor_name=row.get("vendor_name"),
        vendor_gst=row.get("vendor_gst"),
        vendor_city=row.get("vendor_city"),
        delivery_address_line=row.get("delivery_address_line"),
        defect_charge=float(row["defect_charge"]) if row.get("defect_charge") is not None else None,
    )


class OrderService:
    def __init__(
        self,
        order_repo: OrderRepository,
        product_repo: ProductRepository,
        address_repo: AddressRepository,
        promo_repo: PromoRepository,
        stripe_secret_key: str,
    ) -> None:
        self._orders = order_repo
        self._products = product_repo
        self._addresses = address_repo
        self._promos = promo_repo
        stripe.api_key = stripe_secret_key

    # ── Create Order ──────────────────────────────────────────────────────

    async def create_order(self, data: CreateOrderRequest, customer_id: str) -> CreateOrderResponse:
        try:
            product = await self._products.find_by_id(UUID(data.product_id))
            if not product or not product.get("is_active") or product.get("is_deleted"):
                raise AppException(ErrorTypes.ResourceNotFound, "Product not found or inactive", resource="product")

            address = await self._addresses.find_by_id(UUID(data.address_id))
            if not address or str(address["customer_id"]) != customer_id:
                raise AppException(ErrorTypes.ResourceNotFound, "Delivery address not found", resource="address")

            days = _rental_days(data.start_date, data.end_date)
            device = await self._orders.find_available_device(
                UUID(data.product_id), data.start_date, data.end_date
            )
            if not device:
                raise NoDeviceAvailableException()

            amount = _calculate_rental_amount(
                Decimal(str(product["price_day"])),
                Decimal(str(product["price_week"])),
                Decimal(str(product["price_month"])),
                days,
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            discount = Decimal("0")
            promo_code_id: Optional[UUID] = None
            promo_code_str: Optional[str] = None

            if data.promo_code:
                promo_row = await self._promos.find_by_code(data.promo_code)
                if promo_row:
                    discount = _apply_promo(amount, promo_row)
                    promo_code_id = promo_row["id"]
                    promo_code_str = promo_row["code"]

            net_amount = (amount - discount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            cgst = (net_amount * GST_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            sgst = cgst
            security_deposit = Decimal(str(product["security_deposit"]))
            grand_total = (net_amount + cgst + sgst + security_deposit).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            order_row = await self._orders.create_order({
                "customer_id": UUID(customer_id),
                "product_id": UUID(data.product_id),
                "vendor_id": product["vendor_id"],
                "address_id": UUID(data.address_id),
                "device_id": device["id"],
                "start_date": data.start_date,
                "end_date": data.end_date,
                "delivery_date": data.delivery_date,
                "return_date": data.return_date,
                "rental_days": days,
                "delivery_type": data.delivery_type,
                "promo_code_id": promo_code_id,
                "promo_code": promo_code_str,
                "security_deposit": security_deposit,
                "amount": amount,
                "discount": discount,
                "net_amount": net_amount,
                "cgst_amount": cgst,
                "sgst_amount": sgst,
                "grand_total": grand_total,
            })

            # Create PaymentIntent WITHOUT confirming (frontend will collect payment)
            intent = await asyncio.to_thread(
                stripe.PaymentIntent.create,
                amount=int(grand_total * 100),
                currency="inr",
                payment_method_types=["card"],
                metadata={
                    "order_id": str(order_row["id"]),
                    "customer_id": customer_id,
                },
            )

            await self._orders.create_order_payment({
                "order_id": order_row["id"],
                "customer_id": UUID(customer_id),
                "stripe_payment_intent_id": intent.id,
                "amount": grand_total,
            })

            logger.info("order_created", order_id=str(order_row["id"]), customer_id=customer_id)
            return CreateOrderResponse(
                order=_row_to_response(order_row),
                client_secret=intent.client_secret or "",
            )
        except AppException:
            raise
        except stripe.StripeError as exc:
            logger.error("stripe_error", exc_info=True)
            raise PaymentVerificationException(f"Payment gateway error: {exc.user_message}") from exc
        except Exception as exc:
            logger.error("create_order_failed", exc_info=True)
            raise UnkownAppException() from exc

    # ── Confirm Payment ───────────────────────────────────────────────────

    async def confirm_payment(
        self, order_id: str, customer_id: str
    ) -> OrderResponse:
        try:
            order = await self._orders.find_by_id(UUID(order_id))
            if not order:
                raise OrderNotFoundException(order_id)
            if str(order["customer_id"]) != customer_id:
                raise OrderAccessDeniedException()
            if order["status"] != "pending_payment":
                raise OrderAlreadyConfirmedException()

            # Look up the stored PaymentIntent ID from the DB
            payment = await self._orders.find_payment_by_order(UUID(order_id))
            if not payment:
                raise PaymentVerificationException("No payment record found for this order")

            intent = await asyncio.to_thread(stripe.PaymentIntent.retrieve, payment["stripe_payment_intent_id"])
            if intent.status != "succeeded":
                raise PaymentVerificationException(f"Payment not successful — status: {intent.status}")

            await self._orders.update_payment_status(
                payment["id"],
                "completed",
                {"id": intent.id, "status": intent.status},
            )

            updated = await self._orders.update_status(UUID(order_id), "confirmed")

            # Increment promo usage only after successful payment
            if order.get("promo_code_id"):
                await self._promos.increment_uses(order["promo_code_id"])

            logger.info("order_confirmed", order_id=order_id)
            return _row_to_response(updated)
        except AppException:
            raise
        except stripe.StripeError as exc:
            logger.error("stripe_verify_error", exc_info=True)
            raise PaymentVerificationException(f"Payment verification failed: {exc.user_message}") from exc
        except Exception as exc:
            logger.error("confirm_payment_failed", exc_info=True)
            raise UnkownAppException() from exc

    # ── Read ──────────────────────────────────────────────────────────────

    async def get_order(self, order_id: str, caller_id: str, caller_role: str) -> OrderResponse:
        try:
            order = await self._orders.find_by_id(UUID(order_id))
            if not order:
                raise OrderNotFoundException(order_id)
            self._assert_access(order, caller_id, caller_role)
            return _row_to_response(order)
        except AppException:
            raise
        except Exception as exc:
            logger.error("get_order_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_customer_orders(
        self, customer_id: str, page: int, page_size: int
    ) -> PaginatedResponse[OrderResponse]:
        try:
            rows, total = await self._orders.list_by_customer(UUID(customer_id), page, page_size)
            return PaginatedResponse(items=[_row_to_response(r) for r in rows], total=total, page=page, page_size=page_size)
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_customer_orders_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_vendor_orders(
        self, vendor_id: str, page: int, page_size: int, status: Optional[str]
    ) -> PaginatedResponse[OrderResponse]:
        try:
            rows, total = await self._orders.list_by_vendor(UUID(vendor_id), page, page_size, status)
            return PaginatedResponse(items=[_row_to_response(r) for r in rows], total=total, page=page, page_size=page_size)
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_vendor_orders_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_all_orders(
        self, page: int, page_size: int, status: Optional[str]
    ) -> PaginatedResponse[OrderResponse]:
        try:
            rows, total = await self._orders.list_all(page, page_size, status)
            return PaginatedResponse(items=[_row_to_response(r) for r in rows], total=total, page=page, page_size=page_size)
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_all_orders_failed", exc_info=True)
            raise UnkownAppException() from exc

    # ── Update Status ──────────────────────────────────────────────────────

    async def update_order_status(
        self, order_id: str, data: UpdateOrderStatusRequest, caller_id: str, caller_role: str
    ) -> OrderResponse:
        try:
            order = await self._orders.find_by_id(UUID(order_id))
            if not order:
                raise OrderNotFoundException(order_id)
            self._assert_access(order, caller_id, caller_role)
            self._validate_status_transition(order["status"], data.status, caller_role)
            
            # If marking as completed with a defect charge, create it first
            defect_charge_amount = None
            if data.status == "completed" and data.defect_charge and caller_role == "vendor":
                try:
                    # Import here to avoid circular dependency
                    from api.defects.repository import DefectRepository
                    from api.defects.service import DefectService
                    from api.defects.models.requests import CreateDefectChargeRequest
                    from api.database import get_db_pool
                    
                    db_pool = get_db_pool()
                    defect_repo = DefectRepository(db_pool)
                    defect_service = DefectService(defect_repo)
                    
                    defect_request = CreateDefectChargeRequest(
                        amount=data.defect_charge.amount,
                        description=data.defect_charge.description,
                        images=data.defect_charge.images,
                    )
                    
                    defect_response = await defect_service.create_defect_charge(
                        order_id=UUID(order_id),
                        vendor_id=UUID(caller_id),
                        request=defect_request,
                    )
                    
                    defect_charge_amount = float(data.defect_charge.amount)
                    logger.info(
                        "defect_charge_created_with_order_completion",
                        order_id=order_id,
                        defect_id=defect_response.id,
                        amount=defect_charge_amount,
                    )
                except Exception as exc:
                    logger.error("defect_charge_creation_failed", order_id=order_id, exc_info=True)
                    # Don't fail the order completion if defect charge fails
                    # but log the error
            
            updated = await self._orders.update_status(UUID(order_id), data.status, data.cancellation_reason)
            
            # Add defect charge info to response if created
            response = _row_to_response(updated)
            if defect_charge_amount is not None:
                response.defect_charge = defect_charge_amount
            
            logger.info("order_status_updated", order_id=order_id, status=data.status)
            return response
        except AppException:
            raise
        except Exception as exc:
            logger.error("update_status_failed", exc_info=True)
            raise UnkownAppException() from exc

    # ── PDF ───────────────────────────────────────────────────────────────

    async def get_invoice_pdf(self, order_id: str, caller_id: str, caller_role: str) -> bytes:
        from api.orders.pdf import generate_invoice_pdf
        order = await self._orders.find_by_id(UUID(order_id))
        if not order:
            raise OrderNotFoundException(order_id)
        self._assert_access(order, caller_id, caller_role)
        return generate_invoice_pdf(order)

    async def get_contract_pdf(self, order_id: str, caller_id: str, caller_role: str) -> bytes:
        from api.orders.pdf import generate_contract_pdf
        order = await self._orders.find_by_id(UUID(order_id))
        if not order:
            raise OrderNotFoundException(order_id)
        self._assert_access(order, caller_id, caller_role)
        return generate_contract_pdf(order)

    # ── Internal helpers ───────────────────────────────────────────────────

    def _assert_access(self, order: dict, caller_id: str, caller_role: str) -> None:
        if caller_role == "admin":
            return
        if caller_role == "customer" and str(order["customer_id"]) == caller_id:
            return
        if caller_role == "vendor" and str(order["vendor_id"]) == caller_id:
            return
        raise OrderAccessDeniedException()

    def _validate_status_transition(self, current: str, new: str, role: str) -> None:
        """Enforce which status transitions are allowed per role."""
        allowed: dict[str, dict[str, list[str]]] = {
            "vendor": {
                "confirmed": ["active", "cancelled"],
                "active": ["completed"],
            },
            "admin": {
                "pending_payment": ["cancelled"],
                "confirmed": ["active", "cancelled"],
                "active": ["completed", "cancelled"],
            },
            "customer": {
                "confirmed": ["cancelled"],
            },
        }
        permitted = allowed.get(role, {}).get(current, [])
        if new not in permitted:
            raise OrderNotCancellableException()
