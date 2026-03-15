"""Response models for promo codes."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PromoResponse(BaseModel):
    id: str
    code: str
    scope: str
    product_id: Optional[str] = None
    vendor_id: Optional[str] = None
    discount_type: str
    discount_value: float
    min_order_value: Optional[float] = None
    max_discount: Optional[float] = None
    valid_from: datetime
    valid_until: datetime
    max_uses: Optional[int] = None
    uses_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PromoValidationResponse(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    max_discount: Optional[float] = None
    discount_amount: float      # the computed discount for the given order_value
    final_value: float          # order_value - discount_amount
