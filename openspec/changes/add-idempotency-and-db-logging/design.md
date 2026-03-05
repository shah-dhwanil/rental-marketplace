# Design: API Idempotency and Database Audit Logging

## Overview

Two concerns are addressed in one change:

1. **Audit logging** — every `POST /send` attempt (successful or not) writes a row to `email_history`.
2. **Idempotency** — a caller may supply an `Idempotency-Key` header; the service deduplicates using the `email_history` table as the backing store.

---

## Database Changes

No migration is required. The existing `id UUID PRIMARY KEY DEFAULT uuidv7()` column in `email_history` doubles as the idempotency key. Callers supply a UUID in the `Idempotency-Key` header; the service inserts that value as the explicit `id`. The primary-key uniqueness constraint prevents duplicate rows.

---

## Connection Pooling

The email service does not currently use Postgres. A `pg` `Pool` will be added as a singleton.

### `src/database/pool.ts` (new)

```ts
import { Pool } from "pg";

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Missing required env var: DATABASE_URL");
    _pool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return _pool;
}
```

Pool size is controlled via `DB_POOL_MAX` (default `10`). `DATABASE_URL` follows the standard Postgres connection-string format (e.g. `postgres://user:pass@host:5432/db`).

---

## Query Layer

### `src/database/history.ts` (new)

Two functions:

```ts
export async function findById(
  id: string
): Promise<EmailHistoryRow | null>
```

Returns the row with a matching `id` (UUID), or `null` if not found. Used to replay a cached outcome.

```ts
export async function insertEmailHistory(
  row: InsertEmailHistoryInput
): Promise<void>
```

Inserts one row. When an idempotency key is provided it is used as the explicit `id`; otherwise Postgres generates a `uuidv7()` default. `ON CONFLICT (id) DO NOTHING` handles the race condition where two concurrent requests with the same key both reach the insert.

```ts
export interface InsertEmailHistoryInput {
  id?: string;                 // caller's idempotency UUID; omit to auto-generate
  message_id: string;          // SMTP message-id or synthetic UUID on failure
  recipient_email: string;     // first `to` address
  email_type: string;          // template type (e.g. "welcome")
  status: "sent" | "failed";
  error_message?: string;
}
```

---

## Idempotency Flow in `POST /send`

```
1. Parse & validate request body              (existing)
2. Extract Idempotency-Key header (must be a valid UUID when present)
3. If key present:
     row = findById(key)
     if row found and row.status == "sent"   → return 200 { success: true,  messageId: row.message_id }
     if row found and row.status == "failed" → return 422 { error: row.error_message }
4. Look up template & validate data           (existing)
5. Resolve attachments                        (existing)
6. Render HTML                                (existing)
7. Send via Nodemailer
8. On success:
     insertEmailHistory({ id: key, ..., status: "sent",   message_id: info.messageId })
     return 200 { success: true, messageId: info.messageId }
9. On failure:
     insertEmailHistory({ id: key, ..., status: "failed", error_message: err.message })
     return 500 { error: "Failed to send email" }
```

DB write errors in steps 8/9 are logged but do **not** change the HTTP response — the email was already sent or failed independently of the DB.

---

## API Changes

### Request — new optional header

| Header            | Type   | Description                                           |
|-------------------|--------|-------------------------------------------------------|
| `Idempotency-Key` | string | Caller-supplied unique key (max 255 chars). Optional. |

### Response — no breaking changes

Existing success/error shapes are preserved. The idempotency path returns the same shapes.

---

## Environment Variables

| Variable        | Required | Default | Description                        |
|-----------------|----------|---------|------------------------------------|
| `DATABASE_URL`  | Yes      | —       | Postgres connection string         |
| `DB_POOL_MAX`   | No       | `10`    | Max connections in the pool        |

---

## Error Handling

| Scenario                            | Response                                      |
|-------------------------------------|-----------------------------------------------|
| Idempotency key matched, sent       | `200` with original `messageId`               |
| Idempotency key matched, failed     | `422` with original `error_message`           |
| DB unavailable during key check     | Log error, continue without idempotency check |
| DB write fails after send           | Log error, return normal send response        |
