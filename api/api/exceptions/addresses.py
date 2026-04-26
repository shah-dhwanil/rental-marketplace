"""Domain exceptions for the addresses module."""
from api.exceptions.app import AppException, ErrorTypes


class AddressNotFoundException(AppException):
    def __init__(self, address_id: str | None = None) -> None:
        super().__init__(
            ErrorTypes.ResourceNotFound,
            "Address not found",
            resource="address",
            value=address_id,
        )


class AddressAccessDeniedException(AppException):
    def __init__(self) -> None:
        super().__init__(
            ErrorTypes.NotEnoughPermission,
            "You do not have access to this address",
            resource="address",
        )
