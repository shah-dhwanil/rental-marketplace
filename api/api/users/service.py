"""
User service — orchestrates business logic for the users domain.

All exceptions from the repository and external services are caught here and
wrapped into typed AppException subclasses. No raw exceptions escape this layer.
"""

import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from uuid import UUID

import structlog
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError

from api.cloudinary import CloudinaryClient
from api.jwt import create_access_token, create_refresh_token, create_temp_token, decode_token
from api.models.pagination import PaginatedResponse
from api.settings import get_settings
from api.users.exceptions import (
    CloudinaryUploadException,
    InvalidCredentialsException,
    OTPAlreadyUsedException,
    OTPExpiredException,
    OTPInvalidException,
    UserAlreadyExistsException,
    UserInactiveException,
    UserNotFoundException,
)
from api.users.models.requests import (
    AdminCreateRequest,
    DeliveryPartnerStep2Request,
    DeliveryPartnerStep3Request,
    LoginRequest,
    RegisterStep1Request,
    UpdateProfileRequest,
    VendorStep2Request,
    VendorStep3Request,
)
from api.users.models.responses import (
    AdminProfileResponse,
    AdminUserDetailResponse,
    CustomerProfileResponse,
    DeliveryPartnerProfileResponse,
    OTPResponse,
    TempTokenResponse,
    TokenResponse,
    UserSummaryResponse,
    VendorProfileResponse,
)
from api.users.repository import UserRepository
from api.exceptions.app import AppException, UnkownAppException

logger = structlog.get_logger(__name__)

_ph = PasswordHasher()

_ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5 MB


def _hash_password(plain: str) -> str:
    return _ph.hash(plain)


def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError):
        return False


class UserService:
    def __init__(self, repo: UserRepository, cloudinary: CloudinaryClient) -> None:
        self._repo = repo
        self._cloudinary = cloudinary

    # -----------------------------------------------------------------------
    # Registration
    # -----------------------------------------------------------------------

    async def register_step1(self, data: RegisterStep1Request) -> TempTokenResponse:
        try:
            existing = await self._repo.find_by_email_and_role(data.email_id, data.role)
            if existing:
                raise UserAlreadyExistsException("email_id")

            existing_mobile = await self._repo.find_by_mobile_and_role(data.mobile_no, data.role)
            if existing_mobile:
                raise UserAlreadyExistsException("mobile_no")

            hashed_pw = _hash_password(data.password)

            async with self._repo._db.transaction() as conn:
                user = await self._repo.create_user(
                    {
                        "name": data.name,
                        "email_id": str(data.email_id),
                        "mobile_no": data.mobile_no,
                        "password": hashed_pw,
                        "role": data.role,
                    },
                    conn=conn,
                )
                user_id = user["id"]

                if data.role == "customer":
                    await self._repo.create_customer(user_id, conn=conn)
                elif data.role == "vendor":
                    await self._repo.create_vendor(user_id, conn=conn)
                elif data.role == "delivery_partner":
                    await self._repo.create_delivery_partner(user_id, conn=conn)

            logger.info("user_registered_step1", user_id=str(user_id), role=data.role)
            return TempTokenResponse(temp_token=create_temp_token(str(user_id), data.role))

        except AppException:
            raise
        except Exception as exc:
            logger.error("register_step1_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def complete_customer_registration(self, user_id: str) -> TokenResponse:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            await self._repo.update_user(
                UUID(user_id),
                {"is_profile_complete": True, "is_verified": True},
            )
            logger.info("customer_registration_complete", user_id=user_id)
            return TokenResponse(
                access_token=create_access_token(user_id, "customer"),
                refresh_token=create_refresh_token(user_id, "customer"),
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("complete_customer_reg_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def complete_vendor_step2(
        self, user_id: str, data: VendorStep2Request
    ) -> TempTokenResponse:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            fields: dict = {
                "name": data.name,
                "gst_no": data.gst_no,
                "address": data.address,
                "city": data.city,
                "pincode": data.pincode,
            }
            await self._repo.update_vendor(UUID(user_id), fields, lat=data.lat, lng=data.lng)
            return TempTokenResponse(temp_token=create_temp_token(user_id, "vendor"))
        except AppException:
            raise
        except Exception as exc:
            logger.error("vendor_step2_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def complete_vendor_step3(
        self, user_id: str, data: VendorStep3Request
    ) -> TokenResponse:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            bank_json = json.dumps(data.bank_details.model_dump())
            await self._repo.update_vendor(UUID(user_id), {"bank_details": bank_json})
            await self._repo.update_user(UUID(user_id), {"is_profile_complete": True})
            logger.info("vendor_registration_complete", user_id=user_id)
            return TokenResponse(
                access_token=create_access_token(user_id, "vendor"),
                refresh_token=create_refresh_token(user_id, "vendor"),
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("vendor_step3_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def complete_dp_step2(
        self, user_id: str, data: DeliveryPartnerStep2Request
    ) -> TempTokenResponse:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            fields: dict = {
                "name": data.name,
                "gst_no": data.gst_no,
                "address": data.address,
                "city": data.city,
                "pincode": data.pincode,
            }
            await self._repo.update_delivery_partner(UUID(user_id), fields, lat=data.lat, lng=data.lng)
            return TempTokenResponse(temp_token=create_temp_token(user_id, "delivery_partner"))
        except AppException:
            raise
        except Exception as exc:
            logger.error("dp_step2_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def complete_dp_step3(
        self, user_id: str, data: DeliveryPartnerStep3Request
    ) -> TokenResponse:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            bank_json = json.dumps(data.bank_details.model_dump())
            await self._repo.update_delivery_partner(UUID(user_id), {"bank_details": bank_json})
            await self._repo.update_user(UUID(user_id), {"is_profile_complete": True})
            logger.info("dp_registration_complete", user_id=user_id)
            return TokenResponse(
                access_token=create_access_token(user_id, "delivery_partner"),
                refresh_token=create_refresh_token(user_id, "delivery_partner"),
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("dp_step3_failed", exc_info=True)
            raise UnkownAppException() from exc

    # -----------------------------------------------------------------------
    # Auth
    # -----------------------------------------------------------------------

    async def login(self, data: LoginRequest):
        try:
            user: Optional[dict] = None
            if data.email_id:
                user = await self._repo.find_by_email_and_role(str(data.email_id), data.role)
            elif data.mobile_no:
                user = await self._repo.find_by_mobile_and_role(data.mobile_no, data.role)

            if not user or not _verify_password(data.password, user["password"]):
                raise InvalidCredentialsException()

            if not user["is_active"]:
                raise UserInactiveException("Account is deactivated")
            if not user["is_verified"]:
                raise UserInactiveException("Account is not verified. Please verify your email or mobile.")

            user_id = str(user["id"])

            if not user["is_profile_complete"]:
                # Determine which step the user needs to resume from
                registration_step = 2
                if data.role == "vendor":
                    vendor = await self._repo.find_vendor(UUID(user_id))
                    if vendor and vendor.get("address"):
                        registration_step = 3
                elif data.role == "delivery_partner":
                    dp = await self._repo.find_delivery_partner(UUID(user_id))
                    if dp and dp.get("address"):
                        registration_step = 3
                return TempTokenResponse(
                    temp_token=create_temp_token(user_id, data.role),
                    registration_step=registration_step,
                )

            return TokenResponse(
                access_token=create_access_token(user_id, data.role),
                refresh_token=create_refresh_token(user_id, data.role),
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("login_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def refresh_token(self, refresh_token_str: str) -> dict:
        try:
            payload = decode_token(refresh_token_str)
            if payload.get("type") != "refresh":
                raise InvalidCredentialsException("Invalid token type")
            user_id = payload["sub"]
            role = payload["role"]
            return {
                "access_token": create_access_token(user_id, role),
                "token_type": "Bearer",
            }
        except AppException:
            raise
        except Exception as exc:
            raise InvalidCredentialsException("Invalid or expired refresh token") from exc

    # -----------------------------------------------------------------------
    # OTP
    # -----------------------------------------------------------------------

    async def send_otp(self, user_id: str, otp_type: str) -> OTPResponse:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            otp_plain = f"{secrets.randbelow(1_000_000):06d}"
            otp_hash = _ph.hash(otp_plain)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

            await self._repo.create_otp(UUID(user_id), otp_type, otp_hash, expires_at)

            settings = get_settings()
            otp_value = otp_plain if settings.ENVIRONMENT == "DEV" else None
            return OTPResponse(message="OTP sent successfully", otp=otp_value)
        except AppException:
            raise
        except Exception as exc:
            logger.error("send_otp_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def verify_otp(self, user_id: str, otp_type: str, otp_plain: str) -> None:
        try:
            otp_record = await self._repo.find_latest_otp(UUID(user_id), otp_type)
            if not otp_record:
                raise OTPInvalidException()
            if otp_record["is_used"]:
                raise OTPAlreadyUsedException()

            expires_at = otp_record["expires_at"]
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > expires_at:
                raise OTPExpiredException()

            try:
                _ph.verify(otp_record["otp_hash"], otp_plain)
            except (VerifyMismatchError, VerificationError):
                raise OTPInvalidException()

            await self._repo.mark_otp_used(otp_record["id"])
            await self._repo.update_user(UUID(user_id), {"is_verified": True})
        except AppException:
            raise
        except Exception as exc:
            logger.error("verify_otp_failed", exc_info=True)
            raise UnkownAppException() from exc

    # -----------------------------------------------------------------------
    # Profile
    # -----------------------------------------------------------------------

    async def get_me(
        self, user_id: str, role: str
    ) -> Union[
        CustomerProfileResponse,
        VendorProfileResponse,
        DeliveryPartnerProfileResponse,
        AdminProfileResponse,
    ]:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            base = _user_to_base_dict(user)

            if role == "customer":
                customer = await self._repo.find_customer(UUID(user_id))
                return CustomerProfileResponse(
                    **base,
                    loyalty_points=customer["loyalty_points"] if customer else 0,
                )
            elif role == "vendor":
                vendor = await self._repo.find_vendor(UUID(user_id))
                return VendorProfileResponse(**base, **_vendor_extras(vendor))
            elif role == "delivery_partner":
                dp = await self._repo.find_delivery_partner(UUID(user_id))
                return DeliveryPartnerProfileResponse(**base, **_dp_extras(dp))
            else:
                return AdminProfileResponse(**base)
        except AppException:
            raise
        except Exception as exc:
            logger.error("get_me_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def update_profile(
        self, user_id: str, role: str, data: UpdateProfileRequest
    ) -> None:
        try:
            user_fields: dict = {}
            if data.name is not None:
                user_fields["name"] = data.name

            if user_fields:
                await self._repo.update_user(UUID(user_id), user_fields)

            role_fields: dict = {}
            if data.address is not None:
                role_fields["address"] = data.address
            if data.city is not None:
                role_fields["city"] = data.city
            if data.pincode is not None:
                role_fields["pincode"] = data.pincode

            lat = data.lat if data.lat is not None and data.lng is not None else None
            lng = data.lng if data.lat is not None and data.lng is not None else None

            if role_fields or lat is not None:
                if role == "vendor":
                    await self._repo.update_vendor(UUID(user_id), role_fields, lat=lat, lng=lng)
                elif role == "delivery_partner":
                    await self._repo.update_delivery_partner(UUID(user_id), role_fields, lat=lat, lng=lng)
        except AppException:
            raise
        except Exception as exc:
            logger.error("update_profile_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def upload_profile_photo(
        self, user_id: str, file_bytes: bytes, content_type: str
    ) -> str:
        try:
            if content_type not in _ALLOWED_PHOTO_TYPES:
                from api.users.exceptions import OTPInvalidException as _
                from api.exceptions.app import AppException, ErrorTypes
                raise AppException(
                    ErrorTypes.InputValidationError,
                    f"Unsupported file type: {content_type}. Allowed: jpeg, png, webp",
                    field="file",
                )

            if len(file_bytes) > _MAX_PHOTO_BYTES:
                from api.exceptions.app import AppException, ErrorTypes
                raise AppException(
                    ErrorTypes.InputValidationError,
                    "File too large. Maximum size is 5 MB",
                    field="file",
                )

            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            # Delete old photo if exists
            if user.get("profile_photo_id"):
                try:
                    self._cloudinary.delete_image(user["profile_photo_id"])
                except Exception:
                    logger.warning("failed_to_delete_old_photo", user_id=user_id)

            try:
                result = self._cloudinary.upload_image(
                    file_bytes,
                    folder=f"users/{user_id}/profile",
                )
            except Exception as exc:
                raise CloudinaryUploadException() from exc

            await self._repo.update_user(
                UUID(user_id),
                {
                    "profile_photo_url": result.secure_url,
                    "profile_photo_id": result.public_id,
                },
            )
            return result.secure_url
        except AppException:
            raise
        except Exception as exc:
            logger.error("upload_photo_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def delete_profile_photo(self, user_id: str) -> None:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            if not user.get("profile_photo_id"):
                from api.exceptions.app import AppException, ErrorTypes
                raise AppException(
                    ErrorTypes.InvalidOperation,
                    "No profile photo to delete",
                    resource="user",
                )

            try:
                self._cloudinary.delete_image(user["profile_photo_id"])
            except Exception as exc:
                raise CloudinaryUploadException("Failed to delete media") from exc

            await self._repo.update_user(
                UUID(user_id),
                {"profile_photo_url": None, "profile_photo_id": None},
            )
        except AppException:
            raise
        except Exception as exc:
            logger.error("delete_photo_failed", exc_info=True)
            raise UnkownAppException() from exc

    # -----------------------------------------------------------------------
    # Admin
    # -----------------------------------------------------------------------

    async def admin_create(
        self, data: AdminCreateRequest, actor_id: str
    ) -> AdminUserDetailResponse:
        try:
            existing = await self._repo.find_by_email_and_role(str(data.email_id), "admin")
            if existing:
                raise UserAlreadyExistsException("email_id")

            hashed_pw = _hash_password(data.password)
            user = await self._repo.create_user(
                {
                    "name": data.name,
                    "email_id": str(data.email_id),
                    "mobile_no": data.mobile_no,
                    "password": hashed_pw,
                    "role": "admin",
                },
            )
            # Mark admin as fully registered immediately
            await self._repo.update_user(
                user["id"],
                {"is_profile_complete": True, "is_verified": True},
            )
            user["is_profile_complete"] = True
            user["is_verified"] = True
            logger.info("admin_created", new_user_id=str(user["id"]), actor_id=actor_id)
            return AdminUserDetailResponse(**_user_to_base_dict(user))
        except AppException:
            raise
        except Exception as exc:
            logger.error("admin_create_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def admin_list_users(
        self,
        page: int,
        page_size: int,
        role: Optional[str] = None,
        is_verified: Optional[bool] = None,
        q: Optional[str] = None,
    ) -> PaginatedResponse[UserSummaryResponse]:
        try:
            rows, total = await self._repo.list_users(
                page, page_size, role, is_verified, q
            )
            items = [
                UserSummaryResponse(
                    id=str(r["id"]),
                    name=r["name"],
                    email_id=r["email_id"],
                    role=r["role"],
                    is_verified=r["is_verified"],
                    is_active=r["is_active"],
                    is_profile_complete=r["is_profile_complete"],
                    created_at=r["created_at"],
                )
                for r in rows
            ]
            return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)
        except AppException:
            raise
        except Exception as exc:
            logger.error("admin_list_users_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def admin_get_user(self, user_id: str) -> AdminUserDetailResponse:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            base = _user_to_base_dict(user)
            role = user["role"]

            if role == "customer":
                customer = await self._repo.find_customer(UUID(user_id))
                return AdminUserDetailResponse(
                    **base, loyalty_points=customer["loyalty_points"] if customer else 0
                )
            elif role == "vendor":
                vendor = await self._repo.find_vendor(UUID(user_id))
                extras = _vendor_extras(vendor)
                return AdminUserDetailResponse(
                    **base,
                    vendor_name=extras.get("vendor_name"),
                    gst_no=extras.get("gst_no"),
                    address=extras.get("address"),
                    city=extras.get("city"),
                    pincode=extras.get("pincode"),
                    lat=extras.get("lat"),
                    lng=extras.get("lng"),
                    bank_details=vendor.get("bank_details") if vendor else None,
                    is_business_verified=vendor.get("is_verified", False) if vendor else False,
                )
            elif role == "delivery_partner":
                dp = await self._repo.find_delivery_partner(UUID(user_id))
                extras = _dp_extras(dp)
                return AdminUserDetailResponse(
                    **base,
                    dp_name=extras.get("dp_name"),
                    gst_no=extras.get("gst_no"),
                    address=extras.get("address"),
                    city=extras.get("city"),
                    pincode=extras.get("pincode"),
                    lat=extras.get("lat"),
                    lng=extras.get("lng"),
                    bank_details=dp.get("bank_details") if dp else None,
                    is_business_verified=dp.get("is_verified", False) if dp else False,
                )
            else:
                return AdminUserDetailResponse(**base)
        except AppException:
            raise
        except Exception as exc:
            logger.error("admin_get_user_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def admin_verify_user(self, user_id: str) -> None:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            role = user["role"]
            if role == "vendor":
                await self._repo.update_vendor(UUID(user_id), {"is_verified": True})
            elif role == "delivery_partner":
                await self._repo.update_delivery_partner(UUID(user_id), {"is_verified": True})
            else:
                from api.exceptions.app import AppException, ErrorTypes
                raise AppException(
                    ErrorTypes.InvalidOperation,
                    f"Users with role '{role}' do not have a verification step",
                )
            logger.info("user_verified_by_admin", user_id=user_id)
        except AppException:
            raise
        except Exception as exc:
            logger.error("admin_verify_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def admin_set_status(
        self, user_id: str, is_active: bool, actor_id: str
    ) -> None:
        try:
            if user_id == actor_id and not is_active:
                from api.exceptions.app import AppException, ErrorTypes
                raise AppException(
                    ErrorTypes.InvalidOperation,
                    "You cannot deactivate your own account",
                )
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            await self._repo.update_user(UUID(user_id), {"is_active": is_active})
            logger.info("user_status_changed", user_id=user_id, is_active=is_active, actor_id=actor_id)
        except AppException:
            raise
        except Exception as exc:
            logger.error("admin_set_status_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def admin_delete_user(self, user_id: str, actor_id: str) -> None:
        try:
            user = await self._repo.find_by_id(UUID(user_id))
            if not user:
                raise UserNotFoundException(user_id)

            await self._repo.soft_delete_user(UUID(user_id))
            logger.info("user_soft_deleted", user_id=user_id, actor_id=actor_id)
        except AppException:
            raise
        except Exception as exc:
            logger.error("admin_delete_failed", exc_info=True)
            raise UnkownAppException() from exc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_to_base_dict(user: dict) -> dict:
    return {
        "id": str(user["id"]),
        "name": user["name"],
        "email_id": user["email_id"],
        "mobile_no": user["mobile_no"],
        "role": user["role"],
        "profile_photo_url": user.get("profile_photo_url"),
        "is_verified": user["is_verified"],
        "is_active": user["is_active"],
        "is_profile_complete": user["is_profile_complete"],
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
    }


def _vendor_extras(vendor: Optional[dict]) -> dict:
    if not vendor:
        return {"is_business_verified": False}
    return {
        "vendor_name": vendor.get("name"),
        "gst_no": vendor.get("gst_no"),
        "address": vendor.get("address"),
        "city": vendor.get("city"),
        "pincode": vendor.get("pincode"),
        "lat": vendor.get("lat"),
        "lng": vendor.get("lng"),
        "is_business_verified": vendor.get("is_verified", False),
    }


def _dp_extras(dp: Optional[dict]) -> dict:
    if not dp:
        return {"is_business_verified": False}
    return {
        "dp_name": dp.get("name"),
        "gst_no": dp.get("gst_no"),
        "address": dp.get("address"),
        "city": dp.get("city"),
        "pincode": dp.get("pincode"),
        "lat": dp.get("lat"),
        "lng": dp.get("lng"),
        "is_business_verified": dp.get("is_verified", False),
    }
