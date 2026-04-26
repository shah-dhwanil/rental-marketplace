"""Address repository — database access for delivery addresses."""
from typing import Optional
from uuid import UUID

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


def _row_to_dict(row: asyncpg.Record) -> dict:
    return dict(row)


class AddressRepository:
    def __init__(self, db: DatabasePool) -> None:
        self._db = db

    # ── Create ────────────────────────────────────────────────────────────

    async def create_address(self, data: dict, *, conn: Optional[asyncpg.Connection] = None) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_address(_conn, data)
        return await self._create_address(conn, data)

    async def _create_address(self, conn: asyncpg.Connection, data: dict) -> dict:
        row = await conn.fetchrow(
            """
            INSERT INTO addresses (customer_id, name, person_name, contact_no, address, city, pincode, location)
            VALUES ($1, $2, $3, $4, $5, $6, $7,
                    ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography)
            RETURNING id, customer_id, name, person_name, contact_no, address, city, pincode,
                      ST_Y(location::geometry) AS lat,
                      ST_X(location::geometry) AS lng,
                      created_at, updated_at
            """,
            data["customer_id"],
            data["name"],
            data["person_name"],
            data["contact_no"],
            data["address"],
            data["city"],
            data["pincode"],
            data["lng"],
            data["lat"],
        )
        return _row_to_dict(row)

    # ── Read ──────────────────────────────────────────────────────────────

    async def find_by_id(self, address_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_id(_conn, address_id)
        return await self._find_by_id(conn, address_id)

    async def _find_by_id(self, conn: asyncpg.Connection, address_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            """
            SELECT id, customer_id, name, person_name, contact_no, address, city, pincode,
                   ST_Y(location::geometry) AS lat,
                   ST_X(location::geometry) AS lng,
                   created_at, updated_at
            FROM addresses WHERE id = $1 AND is_deleted = FALSE
            """,
            address_id,
        )
        return _row_to_dict(row) if row else None

    async def list_by_customer(self, customer_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> list[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_by_customer(_conn, customer_id)
        return await self._list_by_customer(conn, customer_id)

    async def _list_by_customer(self, conn: asyncpg.Connection, customer_id: UUID) -> list[dict]:
        rows = await conn.fetch(
            """
            SELECT id, customer_id, name, person_name, contact_no, address, city, pincode,
                   ST_Y(location::geometry) AS lat,
                   ST_X(location::geometry) AS lng,
                   created_at, updated_at
            FROM addresses WHERE customer_id = $1 AND is_deleted = FALSE
            ORDER BY created_at DESC
            """,
            customer_id,
        )
        return [_row_to_dict(r) for r in rows]

    # ── Update ─────────────────────────────────────────────────────────────

    async def update_address(
        self,
        address_id: UUID,
        fields: dict,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update_address(_conn, address_id, fields, lat, lng)
        return await self._update_address(conn, address_id, fields, lat, lng)

    async def _update_address(
        self,
        conn: asyncpg.Connection,
        address_id: UUID,
        fields: dict,
        lat: Optional[float],
        lng: Optional[float],
    ) -> Optional[dict]:
        parts: list[str] = []
        params: list = [address_id]
        idx = 2
        for k, v in fields.items():
            parts.append(f"{k} = ${idx}")
            params.append(v)
            idx += 1
        if lat is not None and lng is not None:
            parts.append(f"location = ST_SetSRID(ST_MakePoint(${idx}, ${idx+1}), 4326)::geography")
            params.extend([lng, lat])
            idx += 2
        if not parts:
            return await self._find_by_id(conn, address_id)
        set_clause = ", ".join(parts)
        row = await conn.fetchrow(
            f"""
            UPDATE addresses SET {set_clause}
            WHERE id = $1 AND is_deleted = FALSE
            RETURNING id, customer_id, name, person_name, contact_no, address, city, pincode,
                      ST_Y(location::geometry) AS lat,
                      ST_X(location::geometry) AS lng,
                      created_at, updated_at
            """,
            *params,
        )
        return _row_to_dict(row) if row else None

    # ── Delete ─────────────────────────────────────────────────────────────

    async def soft_delete(self, address_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._soft_delete(_conn, address_id)
        return await self._soft_delete(conn, address_id)

    async def _soft_delete(self, conn: asyncpg.Connection, address_id: UUID) -> None:
        await conn.execute(
            "UPDATE addresses SET is_deleted = TRUE WHERE id = $1", address_id
        )
