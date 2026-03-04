# Implementation Plan: Email Addressing Options

## 1. Extend Zod Schema in `src/index.ts`
- [x] Extract `EmailAddressField` as a reusable union of `z.string().email()` and `z.array(z.string().email()).min(1)`.
- [x] Replace the existing `to` field definition with `EmailAddressField`.
- [x] Add `cc: EmailAddressField.optional()` to `SendEmailRequestSchema`.
- [x] Add `bcc: EmailAddressField.optional()` to `SendEmailRequestSchema`.
- [x] Add `replyTo: z.string().email().optional()` to `SendEmailRequestSchema`.
- [x] Add `headers: z.record(z.string()).optional().default({})` to `SendEmailRequestSchema`.
- [x] Add `tags: z.string().array().optional().default([])` to `SendEmailRequestSchema`.

## 2. Extend `SendEmailOptions` in `src/services/mailer.ts`
- [x] Add optional `cc?: string | string[]` field.
- [x] Add optional `bcc?: string | string[]` field.
- [x] Add optional `replyTo?: string` field.
- [x] Add optional `headers?: Record<string, string>` field.
- [x] Add optional `tags?: string[]` field.

## 3. Map new fields in `sendEmail()` in `src/services/mailer.ts`
- [x] Pass `cc`, `bcc`, `replyTo` directly into `SendMailOptions`.
- [x] Convert `tags` array into `X-Tag-0`, `X-Tag-1`, … header entries.
- [x] Merge `headers` and tag-derived headers into the Nodemailer `headers` field.

## 4. Wire up new fields in `POST /send` handler (`src/index.ts`)
- [x] Destructure `cc`, `bcc`, `replyTo`, `headers`, `tags` from `parseResult.data`.
- [x] Pass all new fields into the `sendEmail(...)` call.

## 5. Manual Testing
- [ ] Send an email with `cc` and `bcc` recipients; verify delivery.
- [ ] Send with `replyTo`; verify reply address in received email.
- [ ] Send with custom `headers`; inspect raw message headers.
- [ ] Send with `tags`; verify `X-Tag-*` headers appear in raw message.
- [ ] Send without any new fields; verify backward compatibility.
