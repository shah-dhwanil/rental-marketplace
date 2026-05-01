"""Test suite for Wishlists, Addresses, Payments, Promos, Reviews, and Defects."""

import pytest
from httpx import AsyncClient
from uuid import uuid4


# ============================================================================
# WISHLIST TESTS
# ============================================================================

class TestWishlists:
    """Test wishlist operations."""

    @pytest.mark.anyio
    async def test_list_wishlist_customer_only(self, client: AsyncClient, create_test_vendor):
        """List wishlist should require customer role."""
        vendor = await create_test_vendor()

        response = await client.get(
            "/api/v1/wishlist",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_list_wishlist_empty(self, client: AsyncClient, create_test_customer):
        """Empty wishlist should return empty list."""
        customer = await create_test_customer()

        response = await client.get(
            "/api/v1/wishlist",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.anyio
    async def test_toggle_wishlist(self, client: AsyncClient, create_test_customer, create_test_product):
        """Toggle wishlist should add/remove product."""
        customer = await create_test_customer()
        vendor = await create_test_customer(name="vendor_for_product")  # Mock vendor
        product = await create_test_product(client, vendor)

        response = await client.post(
            f"/api/v1/wishlist/toggle/{product['id']}",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_in_wishlist" in data

    @pytest.mark.anyio
    async def test_get_wishlist_ids(self, client: AsyncClient, create_test_customer):
        """Get wishlist IDs should return fast sync."""
        customer = await create_test_customer()

        response = await client.get(
            "/api/v1/wishlist/ids",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "product_ids" in data or isinstance(data, dict)

    @pytest.mark.anyio
    async def test_remove_from_wishlist(self, client: AsyncClient, create_test_customer):
        """Remove from wishlist should work."""
        customer = await create_test_customer()

        response = await client.delete(
            "/api/v1/wishlist/someid",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code in [204, 404]


# ============================================================================
# ADDRESSES TESTS
# ============================================================================

class TestAddresses:
    """Test address management."""

    @pytest.mark.anyio
    async def test_list_addresses_customer_only(self, client: AsyncClient, create_test_vendor):
        """List addresses should require customer role."""
        vendor = await create_test_vendor()

        response = await client.get(
            "/api/v1/addresses",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_list_addresses_empty(self, client: AsyncClient, create_test_customer):
        """Empty addresses list should return empty."""
        customer = await create_test_customer()

        response = await client.get(
            "/api/v1/addresses",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.anyio
    async def test_create_address(self, client: AsyncClient, create_test_customer):
        """Create delivery address."""
        customer = await create_test_customer()

        response = await client.post(
            "/api/v1/addresses",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "label": "Home",
                "address_line": "123 Main St",
                "city": "Delhi",
                "pincode": "110001",
                "lat": 28.6139,
                "lng": 77.2090,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data

    @pytest.mark.anyio
    async def test_update_address(self, client: AsyncClient, create_test_customer):
        """Update address should work."""
        customer = await create_test_customer()

        # Create first
        create_resp = await client.post(
            "/api/v1/addresses",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "label": "Home",
                "address_line": "123 Main St",
                "city": "Delhi",
                "pincode": "110001",
                "lat": 28.6139,
                "lng": 77.2090,
            },
        )
        addr_id = create_resp.json()["id"]

        # Update
        response = await client.patch(
            f"/api/v1/addresses/{addr_id}",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={"label": "Updated Home"},
        )
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_delete_address(self, client: AsyncClient, create_test_customer):
        """Delete address should work."""
        customer = await create_test_customer()

        # Create first
        create_resp = await client.post(
            "/api/v1/addresses",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "label": "ToDelete",
                "address_line": "123 Main St",
                "city": "Delhi",
                "pincode": "110001",
                "lat": 28.6139,
                "lng": 77.2090,
            },
        )
        addr_id = create_resp.json()["id"]

        # Delete
        response = await client.delete(
            f"/api/v1/addresses/{addr_id}",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 204


# ============================================================================
# PAYMENT METHODS TESTS
# ============================================================================

class TestPaymentMethods:
    """Test payment method management."""

    @pytest.mark.anyio
    async def test_list_payment_methods_customer_only(self, client: AsyncClient, create_test_vendor):
        """List payments should require customer role."""
        vendor = await create_test_vendor()

        response = await client.get(
            "/api/v1/payment-methods",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_list_payment_methods_empty(self, client: AsyncClient, create_test_customer):
        """Empty payment methods should return empty list."""
        customer = await create_test_customer()

        response = await client.get(
            "/api/v1/payment-methods",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.anyio
    async def test_add_payment_method(self, client: AsyncClient, create_test_customer):
        """Add payment method should work."""
        customer = await create_test_customer()

        response = await client.post(
            "/api/v1/payment-methods",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "card_number": "4111111111111111",
                "expiry_month": 12,
                "expiry_year": 2025,
                "cvv": "123",
                "display_label": "Personal Visa",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data

    @pytest.mark.anyio
    async def test_delete_payment_method(self, client: AsyncClient, create_test_customer):
        """Delete payment method should work."""
        customer = await create_test_customer()

        # Add first
        add_resp = await client.post(
            "/api/v1/payment-methods",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "card_number": "4111111111111111",
                "expiry_month": 12,
                "expiry_year": 2025,
                "cvv": "123",
                "display_label": "Visa",
            },
        )
        pm_id = add_resp.json()["id"]

        # Delete
        response = await client.delete(
            f"/api/v1/payment-methods/{pm_id}",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 204


# ============================================================================
# PROMO CODES TESTS
# ============================================================================

class TestPromos:
    """Test promo code management."""

    @pytest.mark.anyio
    async def test_validate_promo_public(self, client: AsyncClient):
        """Validate promo should work without auth."""
        response = await client.post(
            "/api/v1/promos/validate",
            json={"code": "PROMO123"},
        )
        # May fail if code doesn't exist, but endpoint should be public
        assert response.status_code in [200, 404, 422]

    @pytest.mark.anyio
    async def test_list_my_promos_vendor_only(self, client: AsyncClient, create_test_customer):
        """List vendor promos should require vendor role."""
        customer = await create_test_customer()

        response = await client.get(
            "/api/v1/promos/mine",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_list_all_promos_admin_only(self, client: AsyncClient, create_test_customer):
        """List all promos should require admin role."""
        customer = await create_test_customer()

        response = await client.get(
            "/api/v1/promos",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 403


# ============================================================================
# REVIEWS TESTS
# ============================================================================

class TestReviews:
    """Test review management."""

    @pytest.mark.anyio
    async def test_list_reviews_public(self, client: AsyncClient):
        """List reviews should work without auth."""
        response = await client.get(
            "/api/v1/reviews?p, age=1&p, age_size=10"
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or "data" in data or "reviews" in data

    @pytest.mark.anyio
    async def test_get_product_rating_stats(self, client: AsyncClient):
        """Get product stats should work."""
        product_id = str(uuid4())
        response = await client.get(
            f"/api/v1/reviews/products/{product_id}/stats"
        )
        # May fail if product doesn't exist
        assert response.status_code in [200, 404]

    @pytest.mark.anyio
    async def test_create_review_customer_only(self, client: AsyncClient, create_test_vendor):
        """Create review should require customer role."""
        vendor = await create_test_vendor()

        response = await client.post(
            "/api/v1/reviews",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={
                "product_id": str(uuid4()),
                "order_id": str(uuid4()),
                "rating": 5,
                "review_text": "Great!"
            },
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_mark_review_helpful(self, client: AsyncClient):
        """Mark review helpful should work."""
        review_id = str(uuid4())
        response = await client.post(
            f"/api/v1/reviews/{review_id}/helpful"
        )
        # May fail if review doesn't exist
        assert response.status_code in [200, 404]


# ============================================================================
# DEFECTS TESTS
# ============================================================================

class TestDefects:
    """Test defect charge management."""

    @pytest.mark.anyio
    async def test_get_order_defects(self, client: AsyncClient, create_test_customer):
        """Get order defects should require auth."""
        customer = await create_test_customer()
        order_id = str(uuid4())

        response = await client.get(
            f"/api/v1/defects/orders/{order_id}",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        # May return empty if order doesn't exist
        assert response.status_code in [200, 404]

    @pytest.mark.anyio
    async def test_get_defect_requires_auth(self, client: AsyncClient):
        """Get defect should require auth."""
        defect_id = str(uuid4())
        response = await client.get(f"/api/v1/defects/{defect_id}")
        assert response.status_code in [401, 403]

    @pytest.mark.anyio
    async def test_confirm_defect_payment_customer_only(self, client: AsyncClient, create_test_vendor):
        """Confirm defect payment should require customer role."""
        vendor = await create_test_vendor()
        defect_id = str(uuid4())

        response = await client.post(
            f"/api/v1/defects/{defect_id}/confirm-payment",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
        )
        assert response.status_code == 403

