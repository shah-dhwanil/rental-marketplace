"""Request models for the orders module."""
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, model_validator


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


class UpdateOrderStatusRequest(BaseModel):
    status: Literal["active", "completed", "cancelled"]
    cancellation_reason: Optional[str] = None
