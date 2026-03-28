"""Service layer — business logic for product reviews."""
from __future__ import annotations

from typing import Optional
from uuid import UUID
import math

import structlog

from api.exceptions.app import AppException, ErrorTypes
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
from api.reviews.repository import ReviewRepository

logger = structlog.get_logger(__name__)


class ReviewNotFoundException(AppException):
    """Review not found."""
    def __init__(self):
        super().__init__(
            error_type=ErrorTypes.NOT_FOUND,
            message="Review not found",
            details={"reason": "The requested review does not exist"},
        )


class OrderNotCompletedException(AppException):
    """Order is not completed."""
    def __init__(self):
        super().__init__(
            error_type=ErrorTypes.VALIDATION_ERROR,
            message="Order must be completed before reviewing",
            details={"reason": "Only completed orders can be reviewed"},
        )


class ReviewAlreadyExistsException(AppException):
    """Review already exists for this order."""
    def __init__(self):
        super().__init__(
            error_type=ErrorTypes.VALIDATION_ERROR,
            message="Review already exists for this order",
            details={"reason": "Each order can only be reviewed once"},
        )


class UnauthorizedReviewAccessException(AppException):
    """User is not authorized to access this review."""
    def __init__(self):
        super().__init__(
            error_type=ErrorTypes.FORBIDDEN,
            message="You are not authorized to access this review",
            details={"reason": "Only the customer who placed the order can review it"},
        )


class UnauthorizedVendorResponseException(AppException):
    """Vendor is not authorized to respond to this review."""
    def __init__(self):
        super().__init__(
            error_type=ErrorTypes.FORBIDDEN,
            message="You are not authorized to respond to this review",
            details={"reason": "Only the vendor of the reviewed order can respond"},
        )


class ReviewService:
    """Service for product review business logic."""
    
    def __init__(self, review_repo: ReviewRepository) -> None:
        self._repo = review_repo

    async def create_review(
        self,
        request: CreateReviewRequest,
        customer_id: UUID,
    ) -> ReviewCreatedResponse:
        """Create a new product review."""
        # Validate order is completed
        is_completed = await self._repo.check_order_completed(request.order_id)
        if not is_completed:
            logger.warning(
                "review_creation_failed_order_not_completed",
                order_id=request.order_id,
                customer_id=customer_id,
            )
            raise OrderNotCompletedException()

        # Validate customer owns the order
        owns_order = await self._repo.check_customer_owns_order(request.order_id, customer_id)
        if not owns_order:
            logger.warning(
                "review_creation_failed_unauthorized",
                order_id=request.order_id,
                customer_id=customer_id,
            )
            raise UnauthorizedReviewAccessException()

        # Check if review already exists
        existing_review = await self._repo.check_review_exists_for_order(request.order_id)
        if existing_review:
            logger.warning(
                "review_creation_failed_duplicate",
                order_id=request.order_id,
                customer_id=customer_id,
            )
            raise ReviewAlreadyExistsException()

        # Create review
        review_data = await self._repo.create_review(
            product_id=request.product_id,
            order_id=request.order_id,
            customer_id=customer_id,
            rating=request.rating,
            comment=request.comment,
            images=request.images,
        )

        logger.info(
            "review_created_successfully",
            review_id=review_data["id"],
            order_id=request.order_id,
            rating=request.rating,
        )

        return ReviewCreatedResponse(
            id=review_data["id"],
            message="Review created successfully",
        )

    async def get_review_by_id(
        self,
        review_id: UUID,
    ) -> ReviewResponse:
        """Get a review by ID."""
        review_data = await self._repo.get_review_by_id(review_id)
        
        if not review_data:
            raise ReviewNotFoundException()

        return ReviewResponse(**review_data)

    async def get_review_by_order_id(
        self,
        order_id: UUID,
    ) -> Optional[ReviewResponse]:
        """Get a review by order ID."""
        review_data = await self._repo.get_review_by_order_id(order_id)
        
        if not review_data:
            return None

        return ReviewResponse(**review_data)

    async def list_reviews(
        self,
        params: GetReviewsQueryParams,
    ) -> ReviewListResponse:
        """List reviews with filtering and pagination."""
        reviews_data, total = await self._repo.list_reviews(
            product_id=params.product_id,
            customer_id=params.customer_id,
            order_id=params.order_id,
            min_rating=params.min_rating,
            sort_by=params.sort_by,
            sort_order=params.sort_order,
            page=params.page,
            page_size=params.page_size,
        )

        # Calculate total pages
        total_pages = math.ceil(total / params.page_size) if total > 0 else 0

        # Convert to response models
        reviews = [ReviewResponse(**data) for data in reviews_data]

        return ReviewListResponse(
            items=reviews,
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages,
        )

    async def update_vendor_response(
        self,
        review_id: UUID,
        request: UpdateVendorResponseRequest,
        vendor_id: UUID,
    ) -> ReviewResponse:
        """Update vendor response for a review."""
        # Check if review exists
        review_data = await self._repo.get_review_by_id(review_id)
        if not review_data:
            raise ReviewNotFoundException()

        # Validate vendor owns the order
        review_vendor_id = await self._repo.get_review_vendor_id(review_id)
        if review_vendor_id != vendor_id:
            logger.warning(
                "vendor_response_failed_unauthorized",
                review_id=review_id,
                vendor_id=vendor_id,
                review_vendor_id=review_vendor_id,
            )
            raise UnauthorizedVendorResponseException()

        # Update vendor response
        updated_data = await self._repo.update_vendor_response(
            review_id=review_id,
            vendor_response=request.vendor_response,
        )

        if not updated_data:
            raise ReviewNotFoundException()

        logger.info(
            "vendor_response_updated",
            review_id=review_id,
            vendor_id=vendor_id,
        )

        return ReviewResponse(**updated_data)

    async def get_product_rating_stats(
        self,
        product_id: UUID,
    ) -> ReviewStatsResponse:
        """Get rating statistics for a product."""
        stats = await self._repo.get_product_rating_stats(product_id)
        return ReviewStatsResponse(**stats)

    async def increment_helpful_count(
        self,
        review_id: UUID,
    ) -> ReviewResponse:
        """Increment helpful count for a review."""
        updated_data = await self._repo.increment_helpful_count(review_id)
        
        if not updated_data:
            raise ReviewNotFoundException()

        return ReviewResponse(**updated_data)
