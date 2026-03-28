"""Defect charge response models."""
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
