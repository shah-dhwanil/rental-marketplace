import { Hono } from "hono";
import { z } from "zod";
import { render } from "@react-email/render";
import * as React from "react";

import { getTemplateConfig } from "./config/templates";
import { getTemplateEntry } from "./registry";
import { sendEmail } from "./services/mailer";
import {
  AttachmentSchema,
  AttachmentFetchError,
  resolveAttachments,
} from "./attachments/resolver";
import { findById, insertEmailHistory } from "./database/history";

// RFC 4122 UUID (any version)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const app = new Hono();

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

/** Accepts a single email address or a non-empty array of addresses. */
const EmailAddressField = z.union([
  z.string().email(),
  z.array(z.string().email()).min(1),
]);

const SendEmailRequestSchema = z.object({
  to: EmailAddressField,
  cc: EmailAddressField.optional(),
  bcc: EmailAddressField.optional(),
  replyTo: z.string().email().optional(),
  type: z.string().min(1, "type is required"),
  data: z.record(z.unknown()).optional().default({}),
  attachments: AttachmentSchema.array().optional().default([]),
  headers: z.record(z.string()).optional().default({}),
  tags: z.string().array().optional().default([]),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** Health check */
app.get("/health", (c) => c.json({ status: "ok" }));

/**
 * POST /send
 *
 * Body:
 * ```json
 * { "to": "user@example.com", "type": "welcome", "data": { "name": "Alice" } }
 * ```
 */
app.post("/send", async (c) => {
  // 1. Parse & validate top-level request body
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parseResult = SendEmailRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      {
        error: "Request validation failed",
        issues: parseResult.error.flatten(),
      },
      400
    );
  }

  const {
    to,
    cc,
    bcc,
    replyTo,
    type,
    data,
    attachments: rawAttachments,
    headers,
    tags,
  } = parseResult.data;

  // 2. Idempotency — optional Idempotency-Key header (must be a UUID)
  const rawIdempotencyKey = c.req.header("Idempotency-Key");
  console.log(`[email_service] Received send request: type=${type} to=${JSON.stringify(to)} idempotencyKey=${rawIdempotencyKey}`);
  let idempotencyKey: string | undefined;
  if (rawIdempotencyKey !== undefined) {
    if (!UUID_RE.test(rawIdempotencyKey)) {
      return c.json({ error: "Idempotency-Key must be a valid UUID" }, 400);
    }
    idempotencyKey = rawIdempotencyKey;
    try {
      const existing = await findById(idempotencyKey);
      if (existing) {
        if (existing.status === "sent") {
          return c.json({ success: true, messageId: existing.message_id });
        }
        return c.json(
          { error: existing.error_message ?? "Previous send attempt failed" },
          422
        );
      }
    } catch (err) {
      // DB is unavailable — log and continue; idempotency is best-effort
      console.error("[email_service] DB idempotency check failed:", err);
    }
  }

  // 3. Look up the template config in templates.toml
  const templateConfig = getTemplateConfig(type);
  if (!templateConfig) {
    return c.json(
      {
        error: `Unknown email type: "${type}". Check templates.toml for registered types.`,
      },
      404
    );
  }

  // 4. Look up the component & schema in the registry
  const entry = getTemplateEntry(templateConfig.component);
  if (!entry) {
    return c.json(
      {
        error: `Component "${templateConfig.component}" is configured in templates.toml but not registered in the template registry.`,
      },
      500
    );
  }

  // 5. Validate the data payload against the component's Zod schema
  const dataValidation = entry.schema.safeParse(data);
  if (!dataValidation.success) {
    return c.json(
      {
        error: "Template data validation failed",
        issues: dataValidation.error.flatten(),
      },
      400
    );
  }

  // 6. Resolve attachments (fetch URL-based ones)
  let attachments: Awaited<ReturnType<typeof resolveAttachments>>;
  try {
    attachments = await resolveAttachments(rawAttachments);
  } catch (err) {
    if (err instanceof AttachmentFetchError) {
      return c.json({ error: err.message, url: err.url }, 400);
    }
    console.error("[email_service] Attachment resolve error:", err);
    return c.json({ error: "Failed to resolve attachments" }, 500);
  }

  // 7. Render the React Email component to HTML
  let html: string;
  try {
    html = await render(
      React.createElement(entry.component, dataValidation.data)
    );
  } catch (err) {
    console.error("[email_service] Template render error:", err);
    return c.json({ error: "Failed to render email template" }, 500);
  }

  // 8. Send via Nodemailer
  const firstRecipient = Array.isArray(to) ? to[0]! : to;
  try {
    const info = await sendEmail({
      to,
      cc,
      bcc,
      replyTo,
      subject: templateConfig.subject,
      html,
      attachments,
      headers,
      tags,
    });
    // Persist audit row (best-effort — DB errors do not affect the response)
    try {
      await insertEmailHistory({
        id: idempotencyKey,
        message_id: info.messageId,
        recipient_email: firstRecipient,
        email_type: type,
        status: "sent",
      });
    } catch (dbErr) {
      console.error("[email_service] DB history insert failed:", dbErr);
    }
    return c.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("[email_service] SMTP send error:", err);
    // Persist failure audit row so the idempotency key captures the failure
    try {
      await insertEmailHistory({
        id: idempotencyKey,
        recipient_email: firstRecipient,
        email_type: type,
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
      });
    } catch (dbErr) {
      console.error("[email_service] DB history insert (failure) failed:", dbErr);
    }
    return c.json({ error: "Failed to send email" }, 500);
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const port = Number(process.env.PORT ?? 3000);
console.log(`[email_service] Listening on port ${port}`);

export { app };

export default {
  port,
  fetch: app.fetch,
};
