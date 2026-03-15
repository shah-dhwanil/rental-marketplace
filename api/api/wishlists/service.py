"""Wishlist service."""
from uuid import UUID

import structlog

from api.exceptions.app import AppException, UnkownAppException
from api.wishlists.models.responses import WishlistIdsResponse, WishlistItemResponse, WishlistToggleResponse
from api.wishlists.repository import WishlistRepository

logger = structlog.get_logger(__name__)


class WishlistService:
    def __init__(self, repo: WishlistRepository) -> None:
        self._repo = repo

    async def toggle(self, customer_id: str, product_id: str) -> WishlistToggleResponse:
        try:
            cid = UUID(customer_id)
            pid = UUID(product_id)
            in_wishlist = await self._repo.exists(cid, pid)
            if in_wishlist:
                await self._repo.remove(cid, pid)
                return WishlistToggleResponse(product_id=product_id, in_wishlist=False)
            else:
                await self._repo.add(cid, pid)
                return WishlistToggleResponse(product_id=product_id, in_wishlist=True)
        except AppException:
            raise
        except Exception as exc:
            logger.error("wishlist_toggle_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def get_wishlist_ids(self, customer_id: str) -> WishlistIdsResponse:
        try:
            rows = await self._repo.list_by_customer(UUID(customer_id))
            return WishlistIdsResponse(product_ids=[str(r["product_id"]) for r in rows])
        except AppException:
            raise
        except Exception as exc:
            logger.error("get_wishlist_ids_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def list_wishlist(self, customer_id: str) -> list[WishlistItemResponse]:
        try:
            rows = await self._repo.list_by_customer(UUID(customer_id))
            return [WishlistItemResponse(product_id=str(r["product_id"]), added_at=r["created_at"]) for r in rows]
        except AppException:
            raise
        except Exception as exc:
            logger.error("list_wishlist_failed", exc_info=True)
            raise UnkownAppException() from exc

    async def remove_item(self, customer_id: str, product_id: str) -> None:
        try:
            await self._repo.remove(UUID(customer_id), UUID(product_id))
        except AppException:
            raise
        except Exception as exc:
            logger.error("remove_wishlist_item_failed", exc_info=True)
            raise UnkownAppException() from exc
