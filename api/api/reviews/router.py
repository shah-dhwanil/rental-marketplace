"""Reviews router."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query, status

from api.reviews.dependencies import ReviewServiceDep
from api.reviews.models.requests import (
    CreateReviewRequest,
    UpdateVendorResponseRequest,
    GetReviewsQueryParams,
)
from api.reviews.models.responses import (
    ReviewResponse,
    ReviewStatsResponse,
    ReviewListResponse,
    ReviewCreatedResponse,
)
from api.users.dependencies import CurrentUserDep
from api.exceptions.app import AppException, ErrorTypes

router = APIRouter(prefix="/api/v1/reviews", tags=["Reviews"])


def _require_customer(claims: CurrentUserDep) -> CurrentUserDep:
    """Require customer role."""
    if claims.role != "customer":
        raise AppException(ErrorTypes.NotEnoughPermission, "Customer access required")
    return claims


def _require_vendor(claims: CurrentUserDep) -> CurrentUserDep:
    """Require vendor role."""
    if claims.role != "vendor":
        raise AppException(ErrorTypes.NotEnoughPermission, "Vendor access required")
    return claims


@router.post(
    "",
    response_model=ReviewCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Customer — Create a review for a completed order",
)
async def create_review(
    body: CreateReviewRequest,
    claims: CurrentUserDep,
    service: ReviewServiceDep,
):
    """Create a new product review. Only customers with completed orders can review."""
    _require_customer(claims)
    return await service.create_review(body, claims.user_id)


@router.get(
    "/{review_id}",
    response_model=ReviewResponse,
    summary="Get a review by ID",
)
async def get_review(
    review_id: UUID,
    service: ReviewServiceDep,
):
    """Get details of a specific review."""
    return await service.get_review_by_id(review_id)


@router.get(
    "",
    response_model=ReviewListResponse,
    summary="List reviews with filtering and pagination",
)
async def list_reviews(
    service: ReviewServiceDep,
    product_id: Optional[UUID] = Query(None, description="Filter by product ID"),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer ID"),
    order_id: Optional[UUID] = Query(None, description="Filter by order ID"),
    min_rating: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating filter"),
    sort_by: str = Query("created_at", description="Sort field: created_at, rating, helpful_count"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
):
    """List reviews with optional filtering, sorting, and pagination."""
    params = GetReviewsQueryParams(
        product_id=product_id,
        customer_id=customer_id,
        order_id=order_id,
        min_rating=min_rating,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return await service.list_reviews(params)


@router.patch(
    "/{review_id}/vendor-response",
    response_model=ReviewResponse,
    summary="Vendor — Add or update response to a review",
)
async def update_vendor_response(
    review_id: UUID,
    body: UpdateVendorResponseRequest,
    claims: CurrentUserDep,
    service: ReviewServiceDep,
):
    """Add or update vendor response to a review. Only the vendor who owns the order can respond."""
    _require_vendor(claims)
    return await service.update_vendor_response(review_id, body, claims.user_id)


@router.get(
    "/products/{product_id}/stats",
    response_model=ReviewStatsResponse,
    summary="Get rating statistics for a product",
)
async def get_product_rating_stats(
    product_id: UUID,
    service: ReviewServiceDep,
):
    """Get average rating, total reviews, and rating distribution for a product."""
    return await service.get_product_rating_stats(product_id)


@router.post(
    "/{review_id}/helpful",
    response_model=ReviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark a review as helpful",
)
async def mark_review_helpful(
    review_id: UUID,
    service: ReviewServiceDep,
):
    """Increment the helpful count for a review."""
    return await service.increment_helpful_count(review_id)
