import { describe, it, expect, mock, beforeEach } from "bun:test";
import {
  resolveAttachments,
  AttachmentFetchError,
  AttachmentSchema,
} from "../../attachments/resolver";

// ---------------------------------------------------------------------------
// AttachmentSchema validation tests
// ---------------------------------------------------------------------------
describe("AttachmentSchema", () => {
  describe("inline variant", () => {
    it("accepts a valid inline attachment with defaults", () => {
      const result = AttachmentSchema.safeParse({
        source: "inline",
        filename: "file.txt",
        content: "SGVsbG8=",
        contentType: "text/plain",
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.source === "inline") {
        expect(result.data.encoding).toBe("base64");
      }
    });

    it("accepts utf-8 encoding", () => {
      const result = AttachmentSchema.safeParse({
        source: "inline",
        filename: "file.txt",
        content: "Hello World",
        encoding: "utf-8",
        contentType: "text/plain",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing filename", () => {
      const result = AttachmentSchema.safeParse({
        source: "inline",
        content: "data",
        contentType: "text/plain",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty content", () => {
      const result = AttachmentSchema.safeParse({
        source: "inline",
        filename: "file.txt",
        content: "",
        contentType: "text/plain",
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown encoding", () => {
      const result = AttachmentSchema.safeParse({
        source: "inline",
        filename: "file.txt",
        content: "data",
        encoding: "hex",
        contentType: "text/plain",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("url variant", () => {
    it("accepts a valid URL attachment", () => {
      const result = AttachmentSchema.safeParse({
        source: "url",
        filename: "doc.pdf",
        url: "https://example.com/doc.pdf",
        contentType: "application/pdf",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a non-URL string", () => {
      const result = AttachmentSchema.safeParse({
        source: "url",
        filename: "doc.pdf",
        url: "not-a-url",
        contentType: "application/pdf",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing contentType", () => {
      const result = AttachmentSchema.safeParse({
        source: "url",
        filename: "doc.pdf",
        url: "https://example.com/doc.pdf",
      });
      expect(result.success).toBe(false);
    });
  });

  it("rejects unknown source", () => {
    const result = AttachmentSchema.safeParse({
      source: "disk",
      filename: "file.txt",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveAttachments unit tests
// ---------------------------------------------------------------------------
describe("resolveAttachments", () => {
  it("returns an empty array for no attachments", async () => {
    const result = await resolveAttachments([]);
    expect(result).toEqual([]);
  });

  it("passes through an inline base64 attachment unchanged", async () => {
    const result = await resolveAttachments([
      {
        source: "inline",
        filename: "hello.txt",
        content: "SGVsbG8=",
        encoding: "base64",
        contentType: "text/plain",
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe("hello.txt");
    expect(result[0].content).toBe("SGVsbG8=");
    expect(result[0].contentType).toBe("text/plain");
  });

  it("passes through an inline utf-8 attachment unchanged", async () => {
    const result = await resolveAttachments([
      {
        source: "inline",
        filename: "note.txt",
        content: "Plain text content",
        encoding: "utf-8",
        contentType: "text/plain",
      },
    ]);
    expect(result[0].encoding).toBe("utf-8");
  });

  describe("URL attachments", () => {
    beforeEach(() => {
      // Reset fetch mock before each test
      globalThis.fetch = mock(async () =>
        new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200 })
      ) as unknown as typeof globalThis.fetch;
    });

    it("fetches and buffers a URL attachment", async () => {
      globalThis.fetch = mock(async () =>
        new Response(new Uint8Array([72, 101, 108, 108, 111]).buffer, {
          status: 200,
        })
      ) as unknown as typeof globalThis.fetch;

      const result = await resolveAttachments([
        {
          source: "url",
          filename: "report.pdf",
          url: "https://example.com/report.pdf",
          contentType: "application/pdf",
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe("report.pdf");
      expect(result[0].contentType).toBe("application/pdf");
      expect(Buffer.isBuffer(result[0].content)).toBe(true);
    });

    it("throws AttachmentFetchError on non-2xx response", async () => {
      globalThis.fetch = mock(async () =>
        new Response("Not Found", { status: 404, statusText: "Not Found" })
      ) as unknown as typeof globalThis.fetch;

      expect(
        resolveAttachments([
          {
            source: "url",
            filename: "missing.pdf",
            url: "https://example.com/missing.pdf",
            contentType: "application/pdf",
          },
        ])
      ).rejects.toBeInstanceOf(AttachmentFetchError);
    });

    it("includes the failing URL in the AttachmentFetchError", async () => {
      const targetUrl = "https://example.com/missing.pdf";
      globalThis.fetch = mock(async () =>
        new Response("Not Found", { status: 404, statusText: "Not Found" })
      ) as unknown as typeof globalThis.fetch;

      try {
        await resolveAttachments([
          {
            source: "url",
            filename: "missing.pdf",
            url: targetUrl,
            contentType: "application/pdf",
          },
        ]);
        throw new Error("Expected to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(AttachmentFetchError);
        expect((err as AttachmentFetchError).url).toBe(targetUrl);
      }
    });

    it("throws AttachmentFetchError on network error", async () => {
      globalThis.fetch = mock(async () => {
        throw new TypeError("Failed to fetch");
      }) as unknown as typeof globalThis.fetch;

      expect(
        resolveAttachments([
          {
            source: "url",
            filename: "fail.pdf",
            url: "https://unreachable.invalid/fail.pdf",
            contentType: "application/pdf",
          },
        ])
      ).rejects.toBeInstanceOf(AttachmentFetchError);
    });

    it("resolves multiple attachments in order", async () => {
      const calls: string[] = [];
      globalThis.fetch = mock(async (url: string) => {
        calls.push(url);
        return new Response(new Uint8Array([0]).buffer, { status: 200 });
      }) as unknown as typeof globalThis.fetch;

      await resolveAttachments([
        {
          source: "url",
          filename: "first.pdf",
          url: "https://example.com/first.pdf",
          contentType: "application/pdf",
        },
        {
          source: "url",
          filename: "second.pdf",
          url: "https://example.com/second.pdf",
          contentType: "application/pdf",
        },
      ]);

      expect(calls[0]).toBe("https://example.com/first.pdf");
      expect(calls[1]).toBe("https://example.com/second.pdf");
    });
  });
});
