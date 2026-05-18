# Rental Marketplace

Full-stack rental marketplace with customer browsing/search + checkout, vendor inventory management, and admin moderation.

## Features

### Customer app
- Browse categories and listings, view detailed product pages
- Search (including geo-filtered experiences in the UI)
- Wishlist, checkout, Stripe payment flow, order confirmation
- Profile management (addresses, payment methods) and order history
- Reviews and defect reporting

### Vendor dashboard
- Create/edit products, manage inventory devices per product
- Create/edit promo codes
- View and manage orders

### Admin dashboard
- User management and order oversight
- Category/product/device management

## Tech Stack

### Frontend
- Bun + React 19 + React Router
- Tailwind CSS + shadcn/ui (+ Base UI)
- Zustand state management, Zod validation
- Leaflet for maps
- Stripe Elements (`@stripe/react-stripe-js`)

### Backend
- Python 3.12 + FastAPI + Uvicorn
- PostgreSQL (asyncpg) + pgvector (vector search)
- JWT auth (`python-jose`) + Argon2 password hashing
- Stripe (payments), Cloudinary (media uploads)
- OpenAI embeddings (used for semantic/vector search)
- structlog logging + optional Sentry integration

### Database & migrations
- PostgreSQL schema migrations via Flyway (`api/compose.yml`, `api/migrations/`)

## Repo Structure
- `src/`: frontend (React)
- `api/`: backend (FastAPI)

## Setup (Local Development)

### Prerequisites
- Bun (for the frontend)
- Python 3.12 (for the backend)
- PostgreSQL (for the backend)
- Docker (optional, for running Flyway migrations)

### 1) Backend (FastAPI)

1. Create a PostgreSQL database (and enable `pgvector` if you plan to use vector search).
2. Configure backend settings:
   - `api/config.toml` (defaults)
   - `api/.env` for secrets/overrides (preferred for local dev)

   The backend uses Pydantic settings with:
   - env prefix `RENTAL_`
   - nested delimiter `__`
   - `.env` + `config.toml` (env overrides TOML)

   Common env vars you may want:
   - `RENTAL_POSTGRES__HOST`, `RENTAL_POSTGRES__PORT`, `RENTAL_POSTGRES__NAME`, `RENTAL_POSTGRES__USER`, `RENTAL_POSTGRES__PASSWORD`
   - `RENTAL_JWT__SECRET_KEY`
   - `RENTAL_STRIPE__SECRET_KEY`, `RENTAL_STRIPE__PUBLISHABLE_KEY`, `RENTAL_STRIPE__WEBHOOK_SECRET`
   - `RENTAL_ENCRYPTION__PAYMENT_KEY` (32-byte key encoded as urlsafe base64)
   - `RENTAL_CLOUDINARY__CLOUD_NAME`, `RENTAL_CLOUDINARY__API_KEY`, `RENTAL_CLOUDINARY__API_SECRET`
   - `RENTAL_SEARCH__OPENAI_API_KEY` (if you enable embeddings)

3. Run migrations (Flyway):

   `api/compose.yml` defines a `flyway` service. Set Flyway env vars and run:

   ```bash
   cd api
   export FLYWAY_URL="jdbc:postgresql://localhost:5432/rental"
   export FLYWAY_USER="postgres"
   export FLYWAY_PASSWORD="postgres"
   docker compose run --rm flyway
   ```

4. Install Python dependencies and run the API.

   This repo includes `api/uv.lock`, so `uv` is the simplest way to sync deps:

   ```bash
   cd api
   # Install uv (if needed): https://astral.sh/uv
   curl -LsSf https://astral.sh/uv/install.sh | sh
   uv sync
   uv run python -m api.main
   ```

   The API defaults to `http://127.0.0.1:8000`.

Useful endpoints:
- `GET /health` health check
- `GET /docs` OpenAPI Swagger UI (FastAPI default)
- `GET /scalar` Scalar API reference UI
- API routes are under `/api/v1/*` (example: `/api/v1/users`)

### 2) Frontend (Bun + React)

Install dependencies:

```bash
bun install
```

Start the dev server:

```bash
bun dev
```

Frontend API configuration:
- The frontend currently hard-codes the API base URL in `src/lib/api.ts`. Update it to your local backend (for example `http://127.0.0.1:8000/api/v1`).
- The Stripe publishable key is currently hard-coded in `src/lib/stripe.ts`. Replace it with your own test key if needed.

Build for production:

```bash
bun run build
```

## Notes
- The frontend uses OpenStreetMap/Nominatim for geocoding (`src/lib/mappls.ts`); no API key is required.
