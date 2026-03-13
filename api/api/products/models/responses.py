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
