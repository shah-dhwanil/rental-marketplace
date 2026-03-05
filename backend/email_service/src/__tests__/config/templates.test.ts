import { describe, it, expect } from "bun:test";
import { getTemplateConfig, templates } from "../../config/templates";

describe("getTemplateConfig", () => {
  it("returns the welcome template config", () => {
    const config = getTemplateConfig("welcome");
    expect(config).toBeDefined();
    expect(config?.component).toBe("WelcomeEmail");
    expect(typeof config?.subject).toBe("string");
    expect(config?.subject.length).toBeGreaterThan(0);
  });

  it("returns the order_confirmation template config", () => {
    const config = getTemplateConfig("order_confirmation");
    expect(config).toBeDefined();
    expect(config?.component).toBe("OrderConfirmationEmail");
  });

  it("returns the password_reset template config", () => {
    const config = getTemplateConfig("password_reset");
    expect(config).toBeDefined();
    expect(config?.component).toBe("PasswordResetEmail");
  });

  it("returns undefined for an unknown type", () => {
    expect(getTemplateConfig("nonexistent_type")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getTemplateConfig("")).toBeUndefined();
  });
});

describe("templates map", () => {
  it("contains at least the three built-in templates", () => {
    expect(Object.keys(templates)).toContain("welcome");
    expect(Object.keys(templates)).toContain("order_confirmation");
    expect(Object.keys(templates)).toContain("password_reset");
  });

  it("each template entry has a component and subject", () => {
    for (const [key, config] of Object.entries(templates)) {
      expect(typeof config.component).toBe("string");
      expect(config.component.length).toBeGreaterThan(0);
      expect(typeof config.subject).toBe("string");
      expect(config.subject.length).toBeGreaterThan(0);
    }
  });
});
