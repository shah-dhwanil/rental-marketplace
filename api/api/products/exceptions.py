"""Domain exceptions for the products module."""

from api.exceptions.app import AppException, ErrorTypes


class ProductNotFoundException(AppException):
    def __init__(self, product_id: str | None = None) -> None:
        super().__init__(
            ErrorTypes.ResourceNotFound,
            "Product not found",
            resource="product",
            value=product_id,
        )


class DeviceNotFoundException(AppException):
    def __init__(self, device_id: str | None = None) -> None:
        super().__init__(
            ErrorTypes.ResourceNotFound,
            "Device not found",
            resource="device",
            value=device_id,
        )


class ProductOwnershipException(AppException):
    def __init__(self) -> None:
        super().__init__(
            ErrorTypes.NotEnoughPermission,
            "You do not own this product",
        )


class ProductImageUploadException(AppException):
    def __init__(self, message: str = "Failed to upload product image") -> None:
        super().__init__(ErrorTypes.ExternalServiceError, message)


class ProductImageLimitException(AppException):
    def __init__(self, limit: int = 8) -> None:
        super().__init__(
            ErrorTypes.InvalidOperation,
            f"Product cannot have more than {limit} images",
            resource="product",
        )
