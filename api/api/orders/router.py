"""Orders router."""
from typing import Optional

from fastapi import APIRouter, Query, Response, status

from api.models.pagination import PaginatedResponse
from api.orders.dependencies import OrderServiceDep
from api.orders.models.requests import CreateOrderRequest, UpdateOrderStatusRequest
from api.orders.models.responses import CreateOrderResponse, OrderResponse
from api.users.dependencies import AdminDep, CurrentUserDep
from api.exceptions.app import AppException, ErrorTypes

router = APIRouter(prefix="/api/v1/orders", tags=["Orders"])


def _require_customer(claims: CurrentUserDep) -> CurrentUserDep:
    if claims.role != "customer":
        raise AppException(ErrorTypes.NotEnoughPermission, "Customer access required")
    return claims


def _require_vendor(claims: CurrentUserDep) -> CurrentUserDep:
    if claims.role != "vendor":
        raise AppException(ErrorTypes.NotEnoughPermission, "Vendor access required")
    return claims


def _require_vendor_or_admin(claims: CurrentUserDep) -> CurrentUserDep:
    if claims.role not in ("vendor", "admin"):
        raise AppException(ErrorTypes.NotEnoughPermission, "Vendor or admin access required")
    return claims


@router.post(
    "",
    response_model=CreateOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Customer — Place a new rental order",
)
async def create_order(body: CreateOrderRequest, claims: CurrentUserDep, service: OrderServiceDep):
    _require_customer(claims)
    return await service.create_order(body, claims.user_id)


@router.post(
    "/{order_id}/confirm-payment",
    response_model=OrderResponse,
    summary="Customer — Confirm payment (backend verifies via stored PaymentIntent)",
)
async def confirm_payment(order_id: str, claims: CurrentUserDep, service: OrderServiceDep):
    _require_customer(claims)
    return await service.confirm_payment(order_id, claims.user_id)


@router.get(
    "/my",
    response_model=PaginatedResponse[OrderResponse],
    summary="Customer — List my orders",
)
async def list_my_orders(
    claims: CurrentUserDep,
    service: OrderServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    _require_customer(claims)
    return await service.list_customer_orders(claims.user_id, page, page_size)


@router.get(
    "/vendor",
    response_model=PaginatedResponse[OrderResponse],
    summary="Vendor — List orders for my store",
)
async def list_vendor_orders(
    claims: CurrentUserDep,
    service: OrderServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    _require_vendor(claims)
    return await service.list_vendor_orders(claims.user_id, page, page_size, status_filter)


@router.get(
    "",
    response_model=PaginatedResponse[OrderResponse],
    summary="Admin — List all orders",
)
async def list_all_orders(
    claims: AdminDep,
    service: OrderServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    return await service.list_all_orders(page, page_size, status_filter)


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Get order details",
)
async def get_order(order_id: str, claims: CurrentUserDep, service: OrderServiceDep):
    return await service.get_order(order_id, claims.user_id, claims.role)


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    summary="Vendor/Admin/Customer — Update order status",
)
async def update_order_status(
    order_id: str, body: UpdateOrderStatusRequest, claims: CurrentUserDep, service: OrderServiceDep
):
    return await service.update_order_status(order_id, body, claims.user_id, claims.role)


@router.get(
    "/{order_id}/invoice",
    summary="Download order invoice PDF",
    response_class=Response,
)
async def download_invoice(order_id: str, claims: CurrentUserDep, service: OrderServiceDep):
    pdf_bytes = await service.get_invoice_pdf(order_id, claims.user_id, claims.role)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="invoice-{order_id[:8]}.pdf"'},
    )


@router.get(
    "/{order_id}/contract",
    summary="Download rental contract PDF",
    response_class=Response,
)
async def download_contract(order_id: str, claims: CurrentUserDep, service: OrderServiceDep):
    pdf_bytes = await service.get_contract_pdf(order_id, claims.user_id, claims.role)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="contract-{order_id[:8]}.pdf"'},
    )
