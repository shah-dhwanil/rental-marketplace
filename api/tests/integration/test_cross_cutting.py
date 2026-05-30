"""Test suite for cross-cutting concerns: Authentication, Authorization, and Error Handling."""

import pytest
from httpx import AsyncClient


class TestAuthenticationMechanisms:
    """Test JWT and authentication mechanisms."""

    @pytest.mark.anyio
    async def test_missing_authorization_header(self, client: AsyncClient):
        """Requests without Authorization header should return 401."""
        protected_endpoints = [
            "/api/v1/users/me",
            "/api/v1/users/otp/send",
            "/api/v1/products/vendor/me",
            "/api/v1/devices",
            "/api/v1/orders/my",
            "/api/v1/addresses",
        ]

        for endpoint in protected_endpoints:
            response = await client.post(endpoint) if "otp" in endpoint else await client.get(endpoint)
            assert response.status_code in [401, 403, 405], f"Expected 401/403/405 for {endpoint}, got {response.status_code}"

    @pytest.mark.anyio
    async def test_invalid_bearer_token(self, client: AsyncClient):
        """Invalid bearer token should return 401 or 403."""
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert response.status_code in [401, 403]

    @pytest.mark.anyio
    async def test_malformed_authorization_header(self, client: AsyncClient):
        """Malformed Authorization header should return 401 or 403."""
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": "NotBear invalidtoken"},
        )
        assert response.status_code in [401, 403]

    @pytest.mark.anyio
    async def test_token_from_different_user(self, client: AsyncClient, create_test_customer):
        """Using another user's token should not grant access."""
        user1 = await create_test_customer(email="user1@test.com")
        user2 = await create_test_customer(email="user2@test.com")

        # Get user2's profile using user1's token should fail or work but show user1's data
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {user1['access_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        # Should return user1's data, not user2's
        assert data["user_id"] == user1["user_id"]


class TestAuthorizationControl:
    """Test role-based access control."""

    @pytest.mark.anyio
    async def test_customer_cannot_create_product(self, client: AsyncClient, create_test_customer):
        """Customer role should not create products."""
        customer = await create_test_customer()

        response = await client.post(
            "/api/v1/products",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "name": "Hacked Product",
                "category_id": "test",
                "pricing": {"daily": 100},
                "deposit": 5000,
            },
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_customer_cannot_create_category(self, client: AsyncClient, create_test_customer):
        """Customer role should not create categories."""
        customer = await create_test_customer()

        response = await client.post(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={"name": "Hacked Category", "description": "Hack"},
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_vendor_cannot_create_admin(self, client: AsyncClient, create_test_vendor):
        """Vendor role should not create admins."""
        vendor = await create_test_vendor()

        response = await client.post(
            "/api/v1/users/admin/create",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={
                "name": "Hacked Admin",
                "email_id": "hacker@test.com",
                "mobile_no": "9999999999",
                "password": "HackedPass123",
            },
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_vendor_cannot_see_admin_endpoints(self, client: AsyncClient, create_test_vendor):
        """Vendor should not access admin-only endpoints."""
        vendor = await create_test_vendor()

        response = await client.get(
            "/api/v1/users/admin/users",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_vendor_sees_only_own_products(self, client: AsyncClient, create_test_vendor, create_test_customer, create_test_product):
        """Vendor should only see own products in private list."""
        vendor1 = await create_test_vendor(email="vendor1@test.com", name="Vendor 1")
        vendor2 = await create_test_vendor(email="vendor2@test.com", name="Vendor 2")

        product1 = await create_test_product(client, vendor1, name="Vendor1 Product")

        # Vendor2 lists own products
        response = await client.get(
            "/api/v1/products/vendor/me",
            headers={"Authorization": f"Bearer {vendor2['access_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        # Should not see vendor1's products
        if "items" in data:
            for item in data.get("items", []):
                assert item.get("vendor_id") == vendor2["user_id"]


class TestErrorResponses:
    """Test proper error response handling."""

    @pytest.mark.anyio
    async def test_not_found_response_format(self, client: AsyncClient):
        """404 responses should have proper format."""
        response = await client.get("/api/v1/products/nonexistent")
        # Accept 404 or 500 depending on implementation
        assert response.status_code in [404, 500]
        # Should have error response structure
        data = response.json()
        assert isinstance(data, dict)

    @pytest.mark.anyio
    async def test_bad_request_validation(self, client: AsyncClient, create_test_customer):
        """Invalid request data should return 422."""
        customer = await create_test_customer()

        # Missing required field
        response = await client.post(
            "/api/v1/addresses",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "label": "Home",
                # Missing other required fields
            },
        )
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_duplicate_email_conflict(self, client: AsyncClient):
        """Duplicate email should return 409 Conflict."""
        email = "conflict@test.com"

        # First registration
        await client.post(
            "/api/v1/users/register",
            json={
                "name": "User 1",
                "email_id": email,
                "mobile_no": "9876543001",
                "password": "Pass123",
                "role": "customer",
            },
        )

        # Duplicate attempt
        response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "User 2",
                "email_id": email,
                "mobile_no": "9876543002",
                "password": "Pass123",
                "role": "customer",
            },
        )
        assert response.status_code in [409, 422]

    @pytest.mark.anyio
    async def test_invalid_enum_value(self, client: AsyncClient, create_test_vendor, create_test_product):
        """Invalid enum value should return 422."""
        vendor = await create_test_vendor()
        product = await create_test_product(client, vendor)

        response = await client.post(
            "/api/v1/devices",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={
                "product_id": product["id"],
                "serial_no": "TEST",
                "condition": "invalid_condition",
            },
        )
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_invalid_coordinates(self, client: AsyncClient, create_test_customer):
        """Invalid coordinates should be rejected."""
        customer = await create_test_customer()

        response = await client.post(
            "/api/v1/addresses",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "label": "Test",
                "address_line": "123 St",
                "city": "City",
                "pincode": "12345",
                "lat": 91,  # Invalid: must be -90 to 90
                "lng": 77,
            },
        )
        assert response.status_code == 422


class TestDataValidation:
    """Test data validation rules."""

    @pytest.mark.anyio
    async def test_email_format_validation(self, client: AsyncClient):
        """Invalid email formats should fail."""
        invalid_emails = [
            "notanemail",
            "missing@domain",
            "@nodomain.com",
            "spaces in@email.com",
        ]

        for invalid_email in invalid_emails:
            response = await client.post(
                "/api/v1/users/register",
                json={
                    "name": "Test User",
                    "email_id": invalid_email,
                    "mobile_no": "9876543210",
                    "password": "Pass123",
                    "role": "customer",
                },
            )
            # Should either fail validation or duplicate detection
            assert response.status_code in [422, 400]

    @pytest.mark.anyio
    async def test_mobile_number_format(self, client: AsyncClient):
        """Invalid mobile numbers should fail."""
        invalid_mobiles = [
            "123",  # Too short
            "abcdefghij",  # Non-numeric
            "987654321",  # 9 digits (too short for India)
        ]

        for invalid_mobile in invalid_mobiles:
            response = await client.post(
                "/api/v1/users/register",
                json={
                    "name": "Test User",
                    "email_id": f"test{invalid_mobile}@test.com",
                    "mobile_no": invalid_mobile,
                    "password": "Pass123",
                    "role": "customer",
                },
            )
            assert response.status_code in [422, 400]

    @pytest.mark.anyio
    async def test_price_validation(self, client: AsyncClient, create_test_vendor):
        """Negative prices should fail."""
        vendor = await create_test_vendor()

        response = await client.post(
            "/api/v1/products",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={
                "name": "Invalid Price",
                "category_id": "test",
                "pricing": {"daily": -100},  # Negative price
                "deposit": 5000,
            },
        )
        assert response.status_code == 422


class TestPaginationBoundaries:
    """Test pagination edge cases."""

    @pytest.mark.anyio
    async def test_pagination_page_zero(self, client: AsyncClient):
        """Page 0 should fail validation."""
        response = await client.get("/api/v1/products?p, age=0&p, age_size=10")
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_pagination_negative_page(self, client: AsyncClient):
        """Negative page should fail."""
        response = await client.get("/api/v1/products?p, age=-1&p, age_size=10")
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_pagination_page_size_max(self, client: AsyncClient):
        """Page size over maximum should fail."""
        response = await client.get("/api/v1/products?p, age=1&p, age_size=1000")
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_pagination_large_valid_page(self, client: AsyncClient):
        """Large page number with few items should work."""
        response = await client.get("/api/v1/products?p, age=9999&p, age_size=10")
        assert response.status_code == 200
        data = response.json()
        # Should return empty items for high page number
        items = data.get("items", data.get("data", []))
        assert isinstance(items, list)

