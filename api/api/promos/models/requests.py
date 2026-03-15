"""Request models for promo codes."""
from datetime import datetime
from typing import Annotated, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


PromoScope = Literal["product", "vendor", "platform"]
DiscountType = Literal["percentage", "fixed"]


class CreatePromoRequest(BaseModel):
    code: str
    scope: PromoScope
    product_id: Optional[str] = None
    vendor_id: Optional[str] = None  # only needed when scope='vendor'; for scope='product' it's derived
    discount_type: DiscountType
    discount_value: Annotated[float, Field(gt=0)]
    min_order_value: Optional[float] = None
    max_discount: Optional[float] = None
    valid_from: datetime
    valid_until: datetime
    max_uses: Optional[int] = None

    @field_validator("code")
    @classmethod
    def uppercase_strip(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("discount_value")
    @classmethod
    def pct_cap(cls, v: float, info) -> float:
        return v

    @model_validator(mode="after")
    def check_scope_ids(self) -> "CreatePromoRequest":
        if self.scope == "product" and not self.product_id:
            raise ValueError("product_id is required for scope='product'")
        if self.scope == "vendor" and not self.vendor_id:
            raise ValueError("vendor_id is required for scope='vendor'")
        if self.scope == "platform" and (self.product_id or self.vendor_id):
            raise ValueError("product_id and vendor_id must be null for scope='platform'")
        if self.discount_type == "percentage" and self.discount_value > 100:
            raise ValueError("Percentage discount cannot exceed 100")
        if self.valid_until <= self.valid_from:
            raise ValueError("valid_until must be after valid_from")
        return self


class UpdatePromoRequest(BaseModel):
    discount_value: Optional[float] = None
    min_order_value: Optional[float] = None
    max_discount: Optional[float] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    max_uses: Optional[int] = None
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def check_dates(self) -> "UpdatePromoRequest":
        if self.valid_from and self.valid_until and self.valid_until <= self.valid_from:
            raise ValueError("valid_until must be after valid_from")
        return self


class ValidatePromoRequest(BaseModel):
    code: str
    product_id: str
    order_value: float

    @field_validator("code")
    @classmethod
    def uppercase_strip(cls, v: str) -> str:
        return v.strip().upper()
