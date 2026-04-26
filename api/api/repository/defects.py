"""Repository — database access for order defect charges."""
from __future__ import annotations

from typing import Optional
from uuid import UUID
from decimal import Decimal
from datetime import datetime

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


def _row_to_dict(row: asyncpg.Record) -> dict:
    """Convert asyncpg.Record to dict."""
    return dict(row)


class DefectRepository:
    """Repository for defect charge database operations."""
    
    def __init__(self, db: DatabasePool) -> None:
        self._db = db

    # ── Create Defect ──────────────────────────────────────────────────
    
    async def create_defect_charge(
        self,
        order_id: UUID,
        vendor_id: UUID,
        amount: Decimal,
        description: str,
        images: list[str],
        stripe_payment_intent_id: str,
    ) -> dict:
        """Create a new defect charge."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO order_defects (
                    order_id, vendor_id, amount, description, images, stripe_payment_intent_id, status
                )
                VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                RETURNING *
                """,
                order_id,
                vendor_id,
                amount,
                description,
                images,
                stripe_payment_intent_id,
            )
            await conn.execute(
                """
                UPDATE orders
                SET damage_amount = COALESCE(damage_amount, 0) + $1,
                grand_total = grand_total + $1
                WHERE id = $2
            """,
                amount,
                order_id,
            )
            logger.info("defect_charge_created", defect_id=row["id"], order_id=order_id)
            return _row_to_dict(row)

    # ── Get Defects ────────────────────────────────────────────────────
    
    async def get_defect_charge_by_id(self, defect_id: UUID) -> Optional[dict]:
        """Get a defect charge by ID."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT *
                FROM order_defects
                WHERE id = $1
                """,
                defect_id,
            )
            return _row_to_dict(row) if row else None

    async def list_defects_for_order(self, order_id: UUID) -> list[dict]:
        """List all defect charges for an order."""
        async with self._db.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT *
                FROM order_defects
                WHERE order_id = $1
                ORDER BY created_at DESC
                """,
                order_id,
            )
            return [_row_to_dict(row) for row in rows]

    async def list_defects_for_vendor(
        self,
        vendor_id: UUID,
        status: Optional[str] = None,
    ) -> list[dict]:
        """List defect charges created by a vendor."""
        async with self._db.acquire() as conn:
            if status:
                rows = await conn.fetch(
                    """
                    SELECT *
                    FROM order_defects
                    WHERE vendor_id = $1 AND status = $2
                    ORDER BY created_at DESC
                    """,
                    vendor_id,
                    status,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT *
                    FROM order_defects
                    WHERE vendor_id = $1
                    ORDER BY created_at DESC
                    """,
                    vendor_id,
                )
            return [_row_to_dict(row) for row in rows]

    # ── Update Defect ──────────────────────────────────────────────────
    
    async def update_defect_status(
        self,
        defect_id: UUID,
        status: str,
    ) -> Optional[dict]:
        """Update the status of a defect charge."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE order_defects
                SET status = $1
                WHERE id = $2
                RETURNING *
                """,
                status,
                defect_id,
            )
            if row:
                logger.info("defect_status_updated", defect_id=defect_id, status=status)
            return _row_to_dict(row) if row else None

    async def mark_defect_as_paid(self, defect_id: UUID) -> Optional[dict]:
        """Mark a defect charge as paid."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE order_defects
                SET 
                    status = 'paid',
                    paid_at = NOW()
                WHERE id = $1
                RETURNING *
                """,
                defect_id,
            )
            if row:
                logger.info("defect_marked_as_paid", defect_id=defect_id)
            return _row_to_dict(row) if row else None

    # ── Helper Methods ─────────────────────────────────────────────────
    
    async def get_order_details(self, order_id: UUID) -> Optional[dict]:
        """Get order details (for validation)."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, customer_id, vendor_id, status
                FROM orders
                WHERE id = $1
                """,
                order_id,
            )
            return _row_to_dict(row) if row else None

    async def get_total_defect_charges_for_order(self, order_id: UUID) -> Decimal:
        """Get the total amount of all defect charges for an order."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT COALESCE(SUM(amount), 0) as total
                FROM order_defects
                WHERE order_id = $1 AND status != 'waived'
                """,
                order_id,
            )
            return row["total"] if row else Decimal(0)
