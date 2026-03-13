"""
User repository — all database access for the users domain.

Public methods accept an optional asyncpg.Connection. When None, a connection
is acquired from the pool automatically. Pass an explicit connection to
participate in a caller-managed transaction.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


def _row_to_dict(row: asyncpg.Record) -> dict:
    return dict(row)


class UserRepository:
    def __init__(self, db: DatabasePool) -> None:
        self._db = db

    # -----------------------------------------------------------------------
    # users — create
    # -----------------------------------------------------------------------

    async def create_user(self, data: dict, *, conn: Optional[asyncpg.Connection] = None) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_user(_conn, data)
        return await self._create_user(conn, data)

    async def _create_user(self, conn: asyncpg.Connection, data: dict) -> dict:
        row = await conn.fetchrow(
            """
            INSERT INTO users (name, email_id, mobile_no, password, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            data["name"],
            data["email_id"],
            data["mobile_no"],
            data["password"],
            data["role"],
        )
        return _row_to_dict(row)

    # -----------------------------------------------------------------------
    # users — read
    # -----------------------------------------------------------------------

    async def find_by_id(
        self, user_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_id(_conn, user_id)
        return await self._find_by_id(conn, user_id)

    async def _find_by_id(self, conn: asyncpg.Connection, user_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE id = $1 AND is_deleted = FALSE", user_id
        )
        return _row_to_dict(row) if row else None

    async def find_by_email_and_role(
        self,
        email_id: str,
        role: str,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_email_and_role(_conn, email_id, role)
        return await self._find_by_email_and_role(conn, email_id, role)

    async def _find_by_email_and_role(
        self, conn: asyncpg.Connection, email_id: str, role: str
    ) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE email_id = $1 AND role = $2 AND is_deleted = FALSE",
            email_id,
            role,
        )
        return _row_to_dict(row) if row else None

    async def find_by_mobile_and_role(
        self,
        mobile_no: str,
        role: str,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_by_mobile_and_role(_conn, mobile_no, role)
        return await self._find_by_mobile_and_role(conn, mobile_no, role)

    async def _find_by_mobile_and_role(
        self, conn: asyncpg.Connection, mobile_no: str, role: str
    ) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE mobile_no = $1 AND role = $2 AND is_deleted = FALSE",
            mobile_no,
            role,
        )
        return _row_to_dict(row) if row else None

    # -----------------------------------------------------------------------
    # users — update
    # -----------------------------------------------------------------------

    async def update_user(
        self,
        user_id: UUID,
        fields: dict,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update_user(_conn, user_id, fields)
        return await self._update_user(conn, user_id, fields)

    async def _update_user(
        self, conn: asyncpg.Connection, user_id: UUID, fields: dict
    ) -> Optional[dict]:
        if not fields:
            return await self._find_by_id(conn, user_id)
        assignments = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(fields))
        values = list(fields.values())
        row = await conn.fetchrow(
            f"UPDATE users SET {assignments} WHERE id = $1 AND is_deleted = FALSE RETURNING *",
            user_id,
            *values,
        )
        return _row_to_dict(row) if row else None

    async def soft_delete_user(
        self, user_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._soft_delete_user(_conn, user_id)
        return await self._soft_delete_user(conn, user_id)

    async def _soft_delete_user(self, conn: asyncpg.Connection, user_id: UUID) -> None:
        await conn.execute(
            "UPDATE users SET is_deleted = TRUE WHERE id = $1", user_id
        )

    # -----------------------------------------------------------------------
    # users — list (admin)
    # -----------------------------------------------------------------------

    async def list_users(
        self,
        page: int,
        page_size: int,
        role: Optional[str] = None,
        is_verified: Optional[bool] = None,
        q: Optional[str] = None,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> tuple[list[dict], int]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._list_users(_conn, page, page_size, role, is_verified, q)
        return await self._list_users(conn, page, page_size, role, is_verified, q)

    async def _list_users(
        self,
        conn: asyncpg.Connection,
        page: int,
        page_size: int,
        role: Optional[str],
        is_verified: Optional[bool],
        q: Optional[str],
    ) -> tuple[list[dict], int]:
        conditions = ["is_deleted = FALSE"]
        params: list = []
        idx = 1

        if role:
            conditions.append(f"role = ${idx}")
            params.append(role)
            idx += 1
        if is_verified is not None:
            conditions.append(f"is_verified = ${idx}")
            params.append(is_verified)
            idx += 1
        if q:
            conditions.append(f"(name ILIKE ${idx} OR email_id ILIKE ${idx})")
            params.append(f"%{q}%")
            idx += 1

        where = " AND ".join(conditions)
        count_row = await conn.fetchrow(f"SELECT COUNT(*) FROM users WHERE {where}", *params)
        total = count_row[0]

        offset = (page - 1) * page_size
        rows = await conn.fetch(
            f"SELECT * FROM users WHERE {where} ORDER BY created_at DESC LIMIT ${idx} OFFSET ${idx + 1}",
            *params,
            page_size,
            offset,
        )
        return [_row_to_dict(r) for r in rows], total

    # -----------------------------------------------------------------------
    # customers
    # -----------------------------------------------------------------------

    async def create_customer(
        self, user_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_customer(_conn, user_id)
        return await self._create_customer(conn, user_id)

    async def _create_customer(self, conn: asyncpg.Connection, user_id: UUID) -> dict:
        row = await conn.fetchrow(
            "INSERT INTO customers (id) VALUES ($1) RETURNING *", user_id
        )
        return _row_to_dict(row)

    async def find_customer(
        self, user_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_customer(_conn, user_id)
        return await self._find_customer(conn, user_id)

    async def _find_customer(self, conn: asyncpg.Connection, user_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow("SELECT * FROM customers WHERE id = $1", user_id)
        return _row_to_dict(row) if row else None

    # -----------------------------------------------------------------------
    # vendors
    # -----------------------------------------------------------------------

    async def create_vendor(
        self, user_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_vendor(_conn, user_id)
        return await self._create_vendor(conn, user_id)

    async def _create_vendor(self, conn: asyncpg.Connection, user_id: UUID) -> dict:
        row = await conn.fetchrow(
            "INSERT INTO vendors (id) VALUES ($1) RETURNING *", user_id
        )
        return _row_to_dict(row)

    async def find_vendor(
        self, user_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_vendor(_conn, user_id)
        return await self._find_vendor(conn, user_id)

    async def _find_vendor(self, conn: asyncpg.Connection, user_id: UUID) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT id, name, gst_no, address, city, pincode, bank_details, "
            "ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, "
            "is_verified, is_active, created_at, updated_at "
            "FROM vendors WHERE id = $1 AND is_deleted = FALSE",
            user_id,
        )
        return _row_to_dict(row) if row else None

    async def update_vendor(
        self,
        user_id: UUID,
        fields: dict,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update_vendor(_conn, user_id, fields, lat, lng)
        return await self._update_vendor(conn, user_id, fields, lat, lng)

    async def _update_vendor(
        self, conn: asyncpg.Connection, user_id: UUID, fields: dict,
        lat: Optional[float] = None, lng: Optional[float] = None,
    ) -> Optional[dict]:
        if not fields and lat is None:
            return await self._find_vendor(conn, user_id)
        assignments = []
        values: list = []
        idx = 2  # $1 is always user_id
        for k, v in fields.items():
            assignments.append(f"{k} = ${idx}")
            values.append(v)
            idx += 1
        if lat is not None and lng is not None:
            # ST_MakePoint(x, y) → (lng, lat)
            assignments.append(
                f"location = ST_SetSRID(ST_MakePoint(${idx}, ${idx + 1}), 4326)::geography"
            )
            values.append(lng)
            values.append(lat)
        row = await conn.fetchrow(
            f"UPDATE vendors SET {', '.join(assignments)} WHERE id = $1 AND is_deleted = FALSE RETURNING *",
            user_id,
            *values,
        )
        return _row_to_dict(row) if row else None

    # -----------------------------------------------------------------------
    # delivery_partners
    # -----------------------------------------------------------------------

    async def create_delivery_partner(
        self, user_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_delivery_partner(_conn, user_id)
        return await self._create_delivery_partner(conn, user_id)

    async def _create_delivery_partner(self, conn: asyncpg.Connection, user_id: UUID) -> dict:
        row = await conn.fetchrow(
            "INSERT INTO delivery_partners (id) VALUES ($1) RETURNING *", user_id
        )
        return _row_to_dict(row)

    async def find_delivery_partner(
        self, user_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_delivery_partner(_conn, user_id)
        return await self._find_delivery_partner(conn, user_id)

    async def _find_delivery_partner(
        self, conn: asyncpg.Connection, user_id: UUID
    ) -> Optional[dict]:
        row = await conn.fetchrow(
            "SELECT id, name, gst_no, address, city, pincode, bank_details, "
            "ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng, "
            "is_verified, is_active, created_at, updated_at "
            "FROM delivery_partners WHERE id = $1 AND is_deleted = FALSE",
            user_id,
        )
        return _row_to_dict(row) if row else None

    async def update_delivery_partner(
        self,
        user_id: UUID,
        fields: dict,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._update_delivery_partner(_conn, user_id, fields, lat, lng)
        return await self._update_delivery_partner(conn, user_id, fields, lat, lng)

    async def _update_delivery_partner(
        self, conn: asyncpg.Connection, user_id: UUID, fields: dict,
        lat: Optional[float] = None, lng: Optional[float] = None,
    ) -> Optional[dict]:
        if not fields and lat is None:
            return await self._find_delivery_partner(conn, user_id)
        assignments = []
        values: list = []
        idx = 2  # $1 is always user_id
        for k, v in fields.items():
            assignments.append(f"{k} = ${idx}")
            values.append(v)
            idx += 1
        if lat is not None and lng is not None:
            # ST_MakePoint(x, y) → (lng, lat)
            assignments.append(
                f"location = ST_SetSRID(ST_MakePoint(${idx}, ${idx + 1}), 4326)::geography"
            )
            values.append(lng)
            values.append(lat)
        row = await conn.fetchrow(
            f"UPDATE delivery_partners SET {', '.join(assignments)} WHERE id = $1 AND is_deleted = FALSE RETURNING *",
            user_id,
            *values,
        )
        return _row_to_dict(row) if row else None

    # -----------------------------------------------------------------------
    # otp_verifications
    # -----------------------------------------------------------------------

    async def create_otp(
        self,
        user_id: UUID,
        otp_type: str,
        otp_hash: str,
        expires_at: datetime,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> dict:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._create_otp(_conn, user_id, otp_type, otp_hash, expires_at)
        return await self._create_otp(conn, user_id, otp_type, otp_hash, expires_at)

    async def _create_otp(
        self,
        conn: asyncpg.Connection,
        user_id: UUID,
        otp_type: str,
        otp_hash: str,
        expires_at: datetime,
    ) -> dict:
        # Invalidate any existing unused OTPs for this user+type
        await conn.execute(
            "UPDATE otp_verifications SET is_used = TRUE "
            "WHERE user_id = $1 AND otp_type = $2 AND is_used = FALSE",
            user_id,
            otp_type,
        )
        row = await conn.fetchrow(
            """
            INSERT INTO otp_verifications (user_id, otp_type, otp_hash, expires_at)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            user_id,
            otp_type,
            otp_hash,
            expires_at,
        )
        return _row_to_dict(row)

    async def find_latest_otp(
        self,
        user_id: UUID,
        otp_type: str,
        *,
        conn: Optional[asyncpg.Connection] = None,
    ) -> Optional[dict]:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._find_latest_otp(_conn, user_id, otp_type)
        return await self._find_latest_otp(conn, user_id, otp_type)

    async def _find_latest_otp(
        self, conn: asyncpg.Connection, user_id: UUID, otp_type: str
    ) -> Optional[dict]:
        row = await conn.fetchrow(
            """
            SELECT * FROM otp_verifications
            WHERE user_id = $1 AND otp_type = $2 AND is_used = FALSE
            ORDER BY created_at DESC
            LIMIT 1
            """,
            user_id,
            otp_type,
        )
        return _row_to_dict(row) if row else None

    async def mark_otp_used(
        self, otp_id: UUID, *, conn: Optional[asyncpg.Connection] = None
    ) -> None:
        if conn is None:
            async with self._db.acquire() as _conn:
                return await self._mark_otp_used(_conn, otp_id)
        return await self._mark_otp_used(conn, otp_id)

    async def _mark_otp_used(self, conn: asyncpg.Connection, otp_id: UUID) -> None:
        await conn.execute(
            "UPDATE otp_verifications SET is_used = TRUE WHERE id = $1", otp_id
        )
