# Design: Email Addressing Options

## Overview

All new fields are optional additions to the existing `POST /send` body. Backward compatibility is preserved — a request with only `to`, `type`, and `data` continues to work unchanged.

---

## API Changes

### `POST /send` — extended request body

```json
{
  "to": ["alice@example.com", "bob@example.com"],
  "cc": ["manager@example.com"],
  "bcc": ["audit@internal.com"],
  "replyTo": "support@rentalmarketplace.example.com",
  "type": "order_confirmation",
  "data": { ... },
  "attachments": [...],
  "headers": {
    "X-Campaign-ID": "summer-promo-2026",
    "X-Order-ID": "ord_abc123"
  },
  "tags": ["transactional", "order"]
}
```

### Field definitions

| Field | Type | Description |
|---|---|---|
| `to` | `string \| string[]` | Primary recipient(s) — already exists |
| `cc` | `string \| string[]` | Carbon copy recipients (optional) |
| `bcc` | `string \| string[]` | Blind carbon copy recipients (optional) |
| `replyTo` | `string` | Address replies should be directed to (optional) |
| `headers` | `Record<string, string>` | Arbitrary custom headers (optional) |
| `tags` | `string[]` | Stored as `X-Tag: <value>` headers, one per tag (optional) |

---

## Zod Schema Changes (`src/index.ts`)

```ts
const EmailAddressField = z.union([
  z.string().email(),
  z.array(z.string().email()).min(1),
]);

const SendEmailRequestSchema = z.object({
  to: EmailAddressField,
  cc: EmailAddressField.optional(),
  bcc: EmailAddressField.optional(),
  replyTo: z.string().email().optional(),
  type: z.string().min(1),
  data: z.record(z.unknown()).optional().default({}),
  attachments: AttachmentSchema.array().optional().default([]),
  headers: z.record(z.string()).optional().default({}),
  tags: z.string().array().optional().default([]),
});
```

---

## Mailer Service Changes (`src/services/mailer.ts`)

Extend `SendEmailOptions`:

```ts
export interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  tags?: string[];
}
```

In `sendEmail()`, map the new fields into `SendMailOptions`:

- `cc`, `bcc`, `replyTo` → passed directly as Nodemailer fields.
- `headers` → spread into Nodemailer's `headers` map.
- `tags` → converted to additional `X-Tag` entries merged into `headers`.

```ts
const tagHeaders = Object.fromEntries(
  (options.tags ?? []).map((tag, i) => [`X-Tag-${i}`, tag])
);

const mailOptions: SendMailOptions = {
  ...,
  cc: options.cc,
  bcc: options.bcc,
  replyTo: options.replyTo,
  headers: { ...options.headers, ...tagHeaders },
};
```

---

## API Handler Changes (`src/index.ts`)

Destructure the new fields from `parseResult.data` and forward them to `sendEmail()`. No additional async resolution is required — unlike attachments, these are pure scalar values.

---

## Error Handling

- Zod handles validation; invalid emails in `cc`/`bcc`/`replyTo` return `400` with field-level error details.
- Invalid header values (non-string) are rejected by Zod's `z.record(z.string())`.
- No server-side changes needed for Gmail SMTP compatibility — all fields are standard SMTP.
