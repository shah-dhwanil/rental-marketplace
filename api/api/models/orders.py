"""Models for theorders module (requests + responses consolidated)."""

from datetime import date
from typing import Literal, Optional
from decimal import Decimal

from pydantic import BaseModel, model_validator, Field


class CreateOrderRequest(BaseModel):
    product_id: str
    address_id: str
    start_date: date
    end_date: date
    delivery_date: date
    return_date: date
    delivery_type: Literal["pickup", "home_delivery"]
    promo_code: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "CreateOrderRequest":
        if self.start_date > self.end_date:
            raise ValueError("start_date must be on or before end_date")
        if self.start_date < date.today():
            raise ValueError("start_date cannot be in the past")
        # delivery_date must be within 1 day before start_date
        from datetime import timedelta
        if self.delivery_date < self.start_date - timedelta(days=1):
            raise ValueError("delivery_date cannot be more than 1 day before start_date")
        if self.delivery_date > self.start_date:
            raise ValueError("delivery_date cannot be after start_date")
        # return_date must be within 1 day after end_date
        if self.return_date < self.end_date:
            raise ValueError("return_date cannot be before end_date")
        if self.return_date > self.end_date + timedelta(days=1):
            raise ValueError("return_date cannot be more than 1 day after end_date")
        return self


class ConfirmPaymentRequest(BaseModel):
    """Body is empty for test mode — intent is looked up from DB on the backend."""
    pass


class DefectChargeData(BaseModel):
    """Defect charge data when completing an order."""
    amount: Decimal = Field(..., gt=0, description="Defect charge amount")
    description: str = Field(..., min_length=10, max_length=500, description="Description of defect")
    images: list[str] = Field(default_factory=list, description="Defect evidence images")


class UpdateOrderStatusRequest(BaseModel):
    status: Literal["active", "completed", "cancelled"]
    cancellation_reason: Optional[str] = None
    defect_charge: Optional[DefectChargeData] = None  # Only used when status = "completed"

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class OrderResponse(BaseModel):
    id: str
    customer_id: str
    product_id: str
    vendor_id: str
    address_id: str
    device_id: str
    # Dates
    start_date: date
    end_date: date
    delivery_date: date
    return_date: date
    rental_days: int
    delivery_type: str
    # Promo
    promo_code_id: Optional[str]
    promo_code: Optional[str]
    # Amounts
    security_deposit: float
    amount: float
    discount: float
    net_amount: float
    cgst_amount: float
    sgst_amount: float
    damage_amount: float
    grand_total: float
    # Status
    status: str
    cancellation_reason: Optional[str]
    # Timestamps
    created_at: datetime
    updated_at: datetime
    # Joined fields (optional, populated in detail views)
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_mobile: Optional[str] = None
    product_name: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_gst: Optional[str] = None
    vendor_city: Optional[str] = None
    delivery_address_line: Optional[str] = None
    defect_charge: Optional[float] = None


class CreateOrderResponse(BaseModel):
    order: OrderResponse
    client_secret: str  # Stripe PaymentIntent client_secret for frontend payment
