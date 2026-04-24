/**
 * Test helper factories for creating customer, vendor, and admin user fixtures.
 *
 * Each factory reflects the onboarding data collected from that user type and
 * provides ready-to-use POST /send request bodies for the email service so that
 * tests can exercise the full onboarding email flow without real SMTP calls.
 *
 * Onboarding overview
 * -------------------
 * Customer  – registers with name + email → receives a welcome email pointing
 *             to the customer portal. After booking, receives order confirmation
 *             emails. Can trigger a password-reset email at any time.
 *
 * Vendor    – registers with name, email, and business name → receives a welcome
 *             email pointing to the vendor portal. Can trigger a password-reset
 *             email at any time.
 *
 * Admin     – provisioned by an existing administrator with name + email →
 *             receives a welcome email pointing to the admin portal. Can trigger
 *             a password-reset email at any time.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestCustomer {
  name: string;
  email: string;
  role: "customer";
}

export interface TestVendor {
  name: string;
  email: string;
  role: "vendor";
  /** Trading or business name used on listings. */
  businessName: string;
}

export interface TestAdmin {
  name: string;
  email: string;
  role: "admin";
}

export type TestUser = TestCustomer | TestVendor | TestAdmin;

// ---------------------------------------------------------------------------
// Portal URLs — one login URL per role
// ---------------------------------------------------------------------------

const PORTAL_URLS: Record<TestUser["role"], string> = {
  customer: "https://rentalmarketplace.example.com/customer/login",
  vendor: "https://rentalmarketplace.example.com/vendor/login",
  admin: "https://rentalmarketplace.example.com/admin/login",
};

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Create a customer fixture.
 *
 * Customers are end-users who browse listings and make bookings. Their
 * onboarding collects a display name and email address.
 */
export function createCustomer(overrides?: Partial<TestCustomer>): TestCustomer {
  return {
    name: "Alice Customer",
    email: "alice.customer@example.com",
    role: "customer",
    ...overrides,
  };
}

/**
 * Create a vendor fixture.
 *
 * Vendors are property owners who create and manage rental listings. Their
 * onboarding collects a display name, email address, and a business/brand name
 * that appears on their listings.
 */
export function createVendor(overrides?: Partial<TestVendor>): TestVendor {
  return {
    name: "Bob Vendor",
    email: "bob.vendor@example.com",
    role: "vendor",
    businessName: "Bob's Rentals",
    ...overrides,
  };
}

/**
 * Create an admin fixture.
 *
 * Admins are provisioned by other administrators and manage the platform.
 * Their onboarding is system-initiated and only requires a display name and
 * email address.
 */
export function createAdmin(overrides?: Partial<TestAdmin>): TestAdmin {
  return {
    name: "Carol Admin",
    email: "carol.admin@example.com",
    role: "admin",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Email request builders
// ---------------------------------------------------------------------------

/**
 * Build the POST /send request body for the welcome email sent to any user
 * type at the end of their onboarding flow.
 *
 * The `loginUrl` is automatically set to the portal for the user's role.
 */
export function buildWelcomeEmailRequest(user: TestUser) {
  return {
    to: user.email,
    type: "welcome",
    data: {
      name: user.name,
      loginUrl: PORTAL_URLS[user.role],
    },
  };
}

/**
 * Build the POST /send request body for an order-confirmation email.
 *
 * Only customers receive order confirmation emails; calling this with a vendor
 * or admin fixture is a type error by design.
 */
export function buildOrderConfirmationRequest(
  customer: TestCustomer,
  order: {
    orderId: string;
    propertyName: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    currency?: string;
  }
) {
  return {
    to: customer.email,
    type: "order_confirmation",
    data: {
      customerName: customer.name,
      orderId: order.orderId,
      propertyName: order.propertyName,
      checkIn: order.checkIn,
      checkOut: order.checkOut,
      totalAmount: order.totalAmount,
      currency: order.currency ?? "USD",
    },
  };
}

/**
 * Build the POST /send request body for a password-reset email.
 *
 * Any user type can trigger a password reset.
 *
 * @param expiresInMinutes - How long the reset link is valid (default: 30).
 */
export function buildPasswordResetRequest(
  user: TestUser,
  resetUrl: string,
  expiresInMinutes?: number
) {
  return {
    to: user.email,
    type: "password_reset",
    data: {
      name: user.name,
      resetUrl,
      ...(expiresInMinutes !== undefined ? { expiresInMinutes } : {}),
    },
  };
}
