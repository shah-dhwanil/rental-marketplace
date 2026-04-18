"""Domain exceptions for the wishlists module."""
from api.exceptions.app import AppException, ErrorTypes


class WishlistItemNotFoundException(AppException):
    def __init__(self, product_id: str | None = None) -> None:
        super().__init__(ErrorTypes.ResourceNotFound, "Product not in wishlist", resource="wishlist", value=product_id)
