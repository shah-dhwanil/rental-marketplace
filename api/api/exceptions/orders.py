"""Domain exceptions for the orders module."""
from api.exceptions.app import AppException, ErrorTypes


class OrderNotFoundException(AppException):
    def __init__(self, order_id: str | None = None) -> None:
        super().__init__(ErrorTypes.ResourceNotFound, "Order not found", resource="order", value=order_id)


class OrderAccessDeniedException(AppException):
    def __init__(self) -> None:
        super().__init__(ErrorTypes.NotEnoughPermission, "You do not have access to this order", resource="order")


class NoDeviceAvailableException(AppException):
    def __init__(self) -> None:
        super().__init__(ErrorTypes.InvalidOperation, "No device is available for the selected rental period", resource="device")


class InvalidOrderDateException(AppException):
    def __init__(self, reason: str) -> None:
        super().__init__(ErrorTypes.InputValidationError, reason, resource="order")


class OrderNotCancellableException(AppException):
    def __init__(self) -> None:
        super().__init__(ErrorTypes.InvalidOperation, "This order cannot be cancelled in its current status", resource="order")


class PaymentVerificationException(AppException):
    def __init__(self, reason: str = "Payment could not be verified") -> None:
        super().__init__(ErrorTypes.ExternalServiceError, reason, resource="payment")


class OrderAlreadyConfirmedException(AppException):
    def __init__(self) -> None:
        super().__init__(ErrorTypes.InvalidOperation, "This order has already been confirmed", resource="order")
