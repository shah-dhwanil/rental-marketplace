"""Models for the users module (requests + responses consolidated)."""

from datetime import datetime
from typing import Any, Annotated, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Shared sub-schemas
# ---------------------------------------------------------------------------

class BankDetailsSchema(BaseModel):
    account_number: str = Field(min_length=6, max_length=20)
    ifsc_code: str = Field(pattern=r"^[A-Z]{4}0[A-Z0-9]{6}$")
    account_holder_name: str = Field(min_length=2, max_length=100)
    bank_name: str = Field(min_length=2, max_length=100)


# ---------------------------------------------------------------------------
# Registration Requests
# ---------------------------------------------------------------------------

class RegisterStep1Request(BaseModel):
    name: str = Field(min_length=2, max_length=32)
    email_id: EmailStr
    mobile_no: str = Field(pattern=r"^\+?[0-9]{10,15}$")
    password: str = Field(min_length=8, max_length=64)
    role: Literal["customer", "vendor", "delivery_partner"]


class VendorStep2Request(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    gst_no: str = Field(pattern=r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
    address: str = Field(min_length=5, max_length=500)
    city: str = Field(min_length=2, max_length=64)
    pincode: str = Field(pattern=r"^[0-9]{6}$")
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class VendorStep3Request(BaseModel):
    bank_details: BankDetailsSchema


class DeliveryPartnerStep2Request(BaseModel):
    name: str = Field(min_length=2, max_length=32)
    gst_no: str = Field(pattern=r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
    address: str = Field(min_length=5, max_length=500)
    city: str = Field(min_length=2, max_length=64)
    pincode: str = Field(pattern=r"^[0-9]{6}$")
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class DeliveryPartnerStep3Request(BaseModel):
    bank_details: BankDetailsSchema


# ---------------------------------------------------------------------------
# Auth Requests
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    """Login by email or mobile. Provide exactly one of email_id or mobile_no."""
    email_id: Optional[EmailStr] = None
    mobile_no: Optional[str] = Field(default=None, pattern=r"^\+?[0-9]{10,15}$")
    role: Literal["customer", "vendor", "delivery_partner", "admin"]
    password: str

    @field_validator("email_id", "mobile_no", mode="before")
    @classmethod
    def at_least_one_identifier(cls, v):
        return v

    def model_post_init(self, __context) -> None:
        if not self.email_id and not self.mobile_no:
            raise ValueError("Provide either email_id or mobile_no")


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# OTP Requests
# ---------------------------------------------------------------------------

class SendOTPRequest(BaseModel):
    otp_type: Literal["email", "mobile"]


class VerifyOTPRequest(BaseModel):
    otp_type: Literal["email", "mobile"]
    otp: str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")


# ---------------------------------------------------------------------------
# Profile Requests
# ---------------------------------------------------------------------------

class UpdateProfileRequest(BaseModel):
    """Fields are all optional — only provided fields are updated."""
    name: Optional[str] = Field(default=None, min_length=2, max_length=32)
    # Vendor / delivery-partner editable fields
    address: Optional[str] = Field(default=None, min_length=5, max_length=500)
    city: Optional[str] = Field(default=None, min_length=2, max_length=64)
    pincode: Optional[str] = Field(default=None, pattern=r"^[0-9]{6}$")
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)


# ---------------------------------------------------------------------------
# Admin Requests
# ---------------------------------------------------------------------------

class AdminCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=32)
    email_id: EmailStr
    mobile_no: str = Field(pattern=r"^\+?[0-9]{10,15}$")
    password: str = Field(min_length=8, max_length=64)


class UserStatusRequest(BaseModel):
    is_active: bool


# ---------------------------------------------------------------------------
# Tokens (Responses)
# ---------------------------------------------------------------------------

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"


class TempTokenResponse(BaseModel):
    temp_token: str
    token_type: str = "Bearer"
    registration_step: Optional[int] = None


# ---------------------------------------------------------------------------
# Base user fields (shared across all role responses)
# ---------------------------------------------------------------------------

class BaseUserResponse(BaseModel):
    id: str
    name: str
    email_id: str
    mobile_no: str
    role: str
    profile_photo_url: Optional[str] = None
    is_verified: bool
    is_active: bool
    is_profile_complete: bool
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Role-specific profile responses
# ---------------------------------------------------------------------------

class CustomerProfileResponse(BaseUserResponse):
    loyalty_points: int


class VendorProfileResponse(BaseUserResponse):
    vendor_name: Optional[str] = None
    gst_no: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_business_verified: bool = False


class DeliveryPartnerProfileResponse(BaseUserResponse):
    dp_name: Optional[str] = None
    gst_no: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_business_verified: bool = False


class AdminProfileResponse(BaseUserResponse):
    pass


# ---------------------------------------------------------------------------
# Admin-only detail (includes bank_details)
# ---------------------------------------------------------------------------

class AdminUserDetailResponse(BaseUserResponse):
    # Role-specific extras
    loyalty_points: Optional[int] = None
    vendor_name: Optional[str] = None
    dp_name: Optional[str] = None
    gst_no: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    bank_details: Optional[Any] = None
    is_business_verified: Optional[bool] = None


# ---------------------------------------------------------------------------
# Paginated list
# ---------------------------------------------------------------------------

class UserSummaryResponse(BaseModel):
    id: str
    name: str
    email_id: str
    role: str
    is_verified: bool
    is_active: bool
    is_profile_complete: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Auth identity
# ---------------------------------------------------------------------------

class MeIdentityResponse(BaseModel):
    user_id: str
    role: str
    name: str
    email_id: str
    is_profile_complete: bool


# ---------------------------------------------------------------------------
# OTP
# ---------------------------------------------------------------------------

class OTPResponse(BaseModel):
    message: str
    otp: Optional[str] = None  # Populated in DEV environment only


# ---------------------------------------------------------------------------
# Public vendor profile (no auth required)
# ---------------------------------------------------------------------------

class VendorPublicProfileResponse(BaseModel):
    id: str
    name: str                          # owner's full name
    vendor_name: Optional[str] = None  # business/shop name
    mobile_no: str
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    profile_photo_url: Optional[str] = None
