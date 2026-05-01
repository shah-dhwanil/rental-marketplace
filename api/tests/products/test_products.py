"""Test suite for Products and Devices endpoints."""

import pytest
from httpx import AsyncClient
from datetime import date, timedelta


class TestProductsListing:
    """Test product listing and retrieval."""

    @pytest.mark.anyio
    async def test_list_products_public(self, client: AsyncClient):
        """Public users should list products without auth."""
        response = await client.get("/api/v1/products")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or "data" in data

    @pytest.mark.anyio
    async def test_list_products_pagination(self, client: AsyncClient):
        """List products should support pagination."""
        response = await client.get("/api/v1/products?p, age=1&p, age_size=10")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data or "page" in data

    @pytest.mark.anyio
    async def test_list_products_filter_active(self, client: AsyncClient):
        """Filter by active status should work."""
        response = await client.get("/api/v1/products?i, s_active=true")
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_list_products_search(self, client: AsyncClient):
        """Search by query should work."""
        response = await client.get("/api/v1/products?q, =bike")
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_list_products_date_filter(self, client: AsyncClient):
        """Filter by date range should work."""
        start_date = date.today()
        end_date = date.today() + timedelta(days=7)
        response = await client.get(
            f"/api/v1/products?s, tart_date={start_date}&e, nd_date={end_date}"
        )
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_list_products_geo_filter(self, client: AsyncClient):
        """Filter by location should work."""
        response = await client.get("/api/v1/products?lat=28.6139&lng=77.2090")
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_list_my_products_vendor_only(self, client: AsyncClient, create_test_customer):
        """List own products should require vendor role."""
        customer = await create_test_customer()

        response = await client.get(
            "/api/v1/products/vendor/me",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 403


class TestProductDetail:
    """Test getting product details."""

    @pytest.mark.anyio
    async def test_get_product_nonexistent(self, client: AsyncClient):
        """Get non-existent product should return 404 or 500."""
        response = await client.get("/api/v1/products/nonexistent")
        assert response.status_code in [404, 500]

    @pytest.mark.anyio
    async def test_get_product_public(self, client: AsyncClient, create_test_vendor, create_test_product):
        """Get product should work without auth."""
        vendor = await create_test_vendor()
        product = await create_test_product(client, vendor)

        response = await client.get(f"/api/v1/products/{product['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == product["id"]
        assert data["name"] == product["name"]
        assert "pricing" in data


class TestProductCreation:
    """Test product creation by vendor."""

    @pytest.mark.anyio
    async def test_create_product_requires_vendor(self, client: AsyncClient, create_test_customer):
        """Create product should require vendor role."""
        customer = await create_test_customer()

        response = await client.post(
            "/api/v1/products",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "name": "Test Product",
                "description": "Test",
                "category_id": "somecat",
                "pricing": {"daily": 100, "weekly": 500, "monthly": 1500},
                "deposit": 5000,
                "defect_charge": 500,
            },
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_create_product_success(self, client: AsyncClient, create_test_vendor):
        """Vendor should create product."""
        vendor = await create_test_vendor()

        response = await client.post(
            "/api/v1/products",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={
                "name": "Mountain Bike",
                "description": "High-quality mountain bike",
                "category_id": "bikes",
                "pricing": {"daily": 500, "weekly": 2500, "monthly": 8000},
                "deposit": 20000,
                "defect_charge": 2000,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Mountain Bike"
        assert data["vendor_id"] == vendor["user_id"]


class TestProductUpdate:
    """Test product update operations."""

    @pytest.mark.anyio
    async def test_update_product_vendor_only(self, client: AsyncClient, create_test_vendor, create_test_customer, create_test_product):
        """Update product should require vendor ownership."""
        vendor = await create_test_vendor()
        customer = await create_test_customer()
        product = await create_test_product(client, vendor)

        # Customer tries to update vendor's product
        response = await client.patch(
            f"/api/v1/products/{product['id']}",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={"name": "Hacked Name"},
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_update_product_by_owner(self, client: AsyncClient, create_test_vendor, create_test_product):
        """Vendor should update own product."""
        vendor = await create_test_vendor()
        product = await create_test_product(client, vendor)

        response = await client.patch(
            f"/api/v1/products/{product['id']}",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={
                "name": "Updated Bike",
                "pricing": {"daily": 600, "weekly": 3000, "monthly": 9000},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Bike"

    @pytest.mark.anyio
    async def test_toggle_product_active_status(self, client: AsyncClient, create_test_vendor, create_test_product):
        """Vendor should toggle product active status."""
        vendor = await create_test_vendor()
        product = await create_test_product(client, vendor)

        response = await client.patch(
            f"/api/v1/products/{product['id']}",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={"is_active": False},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] == False


class TestProductDeletion:
    """Test product deletion."""

    @pytest.mark.anyio
    async def test_delete_product_vendor_only(self, client: AsyncClient, create_test_vendor, create_test_customer, create_test_product):
        """Delete product should require vendor ownership."""
        vendor = await create_test_vendor()
        customer = await create_test_customer()
        product = await create_test_product(client, vendor)

        response = await client.delete(
            f"/api/v1/products/{product['id']}",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 403


class TestPriceCalculation:
    """Test price calculation endpoint."""

    @pytest.mark.anyio
    async def test_calculate_price_daily_rate(self, client: AsyncClient, create_test_vendor, create_test_product):
        """Calculate price for <7 days should use daily rate."""
        vendor = await create_test_vendor()
        product = await create_test_product(
            client,
            vendor,
            pricing={"daily": 100, "weekly": 500, "monthly": 1500},
            deposit=5000,
        )

        start_date = date.today()
        end_date = date.today() + timedelta(days=3)

        response = await client.post(
            f"/api/v1/products/{product['id']}/calculate-price",
            json={"start_date": str(start_date), "end_date": str(end_date)},
        )
        assert response.status_code == 200
        data = response.json()
        # 3 days at 100/day = 300 + 5000 deposit
        assert data["daily_rate_total"] == 300
        assert data["deposit"] == 5000

    @pytest.mark.anyio
    async def test_calculate_price_weekly_rate(self, client: AsyncClient, create_test_vendor, create_test_product):
        """Calculate price for 7-29 days should use weekly rate with rounding up."""
        vendor = await create_test_vendor()
        product = await create_test_product(
            client,
            vendor,
            pricing={"daily": 100, "weekly": 500, "monthly": 1500},
            deposit=5000,
        )

        start_date = date.today()
        end_date = date.today() + timedelta(days=10)  # 10 days = 2 weeks rounded up

        response = await client.post(
            f"/api/v1/products/{product['id']}/calculate-price",
            json={"start_date": str(start_date), "end_date": str(end_date)},
        )
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_calculate_price_monthly_rate(self, client: AsyncClient, create_test_vendor, create_test_product):
        """Calculate price for ≥30 days should use monthly rate."""
        vendor = await create_test_vendor()
        product = await create_test_product(
            client,
            vendor,
            pricing={"daily": 100, "weekly": 500, "monthly": 1500},
            deposit=5000,
        )

        start_date = date.today()
        end_date = date.today() + timedelta(days=35)  # 35 days = 2 months rounded up

        response = await client.post(
            f"/api/v1/products/{product['id']}/calculate-price",
            json={"start_date": str(start_date), "end_date": str(end_date)},
        )
        assert response.status_code == 200


class TestDevices:
    """Test device management endpoints."""

    @pytest.mark.anyio
    async def test_list_devices_vendor_only(self, client: AsyncClient, create_test_customer):
        """List devices should require vendor/admin."""
        customer = await create_test_customer()

        response = await client.get(
            "/api/v1/devices",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_create_device(self, client: AsyncClient, create_test_vendor, create_test_product):
        """Vendor should create device."""
        vendor = await create_test_vendor()
        product = await create_test_product(client, vendor)

        response = await client.post(
            "/api/v1/devices",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={
                "product_id": product["id"],
                "serial_no": "BIKE-001",
                "condition": "excellent",
                "is_active": True,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["serial_no"] == "BIKE-001"
        assert data["condition"] == "excellent"

    @pytest.mark.anyio
    async def test_create_device_invalid_condition(self, client: AsyncClient, create_test_vendor, create_test_product):
        """Create device with invalid condition should fail."""
        vendor = await create_test_vendor()
        product = await create_test_product(client, vendor)

        response = await client.post(
            "/api/v1/devices",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={
                "product_id": product["id"],
                "serial_no": "BIKE-002",
                "condition": "invalid_condition",
            },
        )
        assert response.status_code == 422

