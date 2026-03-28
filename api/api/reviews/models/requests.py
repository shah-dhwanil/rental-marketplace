"""Review request models."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID


class CreateReviewRequest(BaseModel):
    """Request model for creating a product review."""
    
    order_id: UUID = Field(..., description="ID of the completed order")
    product_id: UUID = Field(..., description="ID of the product being reviewed")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: str = Field(..., min_length=10, max_length=1000, description="Review comment")
    images: list[str] = Field(default_factory=list, description="List of image URLs")
    
    @field_validator('images')
    @classmethod
    def validate_images(cls, v):
        """Validate image URLs."""
        if len(v) > 5:
            raise ValueError('Maximum 5 images allowed')
        return v


class UpdateVendorResponseRequest(BaseModel):
    """Request model for vendor responding to a review."""
    
    vendor_response: str = Field(..., min_length=10, max_length=500, description="Vendor's response to the review")


class GetReviewsQueryParams(BaseModel):
    """Query parameters for fetching reviews."""
    
    product_id: Optional[UUID] = Field(None, description="Filter by product ID")
    customer_id: Optional[UUID] = Field(None, description="Filter by customer ID")
    order_id: Optional[UUID] = Field(None, description="Filter by order ID")
    min_rating: Optional[int] = Field(None, ge=1, le=5, description="Minimum rating filter")
    sort_by: str = Field("created_at", description="Sort field: created_at, rating, helpful_count")
    sort_order: str = Field("desc", description="Sort order: asc or desc")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(10, ge=1, le=100, description="Items per page")
