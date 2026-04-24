import { mock, describe, it, expect, beforeEach } from "bun:test";
import type { EmailHistoryRow } from "../../database/history";

// ---------------------------------------------------------------------------
// Mock SMTP and DB so no real side-effects occur during tests.
// ---------------------------------------------------------------------------
mock.module("../../services/mailer", () => ({
  sendEmail: mock(async () => ({ messageId: "test-message-id@example.com" })),
}));

mock.module("../../database/history", () => ({
  findById: mock(async (_id: string): Promise<EmailHistoryRow | null> => null),
  insertEmailHistory: mock(async () => {}),
}));

// Import app and helpers AFTER mocking
import { app } from "../../index";
import {
  createCustomer,
  createVendor,
  createAdmin,
  buildWelcomeEmailRequest,
  buildOrderConfirmationRequest,
  buildPasswordResetRequest,
  type TestCustomer,
  type TestVendor,
  type TestAdmin,
} from "./user-factory";

// ---------------------------------------------------------------------------
// Utility: POST /send
// ---------------------------------------------------------------------------
function post(body: unknown, idempotencyKey?: string) {
  return app.request("/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// createCustomer
// ---------------------------------------------------------------------------
describe("createCustomer", () => {
  it("returns a fixture with role='customer'", () => {
    const customer = createCustomer();
    expect(customer.role).toBe("customer");
  });

  it("has sensible default name and email", () => {
    const customer = createCustomer();
    expect(customer.name).toBeTruthy();
    expect(customer.email).toContain("@");
  });

  it("allows partial overrides", () => {
    const customer = createCustomer({ name: "Test Customer", email: "test@example.com" });
    expect(customer.name).toBe("Test Customer");
    expect(customer.email).toBe("test@example.com");
    expect(customer.role).toBe("customer");
  });

  it("preserves the role when overriding other fields", () => {
    const customer = createCustomer({ name: "Override" });
    expect(customer.role).toBe("customer");
  });
});

// ---------------------------------------------------------------------------
// createVendor
// ---------------------------------------------------------------------------
describe("createVendor", () => {
  it("returns a fixture with role='vendor'", () => {
    const vendor = createVendor();
    expect(vendor.role).toBe("vendor");
  });

  it("includes a businessName", () => {
    const vendor = createVendor();
    expect(vendor.businessName).toBeTruthy();
  });

  it("has sensible default name and email", () => {
    const vendor = createVendor();
    expect(vendor.name).toBeTruthy();
    expect(vendor.email).toContain("@");
  });

  it("allows partial overrides", () => {
    const vendor = createVendor({ name: "Vendor Co.", businessName: "Vendor Corp" });
    expect(vendor.name).toBe("Vendor Co.");
    expect(vendor.businessName).toBe("Vendor Corp");
    expect(vendor.role).toBe("vendor");
  });
});

// ---------------------------------------------------------------------------
// createAdmin
// ---------------------------------------------------------------------------
describe("createAdmin", () => {
  it("returns a fixture with role='admin'", () => {
    const admin = createAdmin();
    expect(admin.role).toBe("admin");
  });

  it("has sensible default name and email", () => {
    const admin = createAdmin();
    expect(admin.name).toBeTruthy();
    expect(admin.email).toContain("@");
  });

  it("allows partial overrides", () => {
    const admin = createAdmin({ name: "Super Admin", email: "superadmin@example.com" });
    expect(admin.name).toBe("Super Admin");
    expect(admin.email).toBe("superadmin@example.com");
    expect(admin.role).toBe("admin");
  });
});

// ---------------------------------------------------------------------------
// buildWelcomeEmailRequest
// ---------------------------------------------------------------------------
describe("buildWelcomeEmailRequest", () => {
  it("sets type='welcome' for customer", () => {
    const req = buildWelcomeEmailRequest(createCustomer());
    expect(req.type).toBe("welcome");
  });

  it("uses the customer's email as recipient", () => {
    const customer = createCustomer({ email: "c@example.com" });
    const req = buildWelcomeEmailRequest(customer);
    expect(req.to).toBe("c@example.com");
  });

  it("includes the user name in data", () => {
    const customer = createCustomer({ name: "Alice" });
    const req = buildWelcomeEmailRequest(customer);
    expect(req.data.name).toBe("Alice");
  });

  it("uses customer portal loginUrl for customers", () => {
    const req = buildWelcomeEmailRequest(createCustomer());
    expect(req.data.loginUrl).toContain("/customer/login");
  });

  it("uses vendor portal loginUrl for vendors", () => {
    const req = buildWelcomeEmailRequest(createVendor());
    expect(req.data.loginUrl).toContain("/vendor/login");
  });

  it("uses admin portal loginUrl for admins", () => {
    const req = buildWelcomeEmailRequest(createAdmin());
    expect(req.data.loginUrl).toContain("/admin/login");
  });

  it("produces a valid POST /send body accepted by the email service — customer", async () => {
    const req = buildWelcomeEmailRequest(createCustomer());
    const res = await post(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("produces a valid POST /send body accepted by the email service — vendor", async () => {
    const req = buildWelcomeEmailRequest(createVendor());
    const res = await post(req);
    expect(res.status).toBe(200);
  });

  it("produces a valid POST /send body accepted by the email service — admin", async () => {
    const req = buildWelcomeEmailRequest(createAdmin());
    const res = await post(req);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// buildOrderConfirmationRequest
// ---------------------------------------------------------------------------
describe("buildOrderConfirmationRequest", () => {
  const customer: TestCustomer = createCustomer({ name: "Alice", email: "alice@example.com" });
  const order = {
    orderId: "ord_test_001",
    propertyName: "Ocean View Villa",
    checkIn: "2026-06-01",
    checkOut: "2026-06-07",
    totalAmount: 1200,
  };

  it("sets type='order_confirmation'", () => {
    const req = buildOrderConfirmationRequest(customer, order);
    expect(req.type).toBe("order_confirmation");
  });

  it("uses the customer's email as recipient", () => {
    const req = buildOrderConfirmationRequest(customer, order);
    expect(req.to).toBe("alice@example.com");
  });

  it("maps customer name to customerName in data", () => {
    const req = buildOrderConfirmationRequest(customer, order);
    expect(req.data.customerName).toBe("Alice");
  });

  it("passes through all order fields", () => {
    const req = buildOrderConfirmationRequest(customer, order);
    expect(req.data.orderId).toBe("ord_test_001");
    expect(req.data.propertyName).toBe("Ocean View Villa");
    expect(req.data.checkIn).toBe("2026-06-01");
    expect(req.data.checkOut).toBe("2026-06-07");
    expect(req.data.totalAmount).toBe(1200);
  });

  it("defaults currency to 'USD' when not provided", () => {
    const req = buildOrderConfirmationRequest(customer, order);
    expect(req.data.currency).toBe("USD");
  });

  it("uses the provided currency when specified", () => {
    const req = buildOrderConfirmationRequest(customer, { ...order, currency: "EUR" });
    expect(req.data.currency).toBe("EUR");
  });

  it("produces a valid POST /send body accepted by the email service", async () => {
    const req = buildOrderConfirmationRequest(customer, order);
    const res = await post(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildPasswordResetRequest
// ---------------------------------------------------------------------------
describe("buildPasswordResetRequest", () => {
  const RESET_URL = "https://rentalmarketplace.example.com/reset?token=abc123";

  it("sets type='password_reset'", () => {
    const req = buildPasswordResetRequest(createCustomer(), RESET_URL);
    expect(req.type).toBe("password_reset");
  });

  it("uses the user's email as recipient", () => {
    const customer = createCustomer({ email: "alice@example.com" });
    const req = buildPasswordResetRequest(customer, RESET_URL);
    expect(req.to).toBe("alice@example.com");
  });

  it("includes the user name in data", () => {
    const customer = createCustomer({ name: "Alice" });
    const req = buildPasswordResetRequest(customer, RESET_URL);
    expect(req.data.name).toBe("Alice");
  });

  it("includes the reset URL in data", () => {
    const req = buildPasswordResetRequest(createCustomer(), RESET_URL);
    expect(req.data.resetUrl).toBe(RESET_URL);
  });

  it("omits expiresInMinutes when not provided", () => {
    const req = buildPasswordResetRequest(createCustomer(), RESET_URL);
    expect("expiresInMinutes" in req.data).toBe(false);
  });

  it("includes expiresInMinutes when provided", () => {
    const req = buildPasswordResetRequest(createCustomer(), RESET_URL, 60);
    expect(req.data.expiresInMinutes).toBe(60);
  });

  it("works for vendor role", () => {
    const req = buildPasswordResetRequest(createVendor(), RESET_URL);
    expect(req.type).toBe("password_reset");
    expect(req.to).toBe(createVendor().email);
  });

  it("works for admin role", () => {
    const req = buildPasswordResetRequest(createAdmin(), RESET_URL);
    expect(req.type).toBe("password_reset");
    expect(req.to).toBe(createAdmin().email);
  });

  it("produces a valid POST /send body for customer", async () => {
    const req = buildPasswordResetRequest(createCustomer(), RESET_URL);
    const res = await post(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("produces a valid POST /send body for vendor", async () => {
    const req = buildPasswordResetRequest(createVendor(), RESET_URL);
    const res = await post(req);
    expect(res.status).toBe(200);
  });

  it("produces a valid POST /send body for admin", async () => {
    const req = buildPasswordResetRequest(createAdmin(), RESET_URL);
    const res = await post(req);
    expect(res.status).toBe(200);
  });
});
