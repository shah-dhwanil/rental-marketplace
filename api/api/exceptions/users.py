"""
Domain-specific exceptions for the users module.

All exceptions subclass AppException so the existing exception handlers
convert them to the correct HTTP responses automatically.
"""

from api.exceptions.app import AppException, ErrorTypes


class UserNotFoundException(AppException):
    def __init__(self, user_id: str | None = None) -> None:
        super().__init__(
            ErrorTypes.ResourceNotFound,
            "User not found",
            resource="user",
            value=user_id,
        )


class UserAlreadyExistsException(AppException):
    def __init__(self, field: str = "email_id") -> None:
        super().__init__(
            ErrorTypes.ResourceAlreadyExists,
            "A user with this email or mobile already exists for the given role",
            resource="user",
            field=field,
        )


class InvalidCredentialsException(AppException):
    def __init__(self, message: str = "Invalid credentials") -> None:
        super().__init__(ErrorTypes.UnauthorizedOperation, message)


class OTPExpiredException(AppException):
    def __init__(self) -> None:
        super().__init__(ErrorTypes.InvalidOperation, "OTP has expired")


class OTPInvalidException(AppException):
    def __init__(self) -> None:
        super().__init__(ErrorTypes.InputValidationError, "Invalid OTP", field="otp")


class OTPAlreadyUsedException(AppException):
    def __init__(self) -> None:
        super().__init__(ErrorTypes.InvalidOperation, "OTP has already been used")


class RegistrationIncompleteException(AppException):
    def __init__(self, message: str = "Registration is incomplete") -> None:
        super().__init__(ErrorTypes.InvalidOperation, message, resource="user")


class InsufficientPermissionException(AppException):
    def __init__(self, message: str = "Insufficient permissions") -> None:
        super().__init__(ErrorTypes.NotEnoughPermission, message)


class CloudinaryUploadException(AppException):
    def __init__(self, message: str = "Failed to upload media") -> None:
        super().__init__(ErrorTypes.ExternalServiceError, message)


class UserInactiveException(AppException):
    def __init__(self, message: str = "User account is inactive or not verified") -> None:
        super().__init__(ErrorTypes.UnauthorizedOperation, message)
