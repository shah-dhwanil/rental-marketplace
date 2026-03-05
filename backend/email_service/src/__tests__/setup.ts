// This file is loaded by Bun before any test module is evaluated.
// It must set env vars needed by modules that validate them at import time (e.g. mailer.ts).
process.env.GMAIL_SMTP_USER ??= "test@gmail.com";
process.env.GMAIL_SMTP_PASS ??= "test-app-password";
process.env.EMAIL_FROM_NAME ??= "Test Mailer";
// Keeps the pool.ts module importable in tests; individual tests mock getPool() directly.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
