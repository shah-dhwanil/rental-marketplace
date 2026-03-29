"""Response models for products and devices."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel


class ProductResponse(BaseModel):
    id: str
    name: str
    description: str
    properties: dict[str, Any]
    image_urls: list[str]
    reserved_qty: int
    category_id: str
    vendor_id: str
    price_day: Decimal
    price_week: Decimal
    price_month: Decimal
    security_deposit: Decimal
    defect_charge: Decimal
    is_active: bool
    average_rating: Optional[float] = 0.0
    total_reviews: Optional[int] = 0
    created_at: datetime
    updated_at: datetime


class ProductSummaryResponse(BaseModel):
    id: str
    name: str
    image_urls: list[str]
    category_id: str
    vendor_id: str
    price_day: Decimal
    is_active: bool
    reserved_qty: int
    average_rating: Optional[float] = 0.0
    total_reviews: Optional[int] = 0
    created_at: datetime


class DeviceResponse(BaseModel):
    id: str
    product_id: str
    serial_no: Optional[str] = None
    condition: str
    properties: dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PriceCalculationResponse(BaseModel):
    product_id: str
    product_name: str
    rental_days: int
    pricing_tier: str  # "daily" | "weekly" | "monthly"
    rental_amount: Decimal
    security_deposit: Decimal
    defect_charge: Decimal
    breakdown: str  # Human-readable breakdown like "3 weeks × ₹500"
