"""Repository — database access for orders."""
from __future__ import annotations

import random
from datetime import date
from typing import Optional
from uuid import UUID

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


def _row_to_dict(row: asyncpg.Record) -> dict:
    return dict(row)


class OrderRepository:
    def __init__(self, db: DatabasePool) -> None:
        self._db = db

    # ── Device availability ────────────────────────────────────────────────

    async def find_available_device(
        self, product_id: UUID, start_date: date, end_date: date, *, conn: Optional[asyncpg.Connection] = None
    ) -> Optional[dict]:
        """Return a randomly chosen device that is active and not overlapping the given date range."""
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_available_device(_conn, product_id, start_date, end_date)
        return await self._find_available_device(conn, product_id, start_date, end_date)

    async def _find_available_device(
        self, conn: asyncpg.Connection, product_id: UUID, start_date: date, end_date: date
    ) -> Optional[dict]:
        # A device is unavailable if it has a confirmed/active order overlapping the requested period
        rows = await conn.fetch(
            """
            SELECT d.id, d.serial_no, d.condition, d.properties
            FROM devices d
            WHERE d.product_id = $1
              AND d.is_active = TRUE
              AND d.is_deleted = FALSE
              AND d.id NOT IN (
                  SELECT o.device_id
                  FROM orders o
                  WHERE o.device_id = d.id
                    AND o.status IN ('pending_payment', 'confirmed', 'active')
                    AND o.start_date <= $3
                    AND o.end_date   >= $2
              )
            """,
            product_id, start_date, end_date,
        )
        if not rows:
            return None
        return _row_to_dict(random.choice(rows))

    # ── Create ────────────────────────────────────────────────────────────

    async def create_order(self, data: dict, *, conn: Optional[asyncpg.Connection] = None) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_order(_conn, data)
        return await self._create_order(conn, data)

    async def _create_order(self, conn: asyncpg.Connection, data: dict) -> dict:
        row = await conn.fetchrow(
            """
            INSERT INTO orders (
                customer_id, product_id, vendor_id, address_id, device_id,
                start_date, end_date, delivery_date, return_date, rental_days,
                delivery_type, promo_code_id, promo_code,
                security_deposit, amount, discount, net_amount,
                cgst_amount, sgst_amount, grand_total, status
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
            ) RETURNING *
            """,
            data["customer_id"],
            data["product_id"],
            data["vendor_id"],
            data["address_id"],
            data["device_id"],
            data["start_date"],
            data["end_date"],
            data["delivery_date"],
            data["return_date"],
            data["rental_days"],
            data["delivery_type"],
            data.get("promo_code_id"),
            data.get("promo_code"),
            data["security_deposit"],
            data["amount"],
            data["discount"],
            data["net_amount"],
            data["cgst_amount"],
            data["sgst_amount"],
            data["grand_total"],
            data.get("status", "pending_payment"),
        )
        await self._insert_status_history(conn, row["id"], row["status"])
        return _row_to_dict(row)

    async def create_order_payment(self, data: dict, *, conn: Optional[asyncpg.Connection] = None) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_order_payment(_conn, data)
        return await self._create_order_payment(conn, data)

    async def _create_order_payment(self, conn: asyncpg.Connection, data: dict) -> dict:
        row = await conn.fetchrow(
            """
            INSERT INTO order_payments (order_id, customer_id, stripe_payment_intent_id, amount)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            data["order_id"],
            data["customer_id"],
            data["stripe_payment_intent_id"],
            data["amount"],
        )
        return _row_to_dict(row)

    # ── Read ──────────────────────────────────────────────────────────────

    async def find_by_id(self, order_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_id(_conn, order_id)
        return await self._find_by_id(conn, order_id)

    async def _find_by_id(self, conn: asyncpg.Connection, order_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            """
            SELECT o.*,
                   u.name        AS customer_name,
                   u.email_id    AS customer_email,
                   u.mobile_no   AS customer_mobile,
                   p.name        AS product_name,
                   p.defect_charge,
                   vu.name       AS vendor_name,
                   v.gst_no      AS vendor_gst,
                   v.city        AS vendor_city,
                   a.address     AS delivery_address_line
            FROM orders o
            JOIN users    u  ON u.id = o.customer_id
            JOIN products p  ON p.id = o.product_id
            JOIN vendors  v  ON v.id = o.vendor_id
            JOIN users    vu ON vu.id = o.vendor_id
            LEFT JOIN addresses a ON a.id = o.address_id
            WHERE o.id = $1
            """,
            order_id,
        )
        return _row_to_dict(row) if row else None

    async def find_payment_by_order(self, order_id: UUID, *, conn: Optional[asyncpg.Connection] = None) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_payment_by_order(_conn, order_id)
        return await self._find_payment_by_order(conn, order_id)

    async def _find_payment_by_order(self, conn: asyncpg.Connection, order_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM order_payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1",
            order_id,
        )
        return _row_to_dict(row) if row else None

    async def list_by_customer(
        self, customer_id: UUID, page: int, page_size: int, *, conn: Optional[asyncpg.Connection] = None
    ) -> tuple[list[dict], int]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_by_customer(_conn, customer_id, page, page_size)
        return await self._list_by_customer(conn, customer_id, page, page_size)

    async def _list_by_customer(
        self, conn: asyncpg.Connection, customer_id: UUID, page: int, page_size: int
    ) -> tuple[list[dict], int]:
        count = await conn.fetchval("SELECT COUNT(*) FROM orders WHERE customer_id = $1", customer_id)
        offset = (page - 1) * page_size
        rows = await conn.fetch(
            """
            SELECT o.*, p.name AS product_name, vu.name AS vendor_name
            FROM orders o
            JOIN products p  ON p.id = o.product_id
            JOIN users    vu ON vu.id = o.vendor_id
            WHERE o.customer_id = $1
            ORDER BY o.created_at DESC
            LIMIT $2 OFFSET $3
            """,
            customer_id, page_size, offset,
        )
        return [_row_to_dict(r) for r in rows], count

    async def list_by_vendor(
        self, vendor_id: UUID, page: int, page_size: int, status: Optional[str] = None, *, conn: Optional[asyncpg.Connection] = None
    ) -> tuple[list[dict], int]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_by_vendor(_conn, vendor_id, page, page_size, status)
        return await self._list_by_vendor(conn, vendor_id, page, page_size, status)

    async def _list_by_vendor(
        self, conn: asyncpg.Connection, vendor_id: UUID, page: int, page_size: int, status: Optional[str]
    ) -> tuple[list[dict], int]:
        where = "o.vendor_id = $1"
        params: list = [vendor_id]
        if status:
            where += " AND o.status = $2"
            params.append(status)
        count = await conn.fetchval(f"SELECT COUNT(*) FROM orders o WHERE {where}", *params)
        offset = (page - 1) * page_size
        params += [page_size, offset]
        n = len(params)
        rows = await conn.fetch(
            f"""
            SELECT o.*, p.name AS product_name, u.name AS customer_name
            FROM orders o
            JOIN products p ON p.id = o.product_id
            JOIN users    u ON u.id = o.customer_id
            WHERE {where}
            ORDER BY o.created_at DESC
            LIMIT ${n - 1} OFFSET ${n}
            """,
            *params,
        )
        return [_row_to_dict(r) for r in rows], count

    async def list_all(
        self, page: int, page_size: int, status: Optional[str] = None, *, conn: Optional[asyncpg.Connection] = None
    ) -> tuple[list[dict], int]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_all(_conn, page, page_size, status)
        return await self._list_all(conn, page, page_size, status)

    async def _list_all(
        self, conn: asyncpg.Connection, page: int, page_size: int, status: Optional[str]
    ) -> tuple[list[dict], int]:
        where = "TRUE"
        params: list = []
        if status:
            where = "o.status = $1"
            params.append(status)
        count = await conn.fetchval(f"SELECT COUNT(*) FROM orders o WHERE {where}", *params)
        offset = (page - 1) * page_size
        params += [page_size, offset]
        n = len(params)
        rows = await conn.fetch(
            f"""
            SELECT o.*, p.name AS product_name, u.name AS customer_name, vu.name AS vendor_name
            FROM orders o
            JOIN products p  ON p.id = o.product_id
            JOIN users    u  ON u.id = o.customer_id
            JOIN users    vu ON vu.id = o.vendor_id
            WHERE {where}
            ORDER BY o.created_at DESC
            LIMIT ${n - 1} OFFSET ${n}
            """,
            *params,
        )
        return [_row_to_dict(r) for r in rows], count

    # ── Update ────────────────────────────────────────────────────────────

    async def update_status(
        self, order_id: UUID, status: str, cancellation_reason: Optional[str] = None, *, conn: Optional[asyncpg.Connection] = None
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update_status(_conn, order_id, status, cancellation_reason)
        return await self._update_status(conn, order_id, status, cancellation_reason)

    async def _update_status(
        self, conn: asyncpg.Connection, order_id: UUID, status: str, cancellation_reason: Optional[str]
    ) -> Optional[dict]:
        row = await conn.fetchrow(
            """
            UPDATE orders SET status = $2, cancellation_reason = $3
            WHERE id = $1
            RETURNING *
            """,
            order_id, status, cancellation_reason,
        )
        if row:
            await self._insert_status_history(conn, order_id, status)
        return _row_to_dict(row) if row else None

    async def update_payment_status(
        self, payment_id: UUID, status: str, gateway_response: Optional[dict] = None, *, conn: Optional[asyncpg.Connection] = None
    ) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update_payment_status(_conn, payment_id, status, gateway_response)
        return await self._update_payment_status(conn, payment_id, status, gateway_response)

    async def _update_payment_status(
        self, conn: asyncpg.Connection, payment_id: UUID, status: str, gateway_response: Optional[dict]
    ) -> None:
        import json
        gw_json = json.dumps(gateway_response) if gateway_response else None
        await conn.execute(
            "UPDATE order_payments SET status = $2, gateway_response = $3::jsonb WHERE id = $1",
            payment_id, status, gw_json,
        )

    # ── Internal ──────────────────────────────────────────────────────────

    async def _insert_status_history(self, conn: asyncpg.Connection, order_id: UUID, status: str) -> None:
        await conn.execute(
            "INSERT INTO order_status_history (order_id, status) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            order_id, status,
        )
