"""
Users router — all HTTP endpoints for the users domain.
"""

from typing import Optional, Union

from fastapi import APIRouter, File, Query, UploadFile, status

from api.models.pagination import PaginatedResponse
from api.users.dependencies import AdminDep, CurrentUserDep, TempTokenDep, UserServiceDep
from api.users.exceptions import InsufficientPermissionException
from api.users.models.requests import (
    AdminCreateRequest,
    DeliveryPartnerStep2Request,
    DeliveryPartnerStep3Request,
    LoginRequest,
    RefreshRequest,
    RegisterStep1Request,
    SendOTPRequest,
    UpdateProfileRequest,
    UserStatusRequest,
    VerifyOTPRequest,
    VendorStep2Request,
    VendorStep3Request,
)
from api.users.models.responses import (
    AdminUserDetailResponse,
    MeIdentityResponse,
    OTPResponse,
    TempTokenResponse,
    TokenResponse,
    UserSummaryResponse,
)

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=TempTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Step 1 — Create account",
)
async def register_step1(body: RegisterStep1Request, service: UserServiceDep):
    return await service.register_step1(body)


@router.post(
    "/register/customer/complete",
    response_model=TokenResponse,
    summary="Customer — Complete registration",
)
async def complete_customer(claims: TempTokenDep, service: UserServiceDep):
    if claims.role != "customer":
        raise InsufficientPermissionException("This endpoint is for customers only")
    return await service.complete_customer_registration(claims.user_id)


@router.post(
    "/register/vendor/complete",
    response_model=TempTokenResponse,
    summary="Vendor — Step 2: business info",
)
async def vendor_step2(
    body: VendorStep2Request, claims: TempTokenDep, service: UserServiceDep
):
    if claims.role != "vendor":
        raise InsufficientPermissionException("This endpoint is for vendors only")
    return await service.complete_vendor_step2(claims.user_id, body)


@router.post(
    "/register/vendor/bank",
    response_model=TokenResponse,
    summary="Vendor — Step 3: bank details",
)
async def vendor_step3(
    body: VendorStep3Request, claims: TempTokenDep, service: UserServiceDep
):
    if claims.role != "vendor":
        raise InsufficientPermissionException("This endpoint is for vendors only")
    return await service.complete_vendor_step3(claims.user_id, body)


@router.post(
    "/register/delivery-partner/complete",
    response_model=TempTokenResponse,
    summary="Delivery Partner — Step 2: personal info",
)
async def dp_step2(
    body: DeliveryPartnerStep2Request, claims: TempTokenDep, service: UserServiceDep
):
    if claims.role != "delivery_partner":
        raise InsufficientPermissionException("This endpoint is for delivery partners only")
    return await service.complete_dp_step2(claims.user_id, body)


@router.post(
    "/register/delivery-partner/bank",
    response_model=TokenResponse,
    summary="Delivery Partner — Step 3: bank details",
)
async def dp_step3(
    body: DeliveryPartnerStep3Request, claims: TempTokenDep, service: UserServiceDep
):
    if claims.role != "delivery_partner":
        raise InsufficientPermissionException("This endpoint is for delivery partners only")
    return await service.complete_dp_step3(claims.user_id, body)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@router.post("/auth/login", response_model=Union[TokenResponse, TempTokenResponse], summary="Login")
async def login(body: LoginRequest, service: UserServiceDep):
    return await service.login(body)


@router.post("/auth/refresh", summary="Refresh access token")
async def refresh(body: RefreshRequest, service: UserServiceDep):
    return await service.refresh_token(body.refresh_token)


@router.get("/auth/me", response_model=MeIdentityResponse, summary="Current user identity")
async def auth_me(claims: CurrentUserDep, service: UserServiceDep):
    profile = await service.get_me(claims.user_id, claims.role)
    return MeIdentityResponse(
        user_id=claims.user_id,
        role=claims.role,
        name=profile.name,
        email_id=profile.email_id,
        is_profile_complete=profile.is_profile_complete,
    )


# ---------------------------------------------------------------------------
# OTP
# ---------------------------------------------------------------------------

@router.post("/otp/send", response_model=OTPResponse, summary="Send OTP")
async def send_otp(body: SendOTPRequest, claims: CurrentUserDep, service: UserServiceDep):
    return await service.send_otp(claims.user_id, body.otp_type)


@router.post("/otp/verify", status_code=status.HTTP_200_OK, summary="Verify OTP")
async def verify_otp(body: VerifyOTPRequest, claims: CurrentUserDep, service: UserServiceDep):
    await service.verify_otp(claims.user_id, body.otp_type, body.otp)
    return {"message": "OTP verified successfully"}


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@router.get("/me", summary="Get own profile")
async def get_me(claims: CurrentUserDep, service: UserServiceDep):
    return await service.get_me(claims.user_id, claims.role)


@router.patch("/me", status_code=status.HTTP_200_OK, summary="Update own profile")
async def update_me(
    body: UpdateProfileRequest, claims: CurrentUserDep, service: UserServiceDep
):
    await service.update_profile(claims.user_id, claims.role, body)
    return await service.get_me(claims.user_id, claims.role)


@router.post("/me/photo", summary="Upload profile photo")
async def upload_photo(
    claims: CurrentUserDep,
    service: UserServiceDep,
    file: UploadFile = File(...),
):
    file_bytes = await file.read()
    url = await service.upload_profile_photo(claims.user_id, file_bytes, file.content_type or "")
    return {"profile_photo_url": url}


@router.delete("/me/photo", status_code=status.HTTP_204_NO_CONTENT, summary="Delete profile photo")
async def delete_photo(claims: CurrentUserDep, service: UserServiceDep):
    await service.delete_profile_photo(claims.user_id)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

@router.post(
    "/admin/create",
    response_model=AdminUserDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admin — Create admin account",
)
async def admin_create(
    body: AdminCreateRequest, claims: AdminDep, service: UserServiceDep
):
    return await service.admin_create(body, claims.user_id)


@router.get(
    "/admin/users",
    response_model=PaginatedResponse[UserSummaryResponse],
    summary="Admin — List users",
)
async def admin_list_users(
    claims: AdminDep,
    service: UserServiceDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    role: Optional[str] = Query(default=None),
    is_verified: Optional[bool] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=100),
):
    return await service.admin_list_users(page, page_size, role, is_verified, q)


@router.get(
    "/admin/users/{user_id}",
    response_model=AdminUserDetailResponse,
    summary="Admin — Get user detail",
)
async def admin_get_user(user_id: str, claims: AdminDep, service: UserServiceDep):
    return await service.admin_get_user(user_id)


@router.patch(
    "/admin/users/{user_id}/verify",
    status_code=status.HTTP_200_OK,
    summary="Admin — Verify vendor or delivery partner",
)
async def admin_verify(user_id: str, claims: AdminDep, service: UserServiceDep):
    await service.admin_verify_user(user_id)
    return {"message": "User verified successfully"}


@router.patch(
    "/admin/users/{user_id}/status",
    status_code=status.HTTP_200_OK,
    summary="Admin — Activate or deactivate user",
)
async def admin_set_status(
    user_id: str, body: UserStatusRequest, claims: AdminDep, service: UserServiceDep
):
    await service.admin_set_status(user_id, body.is_active, claims.user_id)
    return {"message": f"User {'activated' if body.is_active else 'deactivated'} successfully"}


@router.delete(
    "/admin/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin — Soft-delete user",
)
async def admin_delete(user_id: str, claims: AdminDep, service: UserServiceDep):
    await service.admin_delete_user(user_id, claims.user_id)
