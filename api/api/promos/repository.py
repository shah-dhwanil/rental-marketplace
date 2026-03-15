"""Promo codes repository."""
from typing import Optional
from uuid import UUID

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


def _row_to_dict(row: asyncpg.Record) -> dict:
    return dict(row)


class PromoRepository:
    def __init__(self, db: DatabasePool) -> None:
        self._db = db

    async def create(self, data: dict, *, conn: Optional[asyncpg.Connection] = None) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create(_conn, data)
        return await self._create(conn, data)

    async def _create(self, conn: asyncpg.Connection, data: dict) -> dict:
        row = await conn.fetchrow(
            """
            INSERT INTO promo_codes
                (code, scope, product_id, vendor_id, discount_type, discount_value,
                 min_order_value, max_discount, valid_from, valid_until, max_uses)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *
            """,
            data["code"],
            data["scope"],
            data.get("product_id"),
            data.get("vendor_id"),
            data["discount_type"],
            data["discount_value"],
            data.get("min_order_value"),
            data.get("max_discount"),
            data["valid_from"],
            data["valid_until"],
            data.get("max_uses"),
        )
        return _row_to_dict(row)

    async def find_by_id(self, promo_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_id(_conn, promo_id)
        return await self._find_by_id(conn, promo_id)

    async def _find_by_id(self, conn: asyncpg.Connection, promo_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM promo_codes WHERE id = $1 AND is_deleted = FALSE", promo_id
        )
        return _row_to_dict(row) if row else None

    async def find_by_code(self, code: str, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        """Case-insensitive lookup."""
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_code(_conn, code)
        return await self._find_by_code(conn, code)

    async def _find_by_code(self, conn: asyncpg.Connection, code: str) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM promo_codes WHERE UPPER(code) = UPPER($1) AND is_deleted = FALSE", code
        )
        return _row_to_dict(row) if row else None

    async def list_by_vendor(
        self, vendor_id: UUID, page: int, page_size: int, *, conn: Optional[asyncpg.Connection] = None
    ) -> tuple[list[dict], int]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_by_vendor(_conn, vendor_id, page, page_size)
        return await self._list_by_vendor(conn, vendor_id, page, page_size)

    async def _list_by_vendor(
        self, conn: asyncpg.Connection, vendor_id: UUID, page: int, page_size: int
    ) -> tuple[list[dict], int]:
        # All promos owned by this vendor: scope='vendor' with vendor_id, OR scope='product' where product belongs to vendor
        count_row = await conn.fetchrow(
            """
            SELECT COUNT(*) FROM promo_codes pc
            WHERE pc.is_deleted = FALSE AND (
                (pc.scope = 'vendor' AND pc.vendor_id = $1)
                OR (pc.scope = 'product' AND pc.product_id IN (
                    SELECT id FROM products WHERE vendor_id = $1 AND is_deleted = FALSE
                ))
            )
            """,
            vendor_id,
        )
        total = count_row[0]
        offset = (page - 1) * page_size
        rows = await conn.fetch(
            """
            SELECT pc.* FROM promo_codes pc
            WHERE pc.is_deleted = FALSE AND (
                (pc.scope = 'vendor' AND pc.vendor_id = $1)
                OR (pc.scope = 'product' AND pc.product_id IN (
                    SELECT id FROM products WHERE vendor_id = $1 AND is_deleted = FALSE
                ))
            )
            ORDER BY pc.created_at DESC
            LIMIT $2 OFFSET $3
            """,
            vendor_id,
            page_size,
            offset,
        )
        return [_row_to_dict(r) for r in rows], total

    async def list_platform(
        self, page: int, page_size: int, *, conn: Optional[asyncpg.Connection] = None
    ) -> tuple[list[dict], int]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_platform(_conn, page, page_size)
        return await self._list_platform(conn, page, page_size)

    async def _list_platform(
        self, conn: asyncpg.Connection, page: int, page_size: int
    ) -> tuple[list[dict], int]:
        count_row = await conn.fetchrow(
            "SELECT COUNT(*) FROM promo_codes WHERE is_deleted = FALSE"
        )
        total = count_row[0]
        offset = (page - 1) * page_size
        rows = await conn.fetch(
            "SELECT * FROM promo_codes WHERE is_deleted = FALSE ORDER BY created_at DESC LIMIT $1 OFFSET $2",
            page_size, offset,
        )
        return [_row_to_dict(r) for r in rows], total

    async def update(self, promo_id: UUID, fields: dict, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update(_conn, promo_id, fields)
        return await self._update(conn, promo_id, fields)

    async def _update(self, conn: asyncpg.Connection, promo_id: UUID, fields: dict) -> Optional[dict]:
        if not fields:
            return await self._find_by_id(conn, promo_id)
        assignments = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(fields))
        row = await conn.fetchrow(
            f"UPDATE promo_codes SET {assignments} WHERE id = $1 AND is_deleted = FALSE RETURNING *",
            promo_id, *fields.values(),
        )
        return _row_to_dict(row) if row else None

    async def increment_uses(self, promo_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._increment_uses(_conn, promo_id)
        return await self._increment_uses(conn, promo_id)

    async def _increment_uses(self, conn: asyncpg.Connection, promo_id: UUID) -> None:
        await conn.execute(
            "UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = $1", promo_id
        )

    async def soft_delete(self, promo_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._soft_delete(_conn, promo_id)
        return await self._soft_delete(conn, promo_id)

    async def _soft_delete(self, conn: asyncpg.Connection, promo_id: UUID) -> None:
        await conn.execute("UPDATE promo_codes SET is_deleted = TRUE WHERE id = $1", promo_id)
