# Proposal: API Idempotency and Database Audit Logging

## Motivation

The email service's `POST /send` endpoint currently has no protection against duplicate sends. If a caller retries due to a network timeout or transient error, the same email may be delivered multiple times. Additionally, there is no persistent record of email delivery attempts, making debugging production issues and satisfying audit requirements difficult.

The `email_history` table was created in `V2__email_history.sql` to support exactly this use case, but nothing writes to it yet.

## Goal

1. **Idempotency** — Accept an optional `Idempotency-Key` header on `POST /send`. The key must be a UUID and is stored directly as the `id` of the `email_history` row. If the same key is submitted more than once, return the cached outcome (success or failure) without re-sending the email. No schema migration is required.

2. **Database audit logging** — After every send attempt (success or failure), persist a row to the `email_history` table. This provides a searchable history of all emails dispatched from the platform.

3. **Connection pooling** — Use a `pg` `Pool` (node-postgres) for all database access so that connections are reused across requests rather than opened and closed per call.

## Non-goals

- This change does not add authentication to the email service API.
- This change does not add retry logic on the email service side; idempotency is a caller-side concern.
- Modifications to other microservices are out of scope.
