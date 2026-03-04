import { mock, describe, it, expect, beforeEach } from "bun:test";
import type { SendEmailOptions } from "../services/mailer";
import type { EmailHistoryRow } from "../database/history";

// ---------------------------------------------------------------------------
// Mock the mailer module so no real SMTP calls are made.
// Bun hoists mock.module() above static imports in the same file.
// ---------------------------------------------------------------------------
const mockSendEmail = mock(async () => ({
  messageId: "test-message-id@example.com",
}));

mock.module("../services/mailer", () => ({
  sendEmail: mockSendEmail,
}));

// ---------------------------------------------------------------------------
// Mock the database/history module so no real DB calls are made.
// Default behaviour: findById returns null (no existing row), insert is a no-op.
// ---------------------------------------------------------------------------
const mockFindById = mock(async (_id: string): Promise<EmailHistoryRow | null> => null);
const mockInsertEmailHistory = mock(async () => {});

mock.module("../database/history", () => ({
  findById: mockFindById,
  insertEmailHistory: mockInsertEmailHistory,
}));

// Import app AFTER mocking
import { app } from "../index";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function post(body: unknown) {
  return app.request("/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});

describe("POST /send — request validation", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
  });

  it("returns 400 for non-JSON body", async () => {
    const res = await app.request("/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await post({});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Request validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 400 for an invalid 'to' email address", async () => {
    const res = await post({ to: "not-an-email", type: "welcome", data: { name: "Alice" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid cc email", async () => {
    const res = await post({
      to: "alice@example.com",
      cc: "not-an-email",
      type: "welcome",
      data: { name: "Alice" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid bcc email", async () => {
    const res = await post({
      to: "alice@example.com",
      bcc: "bad",
      type: "welcome",
      data: { name: "Alice" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid replyTo email", async () => {
    const res = await post({
      to: "alice@example.com",
      replyTo: "not-email",
      type: "welcome",
      data: { name: "Alice" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-string header values", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "welcome",
      data: { name: "Alice" },
      headers: { "X-Foo": 123 }, // should be string
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /send — template resolution", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
  });

  it("returns 404 for an unknown email type", async () => {
    const res = await post({ to: "alice@example.com", type: "unknown_type", data: {} });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/unknown email type/i);
  });

  it("returns 400 when template data fails schema validation", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "welcome",
      data: { name: "" }, // empty name is invalid
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Template data validation failed");
  });

  it("returns 400 when template data is missing required fields", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "order_confirmation",
      data: { customerName: "Alice" }, // orderId, propertyName, etc. missing
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Template data validation failed");
  });
});

describe("POST /send — successful sends", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
  });

  it("sends a welcome email and returns messageId", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "welcome",
      data: { name: "Alice" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.messageId).toBe("test-message-id@example.com");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("sends to multiple recipients", async () => {
    const res = await post({
      to: ["alice@example.com", "bob@example.com"],
      type: "welcome",
      data: { name: "Alice" },
    });
    expect(res.status).toBe(200);
    const calls = mockSendEmail.mock.calls as unknown as [SendEmailOptions][];
    const [callArgs] = calls;
    expect(callArgs![0].to).toEqual(["alice@example.com", "bob@example.com"]);
  });

  it("forwards cc and bcc to sendEmail", async () => {
    const res = await post({
      to: "alice@example.com",
      cc: "manager@example.com",
      bcc: "audit@internal.com",
      type: "welcome",
      data: { name: "Alice" },
    });
    expect(res.status).toBe(200);
    const calls = mockSendEmail.mock.calls as unknown as [SendEmailOptions][];
    const [callArgs] = calls;
    expect(callArgs![0].cc).toBe("manager@example.com");
    expect(callArgs![0].bcc).toBe("audit@internal.com");
  });

  it("forwards replyTo to sendEmail", async () => {
    const res = await post({
      to: "alice@example.com",
      replyTo: "support@example.com",
      type: "welcome",
      data: { name: "Alice" },
    });
    expect(res.status).toBe(200);
    const calls = mockSendEmail.mock.calls as unknown as [SendEmailOptions][];
    const [callArgs] = calls;
    expect(callArgs![0].replyTo).toBe("support@example.com");
  });

  it("forwards custom headers to sendEmail", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "welcome",
      data: { name: "Alice" },
      headers: { "X-Campaign-ID": "spring-2026" },
    });
    expect(res.status).toBe(200);
    const calls = mockSendEmail.mock.calls as unknown as [SendEmailOptions][];
    const [callArgs] = calls;
    expect(callArgs![0].headers?.["X-Campaign-ID"]).toBe("spring-2026");
  });

  it("forwards tags to sendEmail", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "welcome",
      data: { name: "Alice" },
      tags: ["transactional", "welcome"],
    });
    expect(res.status).toBe(200);
    const calls = mockSendEmail.mock.calls as unknown as [SendEmailOptions][];
    const [callArgs] = calls;
    expect(callArgs![0].tags).toEqual(["transactional", "welcome"]);
  });

  it("sends an order_confirmation email successfully", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "order_confirmation",
      data: {
        customerName: "Alice",
        orderId: "ord_abc123",
        propertyName: "Ocean View Villa",
        checkIn: "2026-06-01",
        checkOut: "2026-06-07",
        totalAmount: 1200,
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("sends a password_reset email successfully", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "password_reset",
      data: {
        name: "Alice",
        resetUrl: "https://example.com/reset?token=abc",
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("works without optional fields (backward compatibility)", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "welcome",
      data: { name: "Alice" },
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /send — inline attachments", () => {
  beforeEach(() => {
    mockSendEmail.mockClear();
  });

  it("sends with inline base64 attachment", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "welcome",
      data: { name: "Alice" },
      attachments: [
        {
          source: "inline",
          filename: "hello.txt",
          content: "SGVsbG8=",
          encoding: "base64",
          contentType: "text/plain",
        },
      ],
    });
    expect(res.status).toBe(200);
    const calls = mockSendEmail.mock.calls as unknown as [SendEmailOptions][];
    const [callArgs] = calls;
    expect(callArgs![0].attachments).toHaveLength(1);
    expect(callArgs![0].attachments![0].filename).toBe("hello.txt");
  });

  it("returns 400 for an attachment with an invalid source", async () => {
    const res = await post({
      to: "alice@example.com",
      type: "welcome",
      data: { name: "Alice" },
      attachments: [{ source: "disk", filename: "file.txt" }],
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------
describe("POST /send — idempotency", () => {
  const VALID_KEY = "01956e3d-0000-7000-8000-000000000001";
  const BASE_BODY = { to: "alice@example.com", type: "welcome", data: { name: "Alice" } };

  function postWithKey(body: unknown, key?: string) {
    return app.request("/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    mockSendEmail.mockClear();
    mockFindById.mockClear();
    mockInsertEmailHistory.mockClear();
    // Reset to defaults
    mockFindById.mockImplementation(async () => null);
    mockInsertEmailHistory.mockImplementation(async () => {});
  });

  it("returns 400 when Idempotency-Key is not a valid UUID", async () => {
    const res = await postWithKey(BASE_BODY, "not-a-uuid");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/idempotency-key must be a valid uuid/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends normally and writes history when no prior row exists", async () => {
    mockFindById.mockResolvedValueOnce(null);
    const res = await postWithKey(BASE_BODY, VALID_KEY);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.messageId).toBe("test-message-id@example.com");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockInsertEmailHistory).toHaveBeenCalledTimes(1);
    const insertArg = (mockInsertEmailHistory.mock.calls[0] as unknown[])[0] as {
      id?: string;
      status: string;
    };
    expect(insertArg.id).toBe(VALID_KEY);
    expect(insertArg.status).toBe("sent");
  });

  it("returns cached 200 and skips SMTP when prior row has status 'sent'", async () => {
    mockFindById.mockResolvedValueOnce({
      id: VALID_KEY,
      message_id: "cached-message-id@example.com",
      recipient_email: "alice@example.com",
      email_type: "welcome",
      sent_at: new Date(),
      status: "sent",
      error_message: null,
    } satisfies EmailHistoryRow);

    const res = await postWithKey(BASE_BODY, VALID_KEY);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.messageId).toBe("cached-message-id@example.com");
    // No SMTP call or new DB write
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockInsertEmailHistory).not.toHaveBeenCalled();
  });

  it("returns 422 when prior row has status 'failed'", async () => {
    mockFindById.mockResolvedValueOnce({
      id: VALID_KEY,
      message_id: "synthetic-uuid",
      recipient_email: "alice@example.com",
      email_type: "welcome",
      sent_at: new Date(),
      status: "failed",
      error_message: "SMTP connection refused",
    } satisfies EmailHistoryRow);

    const res = await postWithKey(BASE_BODY, VALID_KEY);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("SMTP connection refused");
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockInsertEmailHistory).not.toHaveBeenCalled();
  });

  it("proceeds with send when DB lookup throws (best-effort idempotency)", async () => {
    mockFindById.mockImplementationOnce(async () => {
      throw new Error("DB unavailable");
    });
    // Suppress the expected console.error logged by the best-effort catch block
    const consoleError = console.error;
    console.error = () => {};
    const res = await postWithKey(BASE_BODY, VALID_KEY);
    console.error = consoleError;
    // Send still happens despite DB error
    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("sends normally without Idempotency-Key (no DB interaction for key check)", async () => {
    const res = await postWithKey(BASE_BODY); // no key header
    expect(res.status).toBe(200);
    // findById should NOT have been called (no key to look up)
    expect(mockFindById).not.toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });
});
