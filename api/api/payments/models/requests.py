"""Request models for stored payment methods."""
from typing import Literal, Optional
from pydantic import BaseModel, field_validator, model_validator


PaymentType = Literal["card", "upi", "net_banking", "wallet"]


class CardDetails(BaseModel):
    last4: str
    expiry_month: int
    expiry_year: int
    holder_name: str
    network: Optional[str] = None  # "Visa", "Mastercard", etc.

    @field_validator("last4")
    @classmethod
    def last4_digits(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 4:
            raise ValueError("last4 must be exactly 4 digits")
        return v


class UPIDetails(BaseModel):
    upi_id: str

    @field_validator("upi_id")
    @classmethod
    def valid_upi(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Invalid UPI ID format")
        return v.lower().strip()


class NetBankingDetails(BaseModel):
    bank_name: str
    account_last4: Optional[str] = None


class WalletDetails(BaseModel):
    wallet_name: str
    linked_mobile: Optional[str] = None


class AddPaymentMethodRequest(BaseModel):
    type: PaymentType
    details: dict   # Validated based on type in model_validator

    @model_validator(mode="after")
    def validate_details(self) -> "AddPaymentMethodRequest":
        t = self.type
        d = self.details
        if t == "card":
            CardDetails.model_validate(d)
        elif t == "upi":
            UPIDetails.model_validate(d)
        elif t == "net_banking":
            NetBankingDetails.model_validate(d)
        elif t == "wallet":
            WalletDetails.model_validate(d)
        return self
