# Design: Email Service

## Architecture Overview
The `email_service` will be a standalone Bun-based microservice located in `backend/email_service/`.
It exposes a RESTful API powered by Hono.js for other backend services to request email deliveries.

### Core Technologies
- **Runtime:** `bun`
- **API Framework:** `hono`
- **Validation:** `zod`, `@hono/zod-validator` (optional, can just use pure Zod)
- **SMTP Transport:** `nodemailer` configured for Gmail SMTP
- **Email Templating:** `@react-email/components`, `@react-email/render`, `react`, `react-dom`
- **Config parser:** `@iarna/toml` or Bun's built-in TOML parsing (if available, `Bun.file().toml()`).

### Configuration Mapping
A `templates.toml` file will define the mapping between an "email type" and the corresponding template.
Example `templates.toml`:
```toml
[welcome]
component = "WelcomeEmail"
subject = "Welcome to Rental Marketplace"

[order_confirmation]
component = "OrderConfirmationEmail"
subject = "Your Order Confirmation"
```

### Dynamic Validation
Each React Email component will have an associated Zod schema exported alongside it (e.g. `WelcomeEmailSchema`).
When a request is received:
1. Lookup the email type in the TOML map.
2. Dynamically import or load the mapped component and its schema.
3. Validate the `data` payload using the strict component Zod schema.
4. Render the React component with the validated data via `@react-email/render`.
5. Send out via Nodemailer.

### API Endpoint
**POST /send**
Request Body:
```json
{
  "to": "user@example.com",
  "type": "welcome",
  "data": { "name": "Alice" }
}
```

## Error Handling
- Return `400 Bad Request` if payload validation fails (missing fields or wrong types).
- Return `404 Not Found` if the requested template type doesn't exist in the TOML file.
- Return `500 Internal Server Error` if SMTP delivery fails, keeping detailed errors in the service logs only.
