"""Test suite for User Authentication and Registration endpoints."""

import pytest
from httpx import AsyncClient
import json
import base64


class TestRegistration:
    """Test user registration flows for all roles."""

    @pytest.mark.anyio
    async def test_customer_registration_success(self, client: AsyncClient):
        """Customer registration step 1 should succeed."""
        response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "John Customer",
                "email_id": "john.cust@test.com",
                "mobile_no": "9876543210",
                "password": "SecurePass123",
                "role": "customer",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "temp_token" in data
        assert data["registration_step"] == 1

    @pytest.mark.anyio
    async def test_vendor_registration_step1(self, client: AsyncClient):
        """Vendor registration step 1 should succeed."""
        response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "Jane Vendor",
                "email_id": "jane.vendor@test.com",
                "mobile_no": "9876543211",
                "password": "SecurePass123",
                "role": "vendor",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "temp_token" in data
        assert data["registration_step"] == 1

    @pytest.mark.anyio
    async def test_duplicate_email_fails(self, client: AsyncClient):
        """Duplicate email with same role should fail."""
        email = "duplicate@test.com"

        # First registration
        await client.post(
            "/api/v1/users/register",
            json={
                "name": "User 1",
                "email_id": email,
                "mobile_no": "9876543212",
                "password": "SecurePass123",
                "role": "customer",
            },
        )

        # Second registration with same email and role
        response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "User 2",
                "email_id": email,
                "mobile_no": "9876543213",
                "password": "SecurePass123",
                "role": "customer",
            },
        )
        assert response.status_code == 409

    @pytest.mark.anyio
    async def test_duplicate_mobile_fails(self, client: AsyncClient):
        """Duplicate mobile with same role should fail."""
        mobile = "9876543214"

        # First registration
        await client.post(
            "/api/v1/users/register",
            json={
                "name": "User 1",
                "email_id": "user1@test.com",
                "mobile_no": mobile,
                "password": "SecurePass123",
                "role": "customer",
            },
        )

        # Second registration with same mobile and role
        response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "User 2",
                "email_id": "user2@test.com",
                "mobile_no": mobile,
                "password": "SecurePass123",
                "role": "customer",
            },
        )
        assert response.status_code == 409

    @pytest.mark.anyio
    async def test_invalid_email_format(self, client: AsyncClient):
        """Invalid email format should fail validation."""
        response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "Bad Email",
                "email_id": "not-an-email",
                "mobile_no": "9876543215",
                "password": "SecurePass123",
                "role": "customer",
            },
        )
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_invalid_mobile_format(self, client: AsyncClient):
        """Invalid mobile format should fail validation."""
        response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "Bad Mobile",
                "email_id": "bad@test.com",
                "mobile_no": "123",  # Too short
                "password": "SecurePass123",
                "role": "customer",
            },
        )
        assert response.status_code == 422

    @pytest.mark.anyio
    async def test_complete_customer_registration(self, client: AsyncClient):
        """Customer should complete registration in one step."""
        # Step 1: Register
        register_response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "Complete Customer",
                "email_id": "complete@test.com",
                "mobile_no": "9876543216",
                "password": "SecurePass123",
                "role": "customer",
            },
        )
        assert register_response.status_code == 201
        temp_token = register_response.json()["temp_token"]

        # Step 2: Complete registration
        complete_response = await client.post(
            "/api/v1/users/register/customer/complete",
            headers={"Authorization": f"Bearer {temp_token}"},
        )
        assert complete_response.status_code == 200
        data = complete_response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.anyio
    async def test_vendor_step2(self, client: AsyncClient):
        """Vendor step 2 should accept business information."""
        # Register
        register_response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "Step2 Vendor",
                "email_id": "step2@test.com",
                "mobile_no": "9876543217",
                "password": "SecurePass123",
                "role": "vendor",
            },
        )
        temp_token = register_response.json()["temp_token"]

        # Step 2
        response = await client.post(
            "/api/v1/users/register/vendor/complete",
            headers={"Authorization": f"Bearer {temp_token}"},
            json={
                "name": "Store Name",
                "gst_no": "29ABCDE1234F1Z5",
                "address": "123 Business St",
                "city": "Delhi",
                "pincode": "110001",
                "lat": 28.6139,
                "lng": 77.2090,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "temp_token" in data
        assert data["registration_step"] == 2


class TestAuthentication:
    """Test login and token management."""

    @pytest.mark.anyio
    async def test_customer_login_success(self, client: AsyncClient, create_test_customer):
        """Customer login should return access and refresh tokens."""
        customer = await create_test_customer(
            email="login@test.com", mobile="9876543218"
        )

        response = await client.post(
            "/api/v1/users/auth/login",
            json={
                "email_id": customer["email"],
                "password": "TestPassword123",
                "role": "customer",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    @pytest.mark.anyio
    async def test_invalid_password_fails(self, client: AsyncClient, create_test_customer):
        """Login with wrong password should fail."""
        customer = await create_test_customer(
            email="wrongpass@test.com", mobile="9876543219"
        )

        response = await client.post(
            "/api/v1/users/auth/login",
            json={
                "email_id": customer["email"],
                "password": "WrongPassword",
                "role": "customer",
            },
        )
        assert response.status_code in [401, 403]

    @pytest.mark.anyio
    async def test_invalid_email_fails(self, client: AsyncClient):
        """Login with non-existent email should fail."""
        response = await client.post(
            "/api/v1/users/auth/login",
            json={
                "email_id": "nonexistent@test.com",
                "password": "AnyPassword",
                "role": "customer",
            },
        )
        assert response.status_code in [401, 403, 404]

    @pytest.mark.anyio
    async def test_vendor_login_incomplete_registration(self, client: AsyncClient):
        """Vendor login with incomplete registration should return temp token with step."""
        # Register vendor (step 1 only)
        register_response = await client.post(
            "/api/v1/users/register",
            json={
                "name": "Incomplete Vendor",
                "email_id": "incomplete@test.com",
                "mobile_no": "9876543220",
                "password": "TestPassword123",
                "role": "vendor",
            },
        )

        # Try to login - should fail or return incomplete status
        response = await client.post(
            "/api/v1/users/auth/login",
            json={
                "email_id": "incomplete@test.com",
                "password": "TestPassword123",
                "role": "vendor",
            },
        )
        # Should either fail or return temp token with registration_step
        assert response.status_code in [200, 403]

    @pytest.mark.anyio
    async def test_refresh_token(self, client: AsyncClient, create_test_customer):
        """Refresh token should return new access token."""
        customer = await create_test_customer(
            email="refresh@test.com", mobile="9876543221"
        )

        response = await client.post(
            "/api/v1/users/auth/refresh",
            json={"refresh_token": customer["refresh_token"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        # New access token should be different from old one
        assert data["access_token"] != customer["access_token"]

    @pytest.mark.anyio
    async def test_invalid_refresh_token(self, client: AsyncClient):
        """Invalid refresh token should fail."""
        response = await client.post(
            "/api/v1/users/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )
        assert response.status_code in [401, 403, 422]

    @pytest.mark.anyio
    async def test_auth_me_endpoint(self, client: AsyncClient, create_test_customer):
        """GET /auth/me should return current user identity."""
        customer = await create_test_customer(
            email="authme@test.com", mobile="9876543222"
        )

        response = await client.get(
            "/api/v1/users/auth/me",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == customer["user_id"]
        assert data["role"] == "customer"
        assert data["email_id"] == customer["email"]

    @pytest.mark.anyio
    async def test_missing_auth_header(self, client: AsyncClient):
        """Request without auth header should fail with 401 or 403."""
        response = await client.get("/api/v1/users/auth/me")
        assert response.status_code in [401, 403]

    @pytest.mark.anyio
    async def test_invalid_token(self, client: AsyncClient):
        """Request with invalid token should fail."""
        response = await client.get(
            "/api/v1/users/auth/me",
            headers={"Authorization": "Bearer invalid.token"},
        )
        assert response.status_code in [401, 403]


class TestOTP:
    """Test OTP sending and verification."""

    @pytest.mark.anyio
    async def test_send_otp_phone(self, client: AsyncClient, create_test_customer):
        """Send OTP should work for phone verification."""
        customer = await create_test_customer(
            email="otp@test.com", mobile="9876543223"
        )

        response = await client.post(
            "/api/v1/users/otp/send",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={"otp_type": "phone"},
        )
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_send_otp_email(self, client: AsyncClient, create_test_customer):
        """Send OTP should work for email verification."""
        customer = await create_test_customer(
            email="otpemail@test.com", mobile="9876543224"
        )

        response = await client.post(
            "/api/v1/users/otp/send",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={"otp_type": "email"},
        )
        assert response.status_code == 200

    @pytest.mark.anyio
    async def test_send_otp_requires_auth(self, client: AsyncClient):
        """Send OTP without auth should fail."""
        response = await client.post(
            "/api/v1/users/otp/send",
            json={"otp_type": "phone"},
        )
        assert response.status_code in [401, 403]


class TestProfileManagement:
    """Test profile viewing and updating."""

    @pytest.mark.anyio
    async def test_get_own_profile(self, client: AsyncClient, create_test_customer):
        """Customer should be able to get own profile."""
        customer = await create_test_customer(
            email="getprofile@test.com", mobile="9876543225"
        )

        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == customer["name"]
        assert data["email_id"] == customer["email"]
        assert data["mobile_no"] == customer["mobile"]

    @pytest.mark.anyio
    async def test_update_own_profile(self, client: AsyncClient, create_test_customer):
        """Customer should be able to update own profile."""
        customer = await create_test_customer(
            email="updateprofile@test.com", mobile="9876543226"
        )

        response = await client.patch(
            "/api/v1/users/me",
            headers={"Authorization": f"Bearer {customer['access_token']}"},
            json={
                "name": "Updated Name",
                "address": "New Address, City",
                "city": "New City",
                "pincode": "100001",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["city"] == "New City"

    @pytest.mark.anyio
    async def test_get_profile_requires_auth(self, client: AsyncClient):
        """Get profile without auth should fail."""
        response = await client.get("/api/v1/users/me")
        assert response.status_code in [401, 403]

