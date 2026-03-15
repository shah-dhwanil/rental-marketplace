"""Wishlists router."""
from fastapi import APIRouter, status
from api.users.dependencies import CurrentUserDep
from api.wishlists.dependencies import WishlistServiceDep
from api.wishlists.models.responses import WishlistIdsResponse, WishlistItemResponse, WishlistToggleResponse
from api.exceptions.app import AppException, ErrorTypes


router = APIRouter(prefix="/api/v1/wishlist", tags=["Wishlist"])


def _require_customer(claims: CurrentUserDep) -> CurrentUserDep:
    if claims.role != "customer":
        raise AppException(ErrorTypes.NotEnoughPermission, "Customer access required")
    return claims


@router.get("", response_model=list[WishlistItemResponse], summary="List my wishlist")
async def list_wishlist(claims: CurrentUserDep, service: WishlistServiceDep):
    _require_customer(claims)
    return await service.list_wishlist(claims.user_id)


@router.get("/ids", response_model=WishlistIdsResponse, summary="Get wishlist product IDs (fast sync)")
async def get_wishlist_ids(claims: CurrentUserDep, service: WishlistServiceDep):
    _require_customer(claims)
    return await service.get_wishlist_ids(claims.user_id)


@router.post(
    "/toggle/{product_id}",
    response_model=WishlistToggleResponse,
    summary="Toggle product in wishlist (add if absent, remove if present)",
)
async def toggle_wishlist(product_id: str, claims: CurrentUserDep, service: WishlistServiceDep):
    _require_customer(claims)
    return await service.toggle(claims.user_id, product_id)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove product from wishlist",
)
async def remove_from_wishlist(product_id: str, claims: CurrentUserDep, service: WishlistServiceDep):
    _require_customer(claims)
    await service.remove_item(claims.user_id, product_id)
