"""Promo codes router."""
from fastapi import APIRouter, Query, status
from api.models.pagination import PaginatedResponse
from api.users.dependencies import AdminDep, CurrentUserDep
from api.promos.dependencies import PromoServiceDep
from api.promos.models.requests import CreatePromoRequest, UpdatePromoRequest, ValidatePromoRequest
from api.promos.models.responses import PromoResponse, PromoValidationResponse
from api.exceptions.app import AppException, ErrorTypes

router = APIRouter(prefix="/api/v1/promos", tags=["Promo Codes"])


def _require_vendor_or_admin(claims: CurrentUserDep) -> CurrentUserDep:
    if claims.role not in ("vendor", "admin"):
        raise AppException(ErrorTypes.NotEnoughPermission, "Vendor or admin access required")
    return claims


@router.post(
    "",
    response_model=PromoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Vendor/Admin — Create promo code",
)
async def create_promo(body: CreatePromoRequest, claims: CurrentUserDep, service: PromoServiceDep):
    _require_vendor_or_admin(claims)
    return await service.create_promo(body, claims.role, claims.user_id)


@router.get(
    "/mine",
    response_model=PaginatedResponse[PromoResponse],
    summary="Vendor — List my promo codes",
)
async def list_my_promos(
    claims: CurrentUserDep,
    service: PromoServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    if claims.role != "vendor":
        raise AppException(ErrorTypes.NotEnoughPermission, "Vendor access required")
    return await service.list_my_promos(claims.user_id, page, page_size)


@router.get(
    "",
    response_model=PaginatedResponse[PromoResponse],
    summary="Admin — List all promo codes",
)
async def list_all_promos(
    claims: AdminDep,
    service: PromoServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    return await service.list_all_promos(page, page_size)


@router.get("/{promo_id}", response_model=PromoResponse, summary="Get promo code")
async def get_promo(promo_id: str, claims: CurrentUserDep, service: PromoServiceDep):
    _require_vendor_or_admin(claims)
    return await service.get_promo(promo_id)


@router.patch("/{promo_id}", response_model=PromoResponse, summary="Vendor/Admin — Update promo code")
async def update_promo(promo_id: str, body: UpdatePromoRequest, claims: CurrentUserDep, service: PromoServiceDep):
    _require_vendor_or_admin(claims)
    return await service.update_promo(promo_id, body, claims.role, claims.user_id)


@router.delete("/{promo_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Vendor/Admin — Delete promo code")
async def delete_promo(promo_id: str, claims: CurrentUserDep, service: PromoServiceDep):
    _require_vendor_or_admin(claims)
    await service.delete_promo(promo_id, claims.role, claims.user_id)


@router.post(
    "/validate",
    response_model=PromoValidationResponse,
    summary="Customer — Validate promo code",
)
async def validate_promo(body: ValidatePromoRequest, service: PromoServiceDep):
    return await service.validate_promo(body)
