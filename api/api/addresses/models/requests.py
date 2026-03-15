"""Request models for the addresses module."""
from typing import Optional
from pydantic import BaseModel, field_validator


class CreateAddressRequest(BaseModel):
    name: str                   # "Home", "Office" etc.
    person_name: str
    contact_no: str
    address: str
    city: str
    pincode: str
    lat: float
    lng: float

    @field_validator("pincode")
    @classmethod
    def pincode_digits(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("Pincode must be exactly 6 digits")
        return v

    @field_validator("contact_no")
    @classmethod
    def contact_digits(cls, v: str) -> str:
        v = v.strip()
        if not v.replace("+", "").isdigit():
            raise ValueError("Invalid contact number")
        return v

    @field_validator("name", "person_name", "address", "city")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be blank")
        return v


class UpdateAddressRequest(BaseModel):
    name: Optional[str] = None
    person_name: Optional[str] = None
    contact_no: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

    @field_validator("pincode")
    @classmethod
    def pincode_digits(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v.isdigit() or len(v) != 6:
                raise ValueError("Pincode must be exactly 6 digits")
        return v
