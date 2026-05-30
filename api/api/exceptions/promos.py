"""Domain exceptions for the promos module."""
from api.exceptions.app import AppException, ErrorTypes


class PromoNotFoundException(AppException):
    def __init__(self, promo_id: str | None = None) -> None:
        super().__init__(ErrorTypes.ResourceNotFound, "Promo code not found", resource="promo_code", value=promo_id)


class PromoAlreadyExistsException(AppException):
    def __init__(self) -> None:
        super().__init__(ErrorTypes.ResourceAlreadyExists, "A promo code with this code already exists", resource="promo_code", field="code")


class PromoAccessDeniedException(AppException):
    def __init__(self) -> None:
        super().__init__(ErrorTypes.NotEnoughPermission, "You do not have access to this promo code", resource="promo_code")


class PromoInvalidException(AppException):
    def __init__(self, reason: str = "Promo code is invalid or expired") -> None:
        super().__init__(ErrorTypes.InvalidOperation, reason, resource="promo_code")
