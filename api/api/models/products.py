"""Models for theproducts module (requests + responses consolidated)."""


from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, field_validator


class CreateProductRequest(BaseModel):
    name: str
    description: str = ""
    properties: dict[str, Any] = {}
    category_id: str
    price_day: float
    price_week: float
    price_month: float
    security_deposit: float = 0
    defect_charge: float = 0
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        if len(v) > 128:
            raise ValueError("Name cannot exceed 128 characters")
        return v

    @field_validator("price_day", "price_week", "price_month")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v

    @field_validator("security_deposit", "defect_charge")
    @classmethod
    def non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Value cannot be negative")
        return v


class UpdateProductRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    properties: Optional[dict[str, Any]] = None
    category_id: Optional[str] = None
    price_day: Optional[float] = None
    price_week: Optional[float] = None
    price_month: Optional[float] = None
    security_deposit: Optional[float] = None
    defect_charge: Optional[float] = None
    is_active: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be blank")
            if len(v) > 128:
                raise ValueError("Name cannot exceed 128 characters")
        return v

    @field_validator("price_day", "price_week", "price_month")
    @classmethod
    def price_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Price must be greater than 0")
        return v

    @field_validator("security_deposit", "defect_charge")
    @classmethod
    def non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Value cannot be negative")
        return v


class CreateDeviceRequest(BaseModel):
    product_id: str
    serial_no: Optional[str] = None
    condition: str = "good"
    properties: dict[str, Any] = {}
    is_active: bool = True

    @field_validator("condition")
    @classmethod
    def valid_condition(cls, v: str) -> str:
        if v not in ("new", "good", "fair", "poor"):
            raise ValueError("condition must be one of: new, good, fair, poor")
        return v


class UpdateDeviceRequest(BaseModel):
    serial_no: Optional[str] = None
    condition: Optional[str] = None
    properties: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None

    @field_validator("condition")
    @classmethod
    def valid_condition(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("new", "good", "fair", "poor"):
            raise ValueError("condition must be one of: new, good, fair, poor")
        return v


class CalculatePriceRequest(BaseModel):
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


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
