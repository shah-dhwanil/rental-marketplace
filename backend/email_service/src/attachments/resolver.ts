import type { Attachment } from "nodemailer/lib/mailer";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schema for a single attachment input
// ---------------------------------------------------------------------------
export const AttachmentSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("inline"),
    filename: z.string().min(1, "filename is required"),
    content: z.string().min(1, "content is required"),
    encoding: z.enum(["base64", "utf-8"]).default("base64"),
    contentType: z.string().min(1, "contentType is required"),
  }),
  z.object({
    source: z.literal("url"),
    filename: z.string().min(1, "filename is required"),
    url: z.string().url("url must be a valid URL"),
    contentType: z.string().min(1, "contentType is required"),
  }),
]);

export type AttachmentInput = z.infer<typeof AttachmentSchema>;

/**
 * Resolve attachment inputs into Nodemailer-compatible Attachment objects.
 *
 * - `source: "inline"` — passes content + encoding through directly.
 * - `source: "url"`    — fetches the URL and returns the response body as
 *                        a Buffer. Throws an Error (with the offending URL)
 *                        if the request fails or returns a non-2xx status.
 */
export async function resolveAttachments(
  attachments: AttachmentInput[]
): Promise<Attachment[]> {
  const resolved: Attachment[] = [];

  for (const attachment of attachments) {
    if (attachment.source === "inline") {
      resolved.push({
        filename: attachment.filename,
        content: attachment.content,
        encoding: attachment.encoding,
        contentType: attachment.contentType,
      });
    } else {
      // source === "url"
      let response: Response;
      try {
        response = await fetch(attachment.url);
      } catch (err) {
        throw new AttachmentFetchError(
          attachment.url,
          `Network error: ${(err as Error).message}`
        );
      }

      if (!response.ok) {
        throw new AttachmentFetchError(
          attachment.url,
          `Server responded with ${response.status} ${response.statusText}`
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      resolved.push({
        filename: attachment.filename,
        content: buffer,
        contentType: attachment.contentType,
      });
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Custom error class — lets the API handler distinguish fetch failures from
// other runtime errors and return a 400 instead of a 500.
// ---------------------------------------------------------------------------
export class AttachmentFetchError extends Error {
  constructor(
    public readonly url: string,
    detail: string
  ) {
    super(`Failed to fetch attachment from "${url}": ${detail}`);
    this.name = "AttachmentFetchError";
  }
}
