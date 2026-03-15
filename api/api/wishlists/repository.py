"""Wishlist repository."""
from typing import Optional
from uuid import UUID

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


class WishlistRepository:
    def __init__(self, db: DatabasePool) -> None:
        self._db = db

    async def add(self, customer_id: UUID, product_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._add(_conn, customer_id, product_id)
        return await self._add(conn, customer_id, product_id)

    async def _add(self, conn: asyncpg.Connection, customer_id: UUID, product_id: UUID) -> dict:
        row = await conn.fetchrow(
            """
            INSERT INTO wishlists (customer_id, product_id)
            VALUES ($1, $2)
            ON CONFLICT (customer_id, product_id) DO NOTHING
            RETURNING product_id, created_at
            """,
            customer_id,
            product_id,
        )
        if row is None:
            # Already exists — fetch it
            row = await conn.fetchrow(
                "SELECT product_id, created_at FROM wishlists WHERE customer_id=$1 AND product_id=$2",
                customer_id, product_id,
            )
        return dict(row)

    async def remove(self, customer_id: UUID, product_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> bool:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._remove(_conn, customer_id, product_id)
        return await self._remove(conn, customer_id, product_id)

    async def _remove(self, conn: asyncpg.Connection, customer_id: UUID, product_id: UUID) -> bool:
        result = await conn.execute(
            "DELETE FROM wishlists WHERE customer_id=$1 AND product_id=$2",
            customer_id, product_id,
        )
        return result.endswith("1")

    async def exists(self, customer_id: UUID, product_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> bool:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._exists(_conn, customer_id, product_id)
        return await self._exists(conn, customer_id, product_id)

    async def _exists(self, conn: asyncpg.Connection, customer_id: UUID, product_id: UUID) -> bool:
        row = await conn.fetchrow(
            "SELECT 1 FROM wishlists WHERE customer_id=$1 AND product_id=$2",
            customer_id, product_id,
        )
        return row is not None

    async def list_by_customer(self, customer_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> list[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_by_customer(_conn, customer_id)
        return await self._list_by_customer(conn, customer_id)

    async def _list_by_customer(self, conn: asyncpg.Connection, customer_id: UUID) -> list[dict]:
        rows = await conn.fetch(
            "SELECT product_id, created_at FROM wishlists WHERE customer_id=$1 ORDER BY created_at DESC",
            customer_id,
        )
        return [dict(r) for r in rows]

    async def clear(self, customer_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._clear(_conn, customer_id)
        return await self._clear(conn, customer_id)

    async def _clear(self, conn: asyncpg.Connection, customer_id: UUID) -> None:
        await conn.execute("DELETE FROM wishlists WHERE customer_id=$1", customer_id)
