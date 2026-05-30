"""Domain exceptions for the payments module."""
from api.exceptions.app import AppException, ErrorTypes


class PaymentMethodNotFoundException(AppException):
    def __init__(self, pm_id: str | None = None) -> None:
        super().__init__(
            ErrorTypes.ResourceNotFound,
            "Payment method not found",
            resource="payment_method",
            value=pm_id,
        )


class PaymentMethodAccessDeniedException(AppException):
    def __init__(self) -> None:
        super().__init__(
            ErrorTypes.NotEnoughPermission,
            "You do not have access to this payment method",
            resource="payment_method",
        )


class PaymentDecryptionException(AppException):
    def __init__(self) -> None:
        super().__init__(
            ErrorTypes.InternalError,
            "Failed to decrypt payment method details",
            resource="payment_method",
        )
