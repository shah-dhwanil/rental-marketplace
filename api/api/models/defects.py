"""Models for thedefects module (requests + responses consolidated)."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from uuid import UUID
from decimal import Decimal


class CreateDefectChargeRequest(BaseModel):
    """Request model for creating a defect charge when completing an order."""
    
    amount: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2, description="Defect charge amount")
    description: str = Field(..., min_length=10, max_length=500, description="Description of the defect")
    images: list[str] = Field(default_factory=list, description="List of defect evidence image URLs")
    
    @field_validator('images')
    @classmethod
    def validate_images(cls, v):
        """Validate image URLs."""
        if len(v) > 10:
            raise ValueError('Maximum 10 images allowed')
        return v
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        """Validate amount is positive and reasonable."""
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v > 100000:  # Max 100k defect charge
            raise ValueError('Defect charge cannot exceed 100,000')
        return v


class UpdateDefectStatusRequest(BaseModel):
    """Request model for updating defect charge status."""
    
    status: str = Field(..., description="New status: paid, disputed, waived")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Validate status value."""
        valid_statuses = ['paid', 'disputed', 'waived']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class DefectChargeResponse(BaseModel):
    """Response model for a defect charge."""
    
    id: UUID
    order_id: UUID
    vendor_id: UUID
    amount: Decimal
    description: str
    images: list[str]
    stripe_payment_intent_id: Optional[str] = None
    status: str  # pending, paid, disputed, waived
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DefectChargeCreatedResponse(BaseModel):
    """Response model after creating a defect charge."""
    
    id: UUID
    order_id: UUID
    amount: Decimal
    stripe_payment_intent_id: str
    client_secret: str  # For Stripe payment
    message: str = "Defect charge created successfully"
    
    class Config:
        from_attributes = True


class DefectChargeListResponse(BaseModel):
    """Response model for list of defect charges."""
    
    items: list[DefectChargeResponse]
    total: int
    
    class Config:
        from_attributes = True
