# Implementation Plan: API Idempotency and Database Audit Logging

This plan acts as a checklist for development and follows the `openspec` tracking conventions. Wait for `/opsx:apply` to write code.

## 1. Database Changes

- [x] No migration needed. The existing `id UUID PRIMARY KEY DEFAULT uuidv7()` column serves as the idempotency key. Confirm the column definition in `V2__email_history.sql` and proceed.

## 2. Add Postgres Dependency

- [x] Add `pg` and its types to the email service:
  - `bun add pg`
  - `bun add -d @types/pg`

## 3. Connection Pool Module

- [x] Create `backend/email_service/src/database/pool.ts`:
  - Export a `getPool()` function returning a singleton `pg.Pool`.
  - Read connection string from `DATABASE_URL` env var; throw on missing.
  - Pool options: `max` from `DB_POOL_MAX` (default `10`), `idleTimeoutMillis: 30_000`, `connectionTimeoutMillis: 5_000`.

## 4. Email History Query Module

- [x] Create `backend/email_service/src/database/history.ts`:
  - Define `InsertEmailHistoryInput` interface (`id?`, `message_id`, `recipient_email`, `email_type`, `status`, `error_message?`).
  - Implement `findById(id: string): Promise<EmailHistoryRow | null>` — `SELECT * FROM email_history WHERE id = $1`.
  - Implement `insertEmailHistory(input: InsertEmailHistoryInput): Promise<void>` — `INSERT INTO email_history (id, message_id, ...) VALUES (COALESCE($1, uuidv7()), $2, ...) ON CONFLICT (id) DO NOTHING`.
  - Both functions acquire a client from `getPool()` and release it in a `finally` block.

## 5. Wire Idempotency and Logging into `POST /send`

- [x] In `backend/email_service/src/index.ts`, after top-level validation:
  - Extract and validate the `Idempotency-Key` header (`c.req.header("Idempotency-Key")`); reject with `400` if present but not a valid UUID.
  - If key is present, call `findById(key)` wrapped in try/catch (log DB errors but don't block request).
  - If an existing row is found with `status === "sent"`, return `200 { success: true, messageId: row.message_id }`.
  - If an existing row is found with `status === "failed"`, return `422 { error: row.error_message }`.
- [x] After a successful `sendEmail()` call, call `insertEmailHistory({ id: idempotencyKey, status: "sent", message_id: info.messageId, ... })` wrapped in try/catch (log errors, don't alter response).
- [x] In the SMTP failure catch block, call `insertEmailHistory({ id: idempotencyKey, status: "failed", message_id: crypto.randomUUID(), error_message: err.message, ... })` wrapped in try/catch.

## 6. Environment Configuration

- [x] Document `DATABASE_URL` and `DB_POOL_MAX` in the email service `README.md` (or add to any existing env docs).
- [x] Add `DATABASE_URL` to `backend/compose.yaml` env section for the `email_service` container (pointing to the shared Postgres instance).

## 7. Tests

- [x] Add unit tests for `findById` and `insertEmailHistory` in `backend/email_service/src/__tests__/database.test.ts` using a mock `pg` pool.
- [x] Add integration / API tests for the idempotency behaviour:
  - First call with an `Idempotency-Key` succeeds and returns `messageId`.
  - Second call with the same key returns the cached `200` response without hitting the SMTP transport.
  - Call with a key whose prior attempt failed returns `422`.
