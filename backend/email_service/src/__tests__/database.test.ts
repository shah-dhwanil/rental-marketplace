import { mock, describe, it, expect, beforeEach } from "bun:test";

// ---------------------------------------------------------------------------
// Mock the pool module so no real DB connections are made.
// ---------------------------------------------------------------------------
const mockRelease = mock(() => {});
const mockQuery = mock(async () => ({ rows: [] as unknown[] }));
const mockConnect = mock(async () => ({
  query: mockQuery,
  release: mockRelease,
}));

mock.module("../database/pool", () => ({
  getPool: () => ({ connect: mockConnect }),
}));

// Import AFTER mocking
import {
  findById,
  insertEmailHistory,
  type EmailHistoryRow,
} from "../database/history";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRow(overrides?: Partial<EmailHistoryRow>): EmailHistoryRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    message_id: "<msg@example.com>",
    recipient_email: "alice@example.com",
    email_type: "welcome",
    sent_at: new Date("2026-03-04T00:00:00Z"),
    status: "sent",
    error_message: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------
describe("findById", () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockConnect.mockClear();
    mockRelease.mockClear();
  });

  it("returns null when no rows are found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await findById("00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("queries by id with the correct SQL", async () => {
    const id = "00000000-0000-0000-0000-000000000001";
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await findById(id);
    const [sql, params] = (mockQuery.mock.calls[0] as unknown) as [string, unknown[]];
    expect(sql).toContain("WHERE id = $1");
    expect(params).toEqual([id]);
  });

  it("returns the matching row", async () => {
    const row = makeRow();
    mockQuery.mockResolvedValueOnce({ rows: [row] });
    const result = await findById(row.id);
    expect(result).toEqual(row);
  });

  it("releases the client on success", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await findById("00000000-0000-0000-0000-000000000002");
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("releases the client even when the query throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB error"));
    await expect(
      findById("00000000-0000-0000-0000-000000000003")
    ).rejects.toThrow("DB error");
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// insertEmailHistory
// ---------------------------------------------------------------------------
describe("insertEmailHistory", () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockConnect.mockClear();
    mockRelease.mockClear();
  });

  it("inserts with the provided id when one is given", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await insertEmailHistory({
      id: "00000000-0000-0000-0000-000000000010",
      message_id: "<msg@example.com>",
      recipient_email: "alice@example.com",
      email_type: "welcome",
      status: "sent",
    });
    const [sql, params] = (mockQuery.mock.calls[0] as unknown) as [string, unknown[]];
    expect(sql).toContain("INSERT INTO rental.email_history");
    expect(sql).toContain("ON CONFLICT (id) DO NOTHING");
    expect(params[0]).toBe("00000000-0000-0000-0000-000000000010");
    expect(params[1]).toBe("<msg@example.com>");
    expect(params[2]).toBe("alice@example.com");
    expect(params[3]).toBe("welcome");
    expect(params[4]).toBe("sent");
    expect(params[5]).toBeNull();
  });

  it("passes null for id when none is provided (triggers uuidv7() default)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await insertEmailHistory({
      message_id: "<auto@example.com>",
      recipient_email: "bob@example.com",
      email_type: "order_confirmation",
      status: "sent",
    });
    const [, params] = (mockQuery.mock.calls[0] as unknown) as [string, unknown[]];
    // COALESCE(null, uuidv7()) — the null signals Postgres to use its default
    expect(params[0]).toBeNull();
  });

  it("stores the error_message for failed sends", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await insertEmailHistory({
      id: "00000000-0000-0000-0000-000000000020",
      message_id: "synthetic-uuid",
      recipient_email: "bad@example.com",
      email_type: "welcome",
      status: "failed",
      error_message: "SMTP connection refused",
    });
    const [, params] = (mockQuery.mock.calls[0] as unknown) as [string, unknown[]];
    expect(params[4]).toBe("failed");
    expect(params[5]).toBe("SMTP connection refused");
  });

  it("releases the client on success", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await insertEmailHistory({
      message_id: "x",
      recipient_email: "x@example.com",
      email_type: "welcome",
      status: "sent",
    });
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it("releases the client even when the query throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB write error"));
    await expect(
      insertEmailHistory({
        message_id: "x",
        recipient_email: "x@example.com",
        email_type: "welcome",
        status: "sent",
      })
    ).rejects.toThrow("DB write error");
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
