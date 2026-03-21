"""Response models for the orders module."""
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
