"""Category repository — all database access for the categories domain."""

from typing import Optional
from uuid import UUID

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


def _row_to_dict(row: asyncpg.Record) -> dict:
    return dict(row)


class CategoryRepository:
    def __init__(self, db: DatabasePool) -> None:
        self._db = db

    # -----------------------------------------------------------------------
    # Create
    # -----------------------------------------------------------------------

    async def create_category(self, data: dict, *, conn: Optional[asyncpg.Connection] = None) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_category(_conn, data)
        return await self._create_category(conn, data)

    async def _create_category(self, conn: asyncpg.Connection, data: dict) -> dict:
        row = await conn.fetchrow(
            """
            INSERT INTO categories (name, slug, description, parent_category_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            data["name"],
            data["slug"],
            data.get("description", ""),
            data.get("parent_category_id"),
        )
        return _row_to_dict(row)

    # -----------------------------------------------------------------------
    # Read
    # -----------------------------------------------------------------------

    async def find_by_id(self, category_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_id(_conn, category_id)
        return await self._find_by_id(conn, category_id)

    async def _find_by_id(self, conn: asyncpg.Connection, category_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM categories WHERE id = $1 AND is_deleted = FALSE", category_id
        )
        return _row_to_dict(row) if row else None

    async def find_by_name(self, name: str, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_name(_conn, name)
        return await self._find_by_name(conn, name)

    async def _find_by_name(self, conn: asyncpg.Connection, name: str) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM categories WHERE name = $1 AND is_deleted = FALSE", name
        )
        return _row_to_dict(row) if row else None

    async def find_by_slug(self, slug: str, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_slug(_conn, slug)
        return await self._find_by_slug(conn, slug)

    async def _find_by_slug(self, conn: asyncpg.Connection, slug: str) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM categories WHERE slug = $1 AND is_deleted = FALSE", slug
        )
        return _row_to_dict(row) if row else None

    async def list_categories(
        self,
        page: int,
        page_size: int,
        parent_id: Optional[UUID] = None,
        q: Optional[str] = None,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> tuple[list[dict], int]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_categories(_conn, page, page_size, parent_id, q)
        return await self._list_categories(conn, page, page_size, parent_id, q)

    async def _list_categories(
        self,
        conn: asyncpg.Connection,
        page: int,
        page_size: int,
        parent_id: Optional[UUID],
        q: Optional[str],
    ) -> tuple[list[dict], int]:
        conditions = ["is_deleted = FALSE"]
        params: list = []
        idx = 1

        if parent_id is not None:
            conditions.append(f"parent_category_id = ${idx}")
            params.append(parent_id)
            idx += 1
        if q:
            conditions.append(f"name ILIKE ${idx}")
            params.append(f"%{q}%")
            idx += 1

        where = " AND ".join(conditions)
        count_row = await conn.fetchrow(f"SELECT COUNT(*) FROM categories WHERE {where}", *params)
        total = count_row[0]
        offset = (page - 1) * page_size
        rows = await conn.fetch(
            f"SELECT * FROM categories WHERE {where} ORDER BY name ASC LIMIT ${idx} OFFSET ${idx + 1}",
            *params,
            page_size,
            offset,
        )
        return [_row_to_dict(r) for r in rows], total

    async def list_children(self, parent_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> list[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_children(_conn, parent_id)
        return await self._list_children(conn, parent_id)

    async def _list_children(self, conn: asyncpg.Connection, parent_id: UUID) -> list[dict]:
        rows = await conn.fetch(
            "SELECT * FROM categories WHERE parent_category_id = $1 AND is_deleted = FALSE ORDER BY name ASC",
            parent_id,
        )
        return [_row_to_dict(r) for r in rows]

    # -----------------------------------------------------------------------
    # Update
    # -----------------------------------------------------------------------

    async def update_category(
        self,
        category_id: UUID,
        fields: dict,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update_category(_conn, category_id, fields)
        return await self._update_category(conn, category_id, fields)

    async def _update_category(
        self, conn: asyncpg.Connection, category_id: UUID, fields: dict
    ) -> Optional[dict]:
        if not fields:
            return await self._find_by_id(conn, category_id)
        assignments = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(fields))
        values = list(fields.values())
        row = await conn.fetchrow(
            f"UPDATE categories SET {assignments} WHERE id = $1 AND is_deleted = FALSE RETURNING *",
            category_id,
            *values,
        )
        return _row_to_dict(row) if row else None

    async def soft_delete(self, category_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._soft_delete(_conn, category_id)
        return await self._soft_delete(conn, category_id)

    async def _soft_delete(self, conn: asyncpg.Connection, category_id: UUID) -> None:
        await conn.execute(
            "UPDATE categories SET is_deleted = TRUE WHERE id = $1", category_id
        )
