
from collections.abc import AsyncGenerator, Generator
import os
from pathlib import Path
import subprocess
import sys

from asgi_lifespan import LifespanManager
from asyncpg import connect
from httpx import ASGITransport, AsyncClient
import pytest

# Ensure imports like "from api.app import app" work no matter where pytest is launched.
API_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(API_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(API_PROJECT_ROOT))

from api.app import app
from api.settings import get_settings
from api.settings.settings import Settings
from api.database import close_db_pool, init_db_pool, get_db_pool
from testcontainers.postgres import PostgresContainer

pytest_plugins = ["anyio"]


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="session")
async def postgres_container() -> Generator[PostgresContainer, None, None]:
    """
    Starts a Postgres container for the duration of the test session.
    """
    with PostgresContainer("ghcr.io/payloadcms/postgis-vector:latest") as postgres:
        db_url = postgres.get_connection_url(driver="")
        print(f"\n🚀 Starting Postgres container with URL: {db_url}")
        connection = await connect(host=postgres.get_container_host_ip(), port=postgres.get_exposed_port(5432), user=postgres.username, password=postgres.password, database=postgres.dbname)
        await connection.execute("CREATE SCHEMA IF NOT EXISTS rental;")  # Create schema for tests
        await connection.execute("CREATE EXTENSION IF NOT EXISTS postgis SCHEMA rental;")  # Ensure PostGIS is available
        await connection.execute("CREATE EXTENSION IF NOT EXISTS vector SCHEMA rental;")  # Ensure pgvector is available
        await connection.close()
        # 2. Run Flyway CLI via subprocess
        # Assumes Flyway CLI is installed and migration scripts are in ./migrations

        flyway_cmd = [
            "docker", "run",
            "-v", f"{os.getcwd()}/migrations:/flyway/sql",
            "flyway/flyway",
            f"-url=jdbc:postgresql://{postgres.get_container_host_ip()}:{postgres.get_exposed_port(5432)}/{postgres.dbname}",
            f"-user={postgres.username}",
            f"-password={postgres.password}",
            "-baselineOnMigrate=true",
            "-schemas=rental",
            "-locations=filesystem:/flyway/sql",
            "migrate"
        ]

        result = subprocess.run(flyway_cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise RuntimeError(f"Flyway migration failed: {result.stderr}")

        yield postgres


@pytest.fixture(scope="session")
def test_settings(postgres_container: PostgresContainer) -> Settings:
    """
    Creates a Settings object pointing to the test container.
    Also clears the global settings cache to ensure tests use test config.
    """
    # Clear any cached global settings first
    from api.settings.settings import _settings
    import api.settings.settings as settings_module

    settings_module._settings = None

    # Set environment variables to override .env file
    os.environ["RENTAL_POSTGRES__HOST"] = postgres_container.get_container_host_ip()
    os.environ["RENTAL_POSTGRES__PORT"] = str(
        postgres_container.get_exposed_port(5432)
    )
    os.environ["RENTAL_POSTGRES__USER"] = postgres_container.username
    os.environ["RENTAL_POSTGRES__PASSWORD"] = postgres_container.password
    os.environ["RENTAL_POSTGRES__NAME"] = postgres_container.dbname
    os.environ["RENTAL_POSTGRES__POOL_MIN_SIZE"] = "1"
    os.environ["RENTAL_POSTGRES__POOL_MAX_SIZE"] = "5"

    # Now create settings - it will read from env vars which override .env file
    settings = Settings()

    # Set as the global settings so get_settings() returns this instance
    settings_module._settings = settings

    print(f"\n🔧 Test database config:")
    print(f"   Host: {settings.POSTGRES.HOST}")
    print(f"   Port: {settings.POSTGRES.PORT}")
    print(f"   Database: {settings.POSTGRES.NAME}")
    print(f"   DSN: {settings.POSTGRES.dsn}")

    return settings


@pytest.fixture(scope="session")
async def db_pool(test_settings: Settings):
    """
    Initializes a database pool for each test function.
    Ensures clean state by closing any existing pool first.
    """
    # Close any existing pool to ensure clean state
    await close_db_pool()

    # Initialize new pool and connect
    pool = init_db_pool(test_settings.POSTGRES)
    await pool.connect()

    yield pool

    # Cleanup after test
    await pool.disconnect()
    await close_db_pool()


@pytest.fixture(scope="session")
async def client(test_settings: Settings, db_pool) -> AsyncGenerator[AsyncClient, None]:
    """
    Creates an async HTTP client for testing the FastAPI application.

    This overrides the application's settings to use the test database.
    """
    # Override get_settings dependency to use test settings
    app.dependency_overrides[get_settings] = lambda: test_settings

    # Create async client (does not trigger lifespan, but db_pool is already initialized)
    async with LifespanManager(app) as lifespan_app:
        async with AsyncClient(
            transport=ASGITransport(app=lifespan_app.app), base_url="http://rental.test"
        ) as c:
            yield c

    # Cleanup
    app.dependency_overrides.clear()


import json
import uuid
from typing import Optional


# ---------------------------------------------------------------------------
# Test Data Generators
# ---------------------------------------------------------------------------

class TestUserData:
    """Helper class to generate test user data."""

    BASE_EMAIL = "test"
    BASE_MOBILE = "9876543210"

    @staticmethod
    def unique_email(role: str, suffix: Optional[str] = None) -> str:
        """Generate unique email for each test."""
        sfx = suffix or str(uuid.uuid4())[:8]
        return f"{TestUserData.BASE_EMAIL}_{role}_{sfx}@test.com"

    @staticmethod
    def unique_mobile() -> str:
        """Generate unique mobile number for each test."""
        # Generate a 10-digit number
        random_part = str(int(uuid.uuid4().int % 9000000000 + 1000000000))
        return random_part[:10]

    @staticmethod
    def get_valid_gst() -> str:
        """Generate a valid GST number format: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit (1-9 or A-Z) + Z + 1 alphanumeric."""
        return "29ABCDE1234F1Z5"

    @staticmethod
    def get_valid_bank_details() -> dict:
        """Return valid bank details."""
        return {
            "account_number": "1234567890123",
            "ifsc_code": "SBIN0001234",
            "account_holder_name": "Test Account Holder",
            "bank_name": "State Bank of India"
        }

    @staticmethod
    def get_vendor_step2_data(name: str = "Test Vendor", lat: float = 28.6139, lng: float = 77.2090) -> dict:
        """Return vendor step 2 data."""
        return {
            "name": name,
            "gst_no": TestUserData.get_valid_gst(),
            "address": "123 Business Street, Commerce Plaza",
            "city": "Delhi",
            "pincode": "110001",
            "lat": lat,
            "lng": lng,
        }

    @staticmethod
    def get_delivery_partner_step2_data(name: str = "Test DP", lat: float = 28.6139, lng: float = 77.2090) -> dict:
        """Return delivery partner step 2 data."""
        return {
            "name": name,
            "gst_no": TestUserData.get_valid_gst(),
            "address": "456 Delivery Hub, Logistics Zone",
            "city": "Delhi",
            "pincode": "110002",
            "lat": lat,
            "lng": lng,
        }


# ---------------------------------------------------------------------------
# Helper Functions for Creating Test Users
# ---------------------------------------------------------------------------
@pytest.fixture
async def create_test_customer(client):
    """Factory fixture to create test customers."""
    async def _create_customer(
        email: Optional[str] = None,
        mobile: Optional[str] = None,
        name: str = "Test Customer",
        password: str = "TestPassword123",
    ) -> dict:
        """
        Create a fully authenticated customer user.

        Returns:
            dict with keys: user_id, email, mobile, access_token, refresh_token, name
        """
        email = email or TestUserData.unique_email("customer")
        mobile = mobile or TestUserData.unique_mobile()

        # Step 1: Register
        register_response = await client.post(
            "/api/v1/users/register",
            json={
                "name": name,
                "email_id": email,
                "mobile_no": mobile,
                "password": password,
                "role": "customer",
            },
        )
        assert register_response.status_code == 201, f"Register failed: {register_response.text}"
        register_data = register_response.json()
        temp_token = register_data["temp_token"]

        # Step 2: Complete customer registration
        complete_response = await client.post(
            "/api/v1/users/register/customer/complete",
            headers={"Authorization": f"Bearer {temp_token}"},
        )
        assert complete_response.status_code == 200, f"Complete failed: {complete_response.text}"
        tokens = complete_response.json()

        # Extract user_id from JWT (decode without verification for testing)
        import base64
        payload = tokens["access_token"].split(".")[1]
        # Add padding if needed
        payload += "=" * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload)
        user_data = json.loads(decoded)
        user_id = user_data.get("sub")

        return {
            "user_id": user_id,
            "email": email,
            "mobile": mobile,
            "name": name,
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
        }

    return _create_customer

@pytest.fixture
async def create_test_vendor(client):
    """Factory fixture to create test vendors."""
    async def _create_vendor(
        email: Optional[str] = None,
        mobile: Optional[str] = None,
        name: str = "Test Vendor",
        vendor_name: str = "Test Vendor Store",
        password: str = "TestPassword123",
        lat: float = 28.6139,
        lng: float = 77.2090,
    ) -> dict:
        """
        Create a fully authenticated vendor user (all 3 registration steps).

        Returns:
            dict with keys: user_id, email, mobile, name, vendor_name, access_token, refresh_token
        """
        email = email or TestUserData.unique_email("vendor")
        mobile = mobile or TestUserData.unique_mobile()

        # Step 1: Register
        register_response = await client.post(
            "/api/v1/users/register",
            json={
                "name": name,
                "email_id": email,
                "mobile_no": mobile,
                "password": password,
                "role": "vendor",
            },
        )
        assert register_response.status_code == 201, f"Register failed: {register_response.text}"
        register_data = register_response.json()
        temp_token_step1 = register_data["temp_token"]

        # Step 2: Business information
        step2_data = TestUserData.get_vendor_step2_data(vendor_name, lat, lng)
        step2_response = await client.post(
            "/api/v1/users/register/vendor/complete",
            headers={"Authorization": f"Bearer {temp_token_step1}"},
            json=step2_data,
        )
        assert step2_response.status_code == 200, f"Step 2 failed: {step2_response.text}"
        step2_data = step2_response.json()
        temp_token_step2 = step2_data["temp_token"]

        # Step 3: Bank details
        step3_response = await client.post(
            "/api/v1/users/register/vendor/bank",
            headers={"Authorization": f"Bearer {temp_token_step2}"},
            json={"bank_details": TestUserData.get_valid_bank_details()},
        )
        assert step3_response.status_code == 200, f"Step 3 failed: {step3_response.text}"
        tokens = step3_response.json()

        # Extract user_id from JWT
        import base64
        payload = tokens["access_token"].split(".")[1]
        payload += "=" * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload)
        user_data = json.loads(decoded)
        user_id = user_data.get("sub")

        return {
            "user_id": user_id,
            "email": email,
            "mobile": mobile,
            "name": name,
            "vendor_name": vendor_name,
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
        }

    return _create_vendor

@pytest.fixture
async def create_test_delivery_partner(client):
    """Factory fixture to create test delivery partners."""
    async def _create_delivery_partner(
        email: Optional[str] = None,
        mobile: Optional[str] = None,
        name: str = "Test DP",
        dp_name: str = "Test Delivery Partner",
        password: str = "TestPassword123",
        lat: float = 28.6139,
        lng: float = 77.2090,
    ) -> dict:
        """
        Create a fully authenticated delivery partner user (all 3 registration steps).

        Returns:
            dict with keys: user_id, email, mobile, name, dp_name, access_token, refresh_token
        """
        email = email or TestUserData.unique_email("delivery_partner")
        mobile = mobile or TestUserData.unique_mobile()

        # Step 1: Register
        register_response = await client.post(
            "/api/v1/users/register",
            json={
                "name": name,
                "email_id": email,
                "mobile_no": mobile,
                "password": password,
                "role": "delivery_partner",
            },
        )
        assert register_response.status_code == 201, f"Register failed: {register_response.text}"
        register_data = register_response.json()
        temp_token_step1 = register_data["temp_token"]

        # Step 2: Personal information
        step2_data = TestUserData.get_delivery_partner_step2_data(dp_name, lat, lng)
        step2_response = await client.post(
            "/api/v1/users/register/delivery-partner/complete",
            headers={"Authorization": f"Bearer {temp_token_step1}"},
            json=step2_data,
        )
        assert step2_response.status_code == 200, f"Step 2 failed: {step2_response.text}"
        step2_data = step2_response.json()
        temp_token_step2 = step2_data["temp_token"]

        # Step 3: Bank details
        step3_response = await client.post(
            "/api/v1/users/register/delivery-partner/bank",
            headers={"Authorization": f"Bearer {temp_token_step2}"},
            json={"bank_details": TestUserData.get_valid_bank_details()},
        )
        assert step3_response.status_code == 200, f"Step 3 failed: {step3_response.text}"
        tokens = step3_response.json()

        # Extract user_id from JWT
        import base64
        payload = tokens["access_token"].split(".")[1]
        payload += "=" * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload)
        user_data = json.loads(decoded)
        user_id = user_data.get("sub")

        return {
            "user_id": user_id,
            "email": email,
            "mobile": mobile,
            "name": name,
            "dp_name": dp_name,
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
        }

    return _create_delivery_partner

@pytest.fixture
async def create_admin_via_db(db_pool):
    """Factory fixture to create initial admin user directly via database."""
    async def _create_admin(
        name: str = "Initial Admin",
        email: Optional[str] = None,
        mobile: Optional[str] = None,
        password: str = "AdminPassword123",
    ) -> dict:
        """
        Create the initial admin user directly via database (for bootstrap).

        This bypasses the API and directly inserts into the users table.
        Returns both the user_id and login credentials.
        """
        from argon2 import PasswordHasher
        import uuid
        from datetime import datetime, timezone

        email = email or TestUserData.unique_email("admin")
        mobile = mobile or TestUserData.unique_mobile()
        user_id = str(uuid.uuid4())

        ph = PasswordHasher()
        hashed_password = ph.hash(password)

        async with db_pool.acquire() as connection:
            await connection.execute("SET search_path TO rental, public")
            await connection.execute(
                """
                INSERT INTO rental.users (id, name, email_id, mobile_no, password, role, is_verified, is_active, is_profile_complete, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                user_id,
                name,
                email,
                mobile,
                hashed_password,
                "admin",
                True,  # is_verified
                True,  # is_active
                True,  # is_profile_complete
                datetime.now(timezone.utc),
                datetime.now(timezone.utc),
            )

        return {
            "user_id": user_id,
            "email": email,
            "mobile": mobile,
            "name": name,
            "password": password,  # Return plain password for login in tests
        }

    return _create_admin


# ---------------------------------------------------------------------------
# Fixture Functions for Test Helpers
# ---------------------------------------------------------------------------

@pytest.fixture
async def create_test_product(client):
    """Factory fixture to create test products."""
    async def _create_product(vendor, name: str = "Test Product", pricing: dict = None, deposit: int = 5000):
        if pricing is None:
            pricing = {"daily": 100, "weekly": 500, "monthly": 1500}

        response = await client.post(
            "/api/v1/products",
            headers={"Authorization": f"Bearer {vendor['access_token']}"},
            json={
                "name": name,
                "description": f"Description for {name}",
                "category_id": "test_category",
                "pricing": pricing,
                "deposit": deposit,
                "defect_charge": 500,
                "is_active": True,
            },
        )
        if response.status_code == 201:
            return response.json()
        return None

    return _create_product


@pytest.fixture
async def create_admin_and_login(client, create_admin_via_db):
    """Factory fixture to create and login admin."""
    async def _create_and_login():
        admin_email = TestUserData.unique_email("admin")
        admin_password = "AdminPassword123"

        # Create admin directly in DB for testing
        admin_data = await create_admin_via_db(email=admin_email, password=admin_password)

        # Now login to get token
        response = await client.post(
            "/api/v1/users/auth/login",
            json={
                "email_id": admin_data["email"],
                "password": admin_data["password"],
                "role": "admin",
            },
        )

        if response.status_code == 200:
            tokens = response.json()
            # Extract user_id from JWT
            import base64
            payload = tokens["access_token"].split(".")[1]
            payload += "=" * (4 - len(payload) % 4)
            decoded = base64.urlsafe_b64decode(payload)
            user_data = json.loads(decoded)
            user_id = user_data.get("sub")

            return {
                "user_id": user_id,
                "email": admin_data["email"],
                "mobile": admin_data["mobile"],
                "name": admin_data["name"],
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
            }
        return None

    return _create_and_login
