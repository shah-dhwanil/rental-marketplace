"""Response models for wishlists."""
from datetime import datetime
from pydantic import BaseModel


class WishlistItemResponse(BaseModel):
    product_id: str
    added_at: datetime


class WishlistIdsResponse(BaseModel):
    product_ids: list[str]


class WishlistToggleResponse(BaseModel):
    product_id: str
    in_wishlist: bool
