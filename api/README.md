## Rental Marketplace API (FastAPI)

Backend API for the Rental Marketplace project.

### Tech Stack
- Python 3.12
- FastAPI + Uvicorn
- PostgreSQL + asyncpg
- pgvector + OpenAI embeddings (semantic/vector search)
- Stripe (payments) + Cloudinary (media uploads)
- structlog + optional Sentry

### Configuration
Settings are loaded (highest → lowest priority) from:
1. Environment variables
2. `api/.env`
3. `api/config.toml`

Conventions:
- env prefix: `RENTAL_`
- nested delimiter: `__` (example: `RENTAL_POSTGRES__HOST`)

Common env vars:
- `RENTAL_POSTGRES__HOST`, `RENTAL_POSTGRES__PORT`, `RENTAL_POSTGRES__NAME`, `RENTAL_POSTGRES__USER`, `RENTAL_POSTGRES__PASSWORD`
- `RENTAL_JWT__SECRET_KEY`
- `RENTAL_STRIPE__SECRET_KEY`, `RENTAL_STRIPE__PUBLISHABLE_KEY`, `RENTAL_STRIPE__WEBHOOK_SECRET`
- `RENTAL_ENCRYPTION__PAYMENT_KEY`
- `RENTAL_CLOUDINARY__CLOUD_NAME`, `RENTAL_CLOUDINARY__API_KEY`, `RENTAL_CLOUDINARY__API_SECRET`
- `RENTAL_SEARCH__OPENAI_API_KEY`

### Database migrations (Flyway)
`api/compose.yml` includes a Flyway service that runs SQL migrations from `api/migrations/`.

```bash
cd api
export FLYWAY_URL="jdbc:postgresql://localhost:5432/rental"
export FLYWAY_USER="postgres"
export FLYWAY_PASSWORD="postgres"
docker compose run --rm flyway
```

### Install dependencies and run
This repo includes `api/uv.lock`. If you use `uv`, you can sync and run with:

```bash
cd api
# Install uv (if needed): https://astral.sh/uv
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync
uv run python -m api.main
```

The API runs on `http://127.0.0.1:8000` by default.

### Useful endpoints
- `GET /health`
- `GET /docs` (Swagger UI)
- `GET /scalar` (Scalar API reference UI)
- API routes live under `/api/v1/*`
