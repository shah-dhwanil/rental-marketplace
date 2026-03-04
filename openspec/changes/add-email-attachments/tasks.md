# Implementation Plan: Email Attachments

## 1. Define Attachment Zod Schema
- [x] In `src/index.ts`, add `AttachmentSchema` as a `z.discriminatedUnion` on `source` with two variants:
  - `"inline"`: `{ source, filename, content, encoding, contentType }`
  - `"url"`: `{ source, filename, url, contentType }`
- [x] Extend `SendEmailRequestSchema` with `attachments: AttachmentSchema.array().optional().default([])`.

## 2. Create Attachment Resolver Module
- [x] Create `src/attachments/resolver.ts`.
- [x] Export a `resolveAttachments` async function that accepts the validated attachments array.
- [x] For `source: "inline"` entries: return a Nodemailer-compatible object `{ filename, content, encoding, contentType }`.
- [x] For `source: "url"` entries: `fetch(url)`, check `response.ok` (throw a descriptive error if not), convert `response.arrayBuffer()` to a `Buffer`, return `{ filename, content: Buffer, contentType }`.

## 3. Extend Mailer Service
- [x] In `src/services/mailer.ts`, import Nodemailer's `Attachment` type.
- [x] Add `attachments?: Attachment[]` to the `SendEmailOptions` interface.
- [x] Pass `options.attachments` into the `SendMailOptions` object inside `sendEmail()`.

## 4. Wire Up in API Handler
- [x] In `src/index.ts` `POST /send`, after step 4 (data validation), call `resolveAttachments(parseResult.data.attachments)` inside a try/catch.
- [x] On fetch failure, return `400` with the URL and error message.
- [x] Pass the resolved attachments into `sendEmail({ ..., attachments })`.

## 5. Validation & Manual Testing
- [ ] Verify health check still returns 200.
- [ ] Send a `welcome` email without attachments to confirm no regression.
- [ ] Send an email with an `"inline"` base64 attachment (e.g., a small PDF or plain text file).
- [ ] Send an email with a `"url"` attachment pointing to a reachable URL.
- [ ] Verify a bad URL returns a 400 with a clear message.
