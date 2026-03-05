# Implementation Plan: Email Service

This plan acts as a checklist for development and follows the `openspec` tracking conventions. Wait for `/opsx:apply` to write code.

## 1. Setup Environment
- [x] Create a new Bun project in `backend/email_service` (`bun init -y`).
- [x] Add dependencies for API, React Email, Nodemailer, and Validation.
  - `bun add hono zod nodemailer @react-email/render @react-email/components react react-dom`
  - Setup necessary dev dependencies if needed (`@types/node`, `@types/react`, `@types/nodemailer`).
- [x] Create basic `tsconfig.json` for React/JSX support via Bun.

## 2. Implement Configuration & Template Mapping
- [x] Create a `templates.toml` file setting up mappings like `welcome` and `order_confirmation` to specific component names and subjects.
- [x] Create a parsing module (`src/config/templates.ts`) to read and parse `templates.toml` into memory on startup using Bun's native TOML support or `toml` package.

## 3. Develop Email Templates & Schemas
- [x] Create a `WelcomeEmail` React component in `src/templates/WelcomeEmail.tsx`.
- [x] Export a `WelcomeEmailSchema` (using Zod) in the same file to validate the props (e.g., `{ name: z.string() }`).
- [x] Do the same for `OrderConfirmationEmail` and `PasswordResetEmail`.
- [x] Implement a template registry (`src/templates/registry.ts`) that maps string component names to the actual imported React components & Zod schemas.

## 4. Setup Nodemailer Service
- [x] Add `src/services/mailer.ts` that configures Nodemailer using environment variables for Gmail (`GMAIL_SMTP_USER`, `GMAIL_SMTP_PASS`).
- [x] Create a `sendEmail` function wrapping `nodemailer.createTransport().sendMail()`.

## 5. Implement Hono API Endpoint
- [x] Create `src/index.ts` initializing a Hono app.
- [x] Add a `POST /send` endpoint.
- [x] In the endpoint, parse the incoming body (`to`, `type`, `data`).
- [x] Find the template mapping from `templates.toml`.
- [x] Lookup the component and Zod schema in the `registry`.
- [x] Validate `data` with the Zod schema. If validation fails, return 400.
- [x] Render the React component to an HTML string using `@react-email/render`.
- [x] Send the email via `mailer.ts` with the subject mapped from `templates.toml`.
- [x] Return a success JSON response.

## 6. Testing & Wrap-up
- [ ] Complete the setup by making sure the server runs (`bun run start`).
- [ ] Verify the endpoint is accessible from the Docker/internal network (set up basic `compose.yaml` additions if needed later, but standard is `index.ts` binding to an env variable port or `3000`).
