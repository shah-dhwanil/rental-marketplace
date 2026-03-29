"""Review response models."""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ReviewResponse(BaseModel):
    """Response model for a single review."""
    
    id: UUID
    product_id: UUID
    order_id: UUID
    customer_id: UUID
    customer_name: Optional[str] = None
    customer_avatar: Optional[str] = None
    rating: int
    comment: str
    images: list[str] = Field(default_factory=list)
    vendor_response: Optional[str] = None
    vendor_responded_at: Optional[datetime] = None
    helpful_count: int
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ReviewStatsResponse(BaseModel):
    """Response model for product review statistics."""
    
    product_id: UUID
    average_rating: float = Field(default=0.0, description="Average rating (0-5)")
    total_reviews: int = Field(default=0, description="Total number of reviews")
    rating_distribution: dict[str, int] = Field(
        default_factory=dict,
        description="Distribution of ratings (1-5)"
    )
    
    class Config:
        from_attributes = True


class ReviewListResponse(BaseModel):
    """Response model for paginated list of reviews."""
    
    items: list[ReviewResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        from_attributes = True


class ReviewCreatedResponse(BaseModel):
    """Response model after creating a review."""
    
    id: UUID
    message: str = "Review created successfully"
    
    class Config:
        from_attributes = True
