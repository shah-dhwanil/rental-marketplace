"""Product and Device repository — all database access for the products domain."""

import json
from datetime import date
from typing import Optional
from uuid import UUID

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


def _row_to_dict(row: asyncpg.Record) -> dict:
    return dict(row)


class ProductRepository:
    def __init__(self, db: DatabasePool) -> None:
        self._db = db

    # -----------------------------------------------------------------------
    # Products — create
    # -----------------------------------------------------------------------

    async def create_product(self, data: dict, *, conn: Optional[asyncpg.Connection] = None) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_product(_conn, data)
        return await self._create_product(conn, data)

    async def _create_product(self, conn: asyncpg.Connection, data: dict) -> dict:
        row = await conn.fetchrow(
            """
            INSERT INTO products
                (name, description, properties, category_id, vendor_id,
                 price_day, price_week, price_month, security_deposit, defect_charge, is_active, embedding)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            """,
            data["name"],
            data.get("description", ""),
            json.dumps(data.get("properties", {})),
            data["category_id"],
            data["vendor_id"],
            data["price_day"],
            data["price_week"],
            data["price_month"],
            data.get("security_deposit", 0),
            data.get("defect_charge", 0),
            data.get("is_active", True),
            data.get("embedding"),
        )
        return _row_to_dict(row)

    # -----------------------------------------------------------------------
    # Products — read
    # -----------------------------------------------------------------------

    async def find_by_id(self, product_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_id(_conn, product_id)
        return await self._find_by_id(conn, product_id)

    async def _find_by_id(self, conn: asyncpg.Connection, product_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM products WHERE id = $1 AND is_deleted = FALSE", product_id
        )
        return _row_to_dict(row) if row else None

    async def list_products(
        self,
        page: int,
        page_size: int,
        vendor_id: Optional[UUID] = None,
        category_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
        q: Optional[str] = None,
        query_embedding: Optional[list[float]] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius_km: Optional[float] = None,
        fts_weight: float = 0.4,
        vector_weight: float = 0.6,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> tuple[list[dict], int]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_products(
                    _conn, page, page_size, vendor_id, category_id, is_active, q, query_embedding,
                    start_date, end_date, lat, lng, radius_km, fts_weight, vector_weight,
                )
        return await self._list_products(
            conn, page, page_size, vendor_id, category_id, is_active, q, query_embedding,
            start_date, end_date, lat, lng, radius_km, fts_weight, vector_weight,
        )

    async def _list_products(
        self,
        conn: asyncpg.Connection,
        page: int,
        page_size: int,
        vendor_id: Optional[UUID],
        category_id: Optional[UUID],
        is_active: Optional[bool],
        q: Optional[str],
        query_embedding: Optional[list[float]],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius_km: Optional[float] = None,
        fts_weight: float = 0.4,
        vector_weight: float = 0.6,
    ) -> tuple[list[dict], int]:
        conditions = ["p.is_deleted = FALSE"]
        params: list = []
        idx = 1

        # Determine if we're using hybrid search
        use_hybrid_search = q and query_embedding

        if vendor_id is not None:
            conditions.append(f"p.vendor_id = ${idx}")
            params.append(vendor_id)
            idx += 1
        if category_id is not None:
            conditions.append(f"p.category_id = ${idx}")
            params.append(category_id)
            idx += 1
        if is_active is not None:
            conditions.append(f"p.is_active = ${idx}")
            params.append(is_active)
            idx += 1

        # Build search condition and ordering
        order_clause = "p.created_at DESC"

        if use_hybrid_search:
            # Hybrid search: combine FTS and vector similarity
            # ts_rank returns a score, cosine distance returns 0-2 (we convert to similarity: 1 - distance)
            # Normalize both scores to 0-1 range and apply weights

            # Add full-text search condition (optional - we can include all and rank by score)
            # conditions.append(f"p.search_vector @@ plainto_tsquery('english', ${idx})")
            # idx += 1

            # We'll compute hybrid score in SELECT and order by it
            # Note: vector cosine distance in pgvector returns 0 (most similar) to 2 (least similar)
            # We convert to similarity: 1 - (distance / 2) to get 0-1 range
            pass  # Will be handled in SELECT

        elif q:
            # Fallback to simple ILIKE if no embedding provided
            conditions.append(f"p.name ILIKE ${idx}")
            params.append(f"%{q}%")
            idx += 1

        # Availability filter: product must have at least one active, unbooked device
        if start_date is not None and end_date is not None:
            conditions.append(
                f"""EXISTS (
                    SELECT 1 FROM devices d
                    WHERE d.product_id = p.id
                      AND d.is_deleted = FALSE
                      AND d.is_active = TRUE
                      AND NOT EXISTS (
                          SELECT 1 FROM orders o
                          WHERE o.device_id = d.id
                            AND o.status IN ('confirmed', 'active')
                            AND o.start_date <= ${idx + 1}
                            AND o.end_date >= ${idx}
                      )
                )"""
            )
            params.append(start_date)   # ${idx}   — rental start
            params.append(end_date)     # ${idx+1} — rental end
            idx += 2

        # Geo filter: vendor must be within radius_km of (lat, lng)
        if lat is not None and lng is not None:
            radius_m = (radius_km or 20.0) * 1000
            conditions.append(
                f"""p.vendor_id IN (
                    SELECT v.id FROM vendors v
                    WHERE v.is_deleted = FALSE
                      AND ST_DWithin(
                          v.location::geography,
                          ST_SetSRID(ST_MakePoint(${idx + 1}, ${idx}), 4326)::geography,
                          ${idx + 2}
                      )
                )"""
            )
            params.append(lat)       # ${idx}
            params.append(lng)       # ${idx+1}
            params.append(radius_m)  # ${idx+2}
            idx += 3

        where = " AND ".join(conditions)

        # Count total matching products
        count_row = await conn.fetchrow(f"SELECT COUNT(*) FROM products p WHERE {where}", *params)
        total = count_row[0]
        offset = (page - 1) * page_size

        # Build SELECT with hybrid scoring if applicable
        if use_hybrid_search:
            # Hybrid search query with weighted scoring
            query_param_idx = idx
            embedding_param_idx = idx + 1

            # Full-text search score with enhanced category weighting
            # Use ts_rank_cd with category-aware normalization
            # The search_vector now contains: A=category, B=name, C=description
            # Using normalization flag 32 for document length + unique word count normalization
            fts_score = f"ts_rank_cd(p.search_vector, plainto_tsquery('english', ${query_param_idx}), 32)"

            # Vector similarity score (convert cosine distance to similarity: 1 - distance/2)
            # Cosine distance in pgvector: 0 = identical, 2 = opposite
            vector_score = f"GREATEST(0, 1 - (p.embedding <=> ${embedding_param_idx}::vector) / 2.0)"

            # Combined hybrid score
            hybrid_score = f"({fts_weight} * {fts_score} + {vector_weight} * {vector_score})"

            select_query = f"""
                SELECT p.*,
                       {hybrid_score} as relevance_score
                FROM products p
                WHERE {where}
                ORDER BY relevance_score DESC, p.created_at DESC
                LIMIT ${embedding_param_idx + 1} OFFSET ${embedding_param_idx + 2}
            """

            params.extend([q, query_embedding, page_size, offset])
            rows = await conn.fetch(select_query, *params)

        else:
            # No hybrid search - standard query
            rows = await conn.fetch(
                f"SELECT p.* FROM products p WHERE {where} ORDER BY {order_clause} LIMIT ${idx} OFFSET ${idx + 1}",
                *params,
                page_size,
                offset,
            )

        return [_row_to_dict(r) for r in rows], total

    # -----------------------------------------------------------------------
    # Products — update
    # -----------------------------------------------------------------------

    async def update_product(
        self,
        product_id: UUID,
        fields: dict,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update_product(_conn, product_id, fields)
        return await self._update_product(conn, product_id, fields)

    async def _update_product(
        self, conn: asyncpg.Connection, product_id: UUID, fields: dict
    ) -> Optional[dict]:
        if not fields:
            return await self._find_by_id(conn, product_id)
        assignments = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(fields))
        values = list(fields.values())
        row = await conn.fetchrow(
            f"UPDATE products SET {assignments} WHERE id = $1 AND is_deleted = FALSE RETURNING *",
            product_id,
            *values,
        )
        return _row_to_dict(row) if row else None

    async def soft_delete_product(self, product_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._soft_delete_product(_conn, product_id)
        return await self._soft_delete_product(conn, product_id)

    async def _soft_delete_product(self, conn: asyncpg.Connection, product_id: UUID) -> None:
        await conn.execute("UPDATE products SET is_deleted = TRUE WHERE id = $1", product_id)

    # -----------------------------------------------------------------------
    # Products — image helpers (append/remove from parallel arrays)
    # -----------------------------------------------------------------------

    async def append_image(
        self,
        product_id: UUID,
        image_url: str,
        image_id: str,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._append_image(_conn, product_id, image_url, image_id)
        return await self._append_image(conn, product_id, image_url, image_id)

    async def _append_image(
        self, conn: asyncpg.Connection, product_id: UUID, image_url: str, image_id: str
    ) -> dict:
        row = await conn.fetchrow(
            """
            UPDATE products
            SET image_urls = image_urls || $2::text,
                image_ids  = image_ids  || $3::text
            WHERE id = $1 AND is_deleted = FALSE
            RETURNING *
            """,
            product_id,
            image_url,
            image_id,
        )
        return _row_to_dict(row)

    async def remove_image_at(
        self,
        product_id: UUID,
        index: int,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        """Remove image at 0-based index from parallel arrays. Returns the removed image_id."""
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._remove_image_at(_conn, product_id, index)
        return await self._remove_image_at(conn, product_id, index)

    async def _remove_image_at(
        self, conn: asyncpg.Connection, product_id: UUID, index: int
    ) -> Optional[dict]:
        # Fetch first to get current arrays
        row = await self._find_by_id(conn, product_id)
        if not row:
            return None
        image_urls: list = list(row.get("image_urls") or [])
        image_ids: list = list(row.get("image_ids") or [])
        if index < 0 or index >= len(image_urls):
            return None

        removed_id = image_ids[index] if index < len(image_ids) else None
        image_urls.pop(index)
        if index < len(image_ids):
            image_ids.pop(index)

        updated = await self._update_product(conn, product_id, {
            "image_urls": image_urls,
            "image_ids": image_ids,
        })
        if updated:
            updated["_removed_image_id"] = removed_id
        return updated

    # -----------------------------------------------------------------------
    # Devices — create
    # -----------------------------------------------------------------------

    async def create_device(self, data: dict, *, conn: Optional[asyncpg.Connection] = None) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_device(_conn, data)
        return await self._create_device(conn, data)

    async def _create_device(self, conn: asyncpg.Connection, data: dict) -> dict:
        row = await conn.fetchrow(
            """
            INSERT INTO devices (product_id, serial_no, condition, properties, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            data["product_id"],
            data.get("serial_no"),
            data.get("condition", "good"),
            json.dumps(data.get("properties", {})),
            data.get("is_active", True),
        )
        return _row_to_dict(row)

    # -----------------------------------------------------------------------
    # Devices — read
    # -----------------------------------------------------------------------

    async def find_device_by_id(self, device_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_device_by_id(_conn, device_id)
        return await self._find_device_by_id(conn, device_id)

    async def _find_device_by_id(self, conn: asyncpg.Connection, device_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM devices WHERE id = $1 AND is_deleted = FALSE", device_id
        )
        return _row_to_dict(row) if row else None

    async def list_devices(
        self,
        page: int,
        page_size: int,
        product_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> tuple[list[dict], int]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_devices(_conn, page, page_size, product_id, is_active)
        return await self._list_devices(conn, page, page_size, product_id, is_active)

    async def _list_devices(
        self,
        conn: asyncpg.Connection,
        page: int,
        page_size: int,
        product_id: Optional[UUID],
        is_active: Optional[bool],
    ) -> tuple[list[dict], int]:
        conditions = ["is_deleted = FALSE"]
        params: list = []
        idx = 1

        if product_id is not None:
            conditions.append(f"product_id = ${idx}")
            params.append(product_id)
            idx += 1
        if is_active is not None:
            conditions.append(f"is_active = ${idx}")
            params.append(is_active)
            idx += 1

        where = " AND ".join(conditions)
        count_row = await conn.fetchrow(f"SELECT COUNT(*) FROM devices WHERE {where}", *params)
        total = count_row[0]
        offset = (page - 1) * page_size
        rows = await conn.fetch(
            f"SELECT * FROM devices WHERE {where} ORDER BY created_at DESC LIMIT ${idx} OFFSET ${idx + 1}",
            *params,
            page_size,
            offset,
        )
        return [_row_to_dict(r) for r in rows], total

    # -----------------------------------------------------------------------
    # Devices — update
    # -----------------------------------------------------------------------

    async def update_device(
        self,
        device_id: UUID,
        fields: dict,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update_device(_conn, device_id, fields)
        return await self._update_device(conn, device_id, fields)

    async def _update_device(
        self, conn: asyncpg.Connection, device_id: UUID, fields: dict
    ) -> Optional[dict]:
        if not fields:
            return await self._find_device_by_id(conn, device_id)
        assignments = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(fields))
        values = list(fields.values())
        row = await conn.fetchrow(
            f"UPDATE devices SET {assignments} WHERE id = $1 AND is_deleted = FALSE RETURNING *",
            device_id,
            *values,
        )
        return _row_to_dict(row) if row else None

    async def soft_delete_device(self, device_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._soft_delete_device(_conn, device_id)
        return await self._soft_delete_device(conn, device_id)

    async def _soft_delete_device(self, conn: asyncpg.Connection, device_id: UUID) -> None:
        await conn.execute("UPDATE devices SET is_deleted = TRUE WHERE id = $1", device_id)

    async def count_devices_for_product(
        self, product_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> int:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._count_devices_for_product(_conn, product_id)
        return await self._count_devices_for_product(conn, product_id)

    async def _count_devices_for_product(self, conn: asyncpg.Connection, product_id: UUID) -> int:
        row = await conn.fetchrow(
            "SELECT COUNT(*) FROM devices WHERE product_id = $1 AND is_deleted = FALSE", product_id
        )
        return row[0]
