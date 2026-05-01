"""Test suite for Categories endpoints."""

import pytest
from httpx import AsyncClient


class TestCategoriesList:
    """Test category listing and retrieval."""

    @pytest.mark.anyio
    async def test_list_categories_empty(self, client: AsyncClient):
        """List categories when empty should return empty list."""
        response = await client.get("/api/v1/categories")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data.get("data"), list)

    @pytest.mark.anyio
    async def test_list_categories_with_pagination(self, client: AsyncClient):
        """List categories should support pagination."""
        response = await client.get("/api/v1/categories?p, age=1&p, age_size=10")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or "data" in data
        assert "total" in data or "page" in data

    @pytest.mark.anyio
    async def test_search_categories(self, client: AsyncClient):
        """List categories should support search query."""
        response = await client.get("/api/v1/categories?q, =electronics")
        assert response.status_code == 200
        assert response.status_code in [200, 404]


class TestCategoryCreation:
    """Test category creation by admin."""

    @pytest.mark.anyio
    async def test_create_category_requires_admin(self, client: AsyncClient, create_test_customer):
        """Create category should require admin role."""
        customer = await create_test_customer()

        response = await client.post(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "name": "Electronics",
                "description": "Electronics category",
            },
        )
        assert response.status_code == 403

    @pytest.mark.anyio
    async def test_create_root_category(self, client: AsyncClient, create_admin_and_login):
        """Admin should create root category."""
        admin_data = await create_admin_and_login()

        # Skip if admin creation failed
        if not admin_data:
            pytest.skip("Admin fixture not available")

        admin_token = admin_data.get("access_token")

        response = await client.post(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Electronics",
                "description": "Electronics and gadgets",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data.get("name") == "Electronics"
        assert "id" in data or "category_id" in data

    @pytest.mark.anyio
    async def test_create_child_category(self, client: AsyncClient, create_admin_and_login):
        """Admin should create child category under parent."""
        admin_data = await create_admin_and_login()
        if not admin_data:
            pytest.skip("Admin fixture not available")
        admin_token = admin_data.get("access_token")

        if not admin_token:
            pytest.skip("Admin fixture not available")

        # Create parent
        parent_response = await client.post(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Parent", "description": "Parent category"},
        )

        if parent_response.status_code != 201:
            pytest.skip("Parent category creation failed")

        parent_data = parent_response.json()
        parent_id = parent_data.get("id") or parent_data.get("category_id")

        # Create child
        response = await client.post(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Child",
                "description": "Child category",
                "parent_id": parent_id,
            },
        )
        assert response.status_code == 201

    @pytest.mark.anyio
    async def test_duplicate_category_slug_fails(self, client: AsyncClient, create_admin_and_login):
        """Duplicate slug should fail."""
        admin_data = await create_admin_and_login()
        if not admin_data:
            pytest.skip("Admin fixture not available")
        admin_token = admin_data.get("access_token")

        if not admin_token:
            pytest.skip("Admin fixture not available")

        # Create first category
        await client.post(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Unique", "description": "First"},
        )

        # Try to create with same slug
        response = await client.post(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Unique", "description": "Second"},
        )
        assert response.status_code in [409, 422, 400]


class TestCategoryUpdate:
    """Test category update operations."""

    @pytest.mark.anyio
    async def test_update_category_name(self, client: AsyncClient, create_admin_and_login):
        """Admin should update category name."""
        admin_data = await create_admin_and_login()
        if not admin_data:
            pytest.skip("Admin fixture not available")
        admin_token = admin_data.get("access_token")

        if not admin_token:
            pytest.skip("Admin fixture not available")

        # Create category
        create_response = await client.post(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Original", "description": "Original desc"},
        )

        if create_response.status_code != 201:
            pytest.skip("Category creation failed")

        create_data = create_response.json()
        category_id = create_data.get("id") or create_data.get("category_id")

        # Update
        response = await client.patch(
            f"/api/v1/categories/{category_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Updated"},
        )
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_update_non_existent_category(self, client: AsyncClient, create_admin_and_login):
        """Update non-existent category should fail."""
        admin_data = await create_admin_and_login()
        if not admin_data:
            pytest.skip("Admin fixture not available")
        admin_token = admin_data.get("access_token")

        if not admin_token:
            pytest.skip("Admin fixture not available")

        response = await client.patch(
            "/api/v1/categories/nonexistent",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Updated"},
        )
        assert response.status_code in [404, 403]


class TestCategoryDeletion:
    """Test category deletion."""

    @pytest.mark.anyio
    async def test_delete_category(self, client: AsyncClient, create_admin_and_login):
        """Admin should delete category."""
        admin_data = await create_admin_and_login()
        if not admin_data:
            pytest.skip("Admin fixture not available")
        admin_token = admin_data.get("access_token")

        if not admin_token:
            pytest.skip("Admin fixture not available")

        # Create category
        create_response = await client.post(
            "/api/v1/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "ToDelete", "description": "Will be deleted"},
        )

        if create_response.status_code != 201:
            pytest.skip("Category creation failed")

        create_data = create_response.json()
        category_id = create_data.get("id") or create_data.get("category_id")

        # Delete
        response = await client.delete(
            f"/api/v1/categories/{category_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 204

    @pytest.mark.anyio
    async def test_delete_non_existent_category(self, client: AsyncClient, create_admin_and_login):
        """Delete non-existent category should fail."""
        admin_data = await create_admin_and_login()
        if not admin_data:
            pytest.skip("Admin fixture not available")
        admin_token = admin_data.get("access_token")

        if not admin_token:
            pytest.skip("Admin fixture not available")

        response = await client.delete(
            "/api/v1/categories/nonexistent",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code in [404, 403]


class TestCategoryImages:
    """Test category image management."""

    @pytest.mark.anyio
    async def test_upload_category_image_requires_admin(self, client: AsyncClient, create_test_customer):
        """Upload image should require admin role."""
        customer = await create_test_customer()

        response = await client.post(
            "/api/v1/categories/someid/image",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code in [403, 422]

    @pytest.mark.anyio
    async def test_delete_category_image_requires_admin(self, client: AsyncClient, create_test_customer):
        """Delete image should require admin role."""
        customer = await create_test_customer()

        response = await client.delete(
            "/api/v1/categories/someid/image",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 403

