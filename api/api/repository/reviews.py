"""Repository — database access for product reviews."""
from __future__ import annotations

from typing import Optional
from uuid import UUID
from datetime import datetime
import math

import asyncpg
import structlog

from api.database import DatabasePool

logger = structlog.get_logger(__name__)


def _row_to_dict(row: asyncpg.Record) -> dict:
    """Convert asyncpg.Record to dict."""
    return dict(row)


class ReviewRepository:
    """Repository for product review database operations."""
    
    def __init__(self, db: DatabasePool) -> None:
        self._db = db

    # ── Create Review ──────────────────────────────────────────────────
    
    async def create_review(
        self,
        product_id: UUID,
        order_id: UUID,
        customer_id: UUID,
        rating: int,
        comment: str,
        images: list[str],
    ) -> dict:
        """Create a new product review."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO product_reviews (
                    product_id, order_id, customer_id, rating, comment, images
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                """,
                product_id,
                order_id,
                customer_id,
                rating,
                comment,
                images,
            )
            logger.info("review_created", review_id=row["id"], order_id=order_id)
            return _row_to_dict(row)

    # ── Get Reviews ────────────────────────────────────────────────────
    
    async def get_review_by_id(self, review_id: UUID) -> Optional[dict]:
        """Get a review by ID with customer information."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT 
                    pr.*,
                    u.name as customer_name,
                    u.profile_photo_url as customer_avatar
                FROM product_reviews pr
                JOIN customers c ON pr.customer_id = c.id
                JOIN users u ON c.id = u.id
                WHERE pr.id = $1
                """,
                review_id,
            )
            return _row_to_dict(row) if row else None

    async def get_review_by_order_id(self, order_id: UUID) -> Optional[dict]:
        """Check if a review exists for an order."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT 
                    pr.*,
                    u.name as customer_name,
                    u.profile_photo_url as customer_avatar
                FROM product_reviews pr
                JOIN customers c ON pr.customer_id = c.id
                JOIN users u ON c.id = u.id
                WHERE pr.order_id = $1
                """,
                order_id,
            )
            return _row_to_dict(row) if row else None

    async def list_reviews(
        self,
        product_id: Optional[UUID] = None,
        customer_id: Optional[UUID] = None,
        order_id: Optional[UUID] = None,
        min_rating: Optional[int] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 10,
    ) -> tuple[list[dict], int]:
        """List reviews with filtering, sorting, and pagination."""
        async with self._db.acquire() as conn:
            # Build WHERE clause
            where_clauses = []
            params = []
            param_counter = 1
            
            if product_id:
                where_clauses.append(f"pr.product_id = ${param_counter}")
                params.append(product_id)
                param_counter += 1
            
            if customer_id:
                where_clauses.append(f"pr.customer_id = ${param_counter}")
                params.append(customer_id)
                param_counter += 1
            
            if order_id:
                where_clauses.append(f"pr.order_id = ${param_counter}")
                params.append(order_id)
                param_counter += 1
            
            if min_rating:
                where_clauses.append(f"pr.rating >= ${param_counter}")
                params.append(min_rating)
                param_counter += 1
            
            where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            # Validate sort_by to prevent SQL injection
            valid_sort_fields = ["created_at", "rating", "helpful_count", "updated_at"]
            if sort_by not in valid_sort_fields:
                sort_by = "created_at"
            
            sort_order_sql = "DESC" if sort_order.upper() == "DESC" else "ASC"
            
            # Count total
            count_query = f"""
                SELECT COUNT(*) as total
                FROM product_reviews pr
                {where_sql}
            """
            total_row = await conn.fetchrow(count_query, *params)
            total = total_row["total"]
            
            # Calculate offset
            offset = (page - 1) * page_size
            
            # Get paginated results
            query = f"""
                SELECT 
                    pr.*,
                    u.name as customer_name,
                    u.profile_photo_url as customer_avatar
                FROM product_reviews pr
                JOIN customers c ON pr.customer_id = c.id
                JOIN users u ON c.id = u.id
                {where_sql}
                ORDER BY pr.{sort_by} {sort_order_sql}
                LIMIT ${param_counter} OFFSET ${param_counter + 1}
            """
            params.extend([page_size, offset])
            
            rows = await conn.fetch(query, *params)
            reviews = [_row_to_dict(row) for row in rows]
            
            return reviews, total

    # ── Update Review ──────────────────────────────────────────────────
    
    async def update_vendor_response(
        self,
        review_id: UUID,
        vendor_response: str,
    ) -> Optional[dict]:
        """Update vendor response for a review."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE product_reviews
                SET 
                    vendor_response = $1,
                    vendor_responded_at = NOW()
                WHERE id = $2
                RETURNING *
                """,
                vendor_response,
                review_id,
            )
            if row:
                logger.info("vendor_response_added", review_id=review_id)
            return _row_to_dict(row) if row else None

    async def increment_helpful_count(self, review_id: UUID) -> Optional[dict]:
        """Increment the helpful count for a review."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE product_reviews
                SET helpful_count = helpful_count + 1
                WHERE id = $1
                RETURNING *
                """,
                review_id,
            )
            return _row_to_dict(row) if row else None

    # ── Review Statistics ──────────────────────────────────────────────
    
    async def get_product_rating_stats(self, product_id: UUID) -> dict:
        """Get rating statistics for a product."""
        async with self._db.acquire() as conn:
            # Get average rating and total reviews
            stats_row = await conn.fetchrow(
                """
                SELECT 
                    COALESCE(ROUND(AVG(rating)::numeric, 2), 0) as average_rating,
                    COUNT(*) as total_reviews
                FROM product_reviews
                WHERE product_id = $1
                """,
                product_id,
            )
            
            # Get rating distribution
            distribution_rows = await conn.fetch(
                """
                SELECT 
                    rating,
                    COUNT(*) as count
                FROM product_reviews
                WHERE product_id = $1
                GROUP BY rating
                ORDER BY rating DESC
                """,
                product_id,
            )
            
            # Build distribution dict (ensure all ratings 1-5 are present)
            rating_distribution = {str(i): 0 for i in range(1, 6)}
            for row in distribution_rows:
                rating_distribution[str(row["rating"])] = row["count"]
            
            return {
                "product_id": product_id,
                "average_rating": float(stats_row["average_rating"]),
                "total_reviews": stats_row["total_reviews"],
                "rating_distribution": rating_distribution,
            }

    # ── Validation Helpers ─────────────────────────────────────────────
    
    async def check_order_completed(self, order_id: UUID) -> bool:
        """Check if an order is completed."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT status
                FROM orders
                WHERE id = $1
                """,
                order_id,
            )
            return row and row["status"] == "completed"

    async def check_customer_owns_order(self, order_id: UUID, customer_id: UUID) -> bool:
        """Check if a customer owns an order."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id
                FROM orders
                WHERE id = $1 AND customer_id = $2
                """,
                order_id,
                customer_id,
            )
            return row is not None

    async def check_review_exists_for_order(self, order_id: UUID) -> bool:
        """Check if a review already exists for an order."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id
                FROM product_reviews
                WHERE order_id = $1
                """,
                order_id,
            )
            return row is not None

    async def get_review_vendor_id(self, review_id: UUID) -> Optional[UUID]:
        """Get the vendor ID for a review (via the order)."""
        async with self._db.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT o.vendor_id
                FROM product_reviews pr
                JOIN orders o ON pr.order_id = o.id
                WHERE pr.id = $1
                """,
                review_id,
            )
            return row["vendor_id"] if row else None
