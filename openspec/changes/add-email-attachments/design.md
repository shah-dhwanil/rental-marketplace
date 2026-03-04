# Design: Email Attachments

## Overview

Attachments are added as an optional `attachments` array on the existing `POST /send` request body. The `mailer.ts` `SendEmailOptions` interface is extended to carry the attachments through to Nodemailer.

---

## API Changes

### `POST /send` — extended request body

```json
{
  "to": "user@example.com",
  "type": "order_confirmation",
  "data": { ... },
  "attachments": [
    {
      "filename": "invoice.pdf",
      "content": "<base64-encoded-string>",
      "encoding": "base64",
      "contentType": "application/pdf"
    },
    {
      "filename": "terms.pdf",
      "url": "https://internal-storage/terms.pdf",
      "contentType": "application/pdf"
    }
  ]
}
```

Each attachment is **one of**:
- **Inline** (`content` + `encoding`): content already available as a base64 (or `utf-8`) string.
- **URL-fetched** (`url`): the service fetches the resource via HTTP at send time and attaches the response body.

`filename` and `contentType` are required for all variants.

---

## Zod Schema

```ts
const AttachmentSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("inline"),
    filename: z.string().min(1),
    content: z.string().min(1),
    encoding: z.enum(["base64", "utf-8"]).default("base64"),
    contentType: z.string().min(1),
  }),
  z.object({
    source: z.literal("url"),
    filename: z.string().min(1),
    url: z.string().url(),
    contentType: z.string().min(1),
  }),
]);
```

`attachments` is `AttachmentSchema.array().optional()` on the main `SendEmailRequestSchema`.

---

## Module Changes

### `src/services/mailer.ts`
- Add `attachments?: NormalizedAttachment[]` to `SendEmailOptions`.
- Map to Nodemailer's `attachments` field in `sendMail`.

### `src/attachments/resolver.ts` (new)
- Export `resolveAttachments(raw: AttachmentInput[]) → Promise<NormalizedAttachment[]>`.
- For `source: "inline"`: pass through `content` + `encoding` directly.
- For `source: "url"`: `fetch(url)` and convert the response body to a `Buffer`.
- Returns an array compatible with Nodemailer's [`Attachment`](https://nodemailer.com/message/attachments/) type.

### `src/index.ts`
- Extend `SendEmailRequestSchema` with the optional `attachments` field.
- Call `resolveAttachments` before calling `sendEmail`.
- Pass resolved attachments into `sendEmail`.

---

## Error Handling
- If a URL attachment fetch fails (non-2xx or network error) → return `400` with details of which URL failed.
- Invalid base64 content is passed through to Nodemailer as-is; decoding errors will surface as SMTP errors → return `500`.
- Attachment size is not explicitly limited by the service; Gmail's 25 MB per-message limit applies upstream.
