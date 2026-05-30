"""Payment methods repository — encrypt/decrypt at repo boundary."""
from typing import Optional
from uuid import UUID

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


def _row_to_dict(row: asyncpg.Record) -> dict:
    return dict(row)


class PaymentMethodRepository:
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
            INSERT INTO stored_payment_methods (customer_id, type, display_label, details)
            VALUES ($1, $2, $3, $4)
            RETURNING id, customer_id, type, display_label, details, created_at, updated_at
            """,
            data["customer_id"],
            data["type"],
            data["display_label"],
            data["details"],   # bytes (encrypted)
        )
        return _row_to_dict(row)

    async def find_by_id(self, pm_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_id(_conn, pm_id)
        return await self._find_by_id(conn, pm_id)

    async def _find_by_id(self, conn: asyncpg.Connection, pm_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT id, customer_id, type, display_label, details, created_at, updated_at "
            "FROM stored_payment_methods WHERE id = $1 AND is_deleted = FALSE",
            pm_id,
        )
        return _row_to_dict(row) if row else None

    async def list_by_customer(self, customer_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> list[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_by_customer(_conn, customer_id)
        return await self._list_by_customer(conn, customer_id)

    async def _list_by_customer(self, conn: asyncpg.Connection, customer_id: UUID) -> list[dict]:
        rows = await conn.fetch(
            "SELECT id, customer_id, type, display_label, details, created_at, updated_at "
            "FROM stored_payment_methods WHERE customer_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC",
            customer_id,
        )
        return [_row_to_dict(r) for r in rows]

    async def soft_delete(self, pm_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._soft_delete(_conn, pm_id)
        return await self._soft_delete(conn, pm_id)

    async def _soft_delete(self, conn: asyncpg.Connection, pm_id: UUID) -> None:
        await conn.execute(
            "UPDATE stored_payment_methods SET is_deleted = TRUE WHERE id = $1", pm_id
        )
