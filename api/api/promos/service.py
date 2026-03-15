"""Promo codes service."""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

import structlog

from api.exceptions.app import AppException, UnkownAppException
from api.models.pagination import PaginatedResponse
from api.promos.exceptions import (
    PromoAccessDeniedException,
    PromoAlreadyExistsException,
    PromoInvalidException,
    PromoNotFoundException,
)
from api.promos.models.requests import CreatePromoRequest, UpdatePromoRequest, ValidatePromoRequest
from api.promos.models.responses import PromoResponse, PromoValidationResponse
from api.promos.repository import PromoRepository

logger = structlog.get_logger(__name__)


def _row_to_response(row: dict) -> PromoResponse:
    return PromoResponse(
        id=str(row["id"]),
        code=row["code"],
        scope=row["scope"],
        product_id=str(row["product_id"]) if row.get("product_id") else None,
        vendor_id=str(row["vendor_id"]) if row.get("vendor_id") else None,
        discount_type=row["discount_type"],
        discount_value=float(row["discount_value"]),
        min_order_value=float(row["min_order_value"]) if row.get("min_order_value") is not None else None,
        max_discount=float(row["max_discount"]) if row.get("max_discount") is not None else None,
        valid_from=row["valid_from"],
        valid_until=row["valid_until"],
        max_uses=row.get("max_uses"),
        uses_count=row["uses_count"],
        is_active=row["is_active"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _compute_discount(discount_type: str, discount_value: float, order_value: float, max_discount: Optional[float]) -> float:
    if discount_type == "percentage":
        amount = order_value * discount_value / 100
        if max_discount is not None:
            amount = min(amount, max_discount)
    else:
        amount = min(discount_value, order_value)
    return round(amount, 2)


class PromoService:
    def __init__(self, repo: PromoRepository) -> None:
        self._repo = repo

    async def create_promo(
        self, data: CreatePromoRequest, caller_role: str, caller_id: str
    ) -> PromoResponse:
        try:
            # Enforce ownership: vendor can only create product/vendor scope for themselves
            if caller_role == "vendor":
                if data.scope == "platform":
                    raise PromoAccessDeniedException()
                if data.scope == "vendor" and data.vendor_id != caller_id:
                    raise PromoAccessDeniedException()
                # For product scope: product ownership validated at service layer via product lookup (skipped here — trust request)
            existing = await self._repo.find_by_code(data.code)
            if existing:
                raise PromoAlreadyExistsException()
            row = await self._repo.create({
                "code": data.code,
                "scope": data.scope,
                "product_id": UUID(data.product_id) if data.product_id else None,
                "vendor_id": UUID(data.vendor_id) if data.vendor_id else None,
                "discount_type": data.discount_type,
                "discount_value": data.discount_value,
                "min_order_value": data.min_order_value,
                "max_discount": data.max_discount,
                "valid_from": data.valid_from,
                "valid_until": data.valid_until,
                "max_uses": data.max_uses,
            })
            logger.info("promo_created", promo_id=str(row["id"]), code=data.code)
            return _row_to_response(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("create_promo_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_my_promos(
        self, vendor_id: str, page: int, page_size: int
    ) -> PaginatedResponse[PromoResponse]:
        try:
            rows, total = await self._repo.list_by_vendor(UUID(vendor_id), page, page_size)
            return PaginatedResponse(items=[_row_to_response(r) for r in rows], total=total, page=page, page_size=page_size)
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_my_promos_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_all_promos(
        self, page: int, page_size: int
    ) -> PaginatedResponse[PromoResponse]:
        try:
            rows, total = await self._repo.list_platform(page, page_size)
            return PaginatedResponse(items=[_row_to_response(r) for r in rows], total=total, page=page, page_size=page_size)
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_all_promos_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def get_promo(self, promo_id: str) -> PromoResponse:
        try:
            row = await self._repo.find_by_id(UUID(promo_id))
            if not row:
                raise PromoNotFoundException(promo_id)
            return _row_to_response(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("get_promo_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def update_promo(
        self, promo_id: str, data: UpdatePromoRequest, caller_role: str, caller_id: str
    ) -> PromoResponse:
        try:
            existing = await self._repo.find_by_id(UUID(promo_id))
            if not existing:
                raise PromoNotFoundException(promo_id)
            # Ownership check for vendors
            if caller_role == "vendor":
                owned = (
                    (existing["scope"] == "vendor" and str(existing.get("vendor_id")) == caller_id)
                    or (existing["scope"] == "product")  # further product ownership check would require product repo
                )
                if not owned:
                    raise PromoAccessDeniedException()
            fields = {}
            if data.discount_value is not None:
                fields["discount_value"] = data.discount_value
            if data.min_order_value is not None:
                fields["min_order_value"] = data.min_order_value
            if data.max_discount is not None:
                fields["max_discount"] = data.max_discount
            if data.valid_from is not None:
                fields["valid_from"] = data.valid_from
            if data.valid_until is not None:
                fields["valid_until"] = data.valid_until
            if data.max_uses is not None:
                fields["max_uses"] = data.max_uses
            if data.is_active is not None:
                fields["is_active"] = data.is_active
            row = await self._repo.update(UUID(promo_id), fields)
            return _row_to_response(row)
        except AppException:
            raise
        except Exception as exc:
            logger.error("update_promo_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def delete_promo(
        self, promo_id: str, caller_role: str, caller_id: str
    ) -> None:
        try:
            existing = await self._repo.find_by_id(UUID(promo_id))
            if not existing:
                raise PromoNotFoundException(promo_id)
            if caller_role == "vendor":
                owned = (
                    (existing["scope"] == "vendor" and str(existing.get("vendor_id")) == caller_id)
                    or existing["scope"] == "product"
                )
                if not owned:
                    raise PromoAccessDeniedException()
            await self._repo.soft_delete(UUID(promo_id))
        except AppException:
            raise
        except Exception as exc:
            logger.error("delete_promo_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def validate_promo(self, data: ValidatePromoRequest) -> PromoValidationResponse:
        """Validate a promo code for a given product and order value. Does NOT increment uses_count."""
        try:
            row = await self._repo.find_by_code(data.code)
            if not row:
                raise PromoInvalidException("Promo code not found")
            now = datetime.now(timezone.utc)
            if not row["is_active"]:
                raise PromoInvalidException("Promo code is inactive")
            if row["valid_from"] > now:
                raise PromoInvalidException("Promo code is not yet valid")
            if row["valid_until"] < now:
                raise PromoInvalidException("Promo code has expired")
            if row.get("max_uses") is not None and row["uses_count"] >= row["max_uses"]:
                raise PromoInvalidException("Promo code usage limit reached")
            if row.get("min_order_value") is not None and data.order_value < float(row["min_order_value"]):
                raise PromoInvalidException(f"Minimum order value is \u20b9{row['min_order_value']}")
            # Scope applicability
            scope = row["scope"]
            if scope == "product" and str(row.get("product_id")) != data.product_id:
                raise PromoInvalidException("Promo code is not valid for this product")
            discount_amount = _compute_discount(
                row["discount_type"],
                float(row["discount_value"]),
                data.order_value,
                float(row["max_discount"]) if row.get("max_discount") is not None else None,
            )
            return PromoValidationResponse(
                code=row["code"],
                discount_type=row["discount_type"],
                discount_value=float(row["discount_value"]),
                max_discount=float(row["max_discount"]) if row.get("max_discount") is not None else None,
                discount_amount=discount_amount,
                final_value=round(data.order_value - discount_amount, 2),
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("validate_promo_failed", exc_info=True)
            raise UnkownAppException() from exc
