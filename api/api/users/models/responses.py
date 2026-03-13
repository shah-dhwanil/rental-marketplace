"""Response models for the users module."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Tokens
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
