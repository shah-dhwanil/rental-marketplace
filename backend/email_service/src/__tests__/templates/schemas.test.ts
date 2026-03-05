import { describe, it, expect } from "bun:test";
import { WelcomeEmailSchema } from "../../templates/WelcomeEmail";
import { OrderConfirmationEmailSchema } from "../../templates/OrderConfirmationEmail";
import { PasswordResetEmailSchema } from "../../templates/PasswordResetEmail";

// ---------------------------------------------------------------------------
// WelcomeEmailSchema
// ---------------------------------------------------------------------------
describe("WelcomeEmailSchema", () => {
  it("accepts a valid payload with only required fields", () => {
    const result = WelcomeEmailSchema.safeParse({ name: "Alice" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid payload with optional loginUrl", () => {
    const result = WelcomeEmailSchema.safeParse({
      name: "Alice",
      loginUrl: "https://example.com/login",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = WelcomeEmailSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    }
  });

  it("rejects a missing name", () => {
    const result = WelcomeEmailSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an invalid loginUrl", () => {
    const result = WelcomeEmailSchema.safeParse({
      name: "Alice",
      loginUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.loginUrl).toBeDefined();
    }
  });

  it("allows loginUrl to be omitted (optional)", () => {
    const result = WelcomeEmailSchema.safeParse({ name: "Bob" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.loginUrl).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// OrderConfirmationEmailSchema
// ---------------------------------------------------------------------------
describe("OrderConfirmationEmailSchema", () => {
  const validOrder = {
    customerName: "Alice",
    orderId: "ord_123",
    propertyName: "Ocean View Villa",
    checkIn: "2026-06-01",
    checkOut: "2026-06-07",
    totalAmount: 1200.0,
  };

  it("accepts a fully valid order payload", () => {
    const result = OrderConfirmationEmailSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it("defaults currency to USD", () => {
    const result = OrderConfirmationEmailSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
    }
  });

  it("accepts a custom 3-letter currency code", () => {
    const result = OrderConfirmationEmailSchema.safeParse({
      ...validOrder,
      currency: "EUR",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a currency code that is not 3 letters", () => {
    const result = OrderConfirmationEmailSchema.safeParse({
      ...validOrder,
      currency: "EURO",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive totalAmount", () => {
    const result = OrderConfirmationEmailSchema.safeParse({
      ...validOrder,
      totalAmount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero totalAmount", () => {
    const result = OrderConfirmationEmailSchema.safeParse({
      ...validOrder,
      totalAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { customerName: _removed, ...rest } = validOrder;
    const result = OrderConfirmationEmailSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty orderId", () => {
    const result = OrderConfirmationEmailSchema.safeParse({
      ...validOrder,
      orderId: "",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PasswordResetEmailSchema
// ---------------------------------------------------------------------------
describe("PasswordResetEmailSchema", () => {
  const validReset = {
    name: "Alice",
    resetUrl: "https://example.com/reset?token=abc123",
  };

  it("accepts a valid payload with required fields only", () => {
    const result = PasswordResetEmailSchema.safeParse(validReset);
    expect(result.success).toBe(true);
  });

  it("defaults expiresInMinutes to 30", () => {
    const result = PasswordResetEmailSchema.safeParse(validReset);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresInMinutes).toBe(30);
    }
  });

  it("accepts a custom expiry duration", () => {
    const result = PasswordResetEmailSchema.safeParse({
      ...validReset,
      expiresInMinutes: 60,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresInMinutes).toBe(60);
    }
  });

  it("rejects a non-integer expiresInMinutes", () => {
    const result = PasswordResetEmailSchema.safeParse({
      ...validReset,
      expiresInMinutes: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive expiresInMinutes", () => {
    const result = PasswordResetEmailSchema.safeParse({
      ...validReset,
      expiresInMinutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid resetUrl", () => {
    const result = PasswordResetEmailSchema.safeParse({
      name: "Alice",
      resetUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.resetUrl).toBeDefined();
    }
  });

  it("rejects a missing resetUrl", () => {
    const result = PasswordResetEmailSchema.safeParse({ name: "Alice" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = PasswordResetEmailSchema.safeParse({
      name: "",
      resetUrl: "https://example.com/reset",
    });
    expect(result.success).toBe(false);
  });
});
