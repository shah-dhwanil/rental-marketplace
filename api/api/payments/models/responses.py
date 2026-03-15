"""Response models for stored payment methods.

Note: `details` is NEVER returned in responses — only the safe display_label.
"""
from datetime import datetime
from pydantic import BaseModel


class PaymentMethodResponse(BaseModel):
    id: str
    customer_id: str
    type: str
    display_label: str      # e.g. "•••• 4242", "user@upi"
    created_at: datetime


class PaymentMethodDetailResponse(PaymentMethodResponse):
    details: dict           # decrypted details — only returned on explicit GET
