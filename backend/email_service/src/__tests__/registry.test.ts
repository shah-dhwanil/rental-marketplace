import { describe, it, expect } from "bun:test";
import { getTemplateEntry } from "../registry";

const REGISTERED_COMPONENTS = [
  "WelcomeEmail",
  "OrderConfirmationEmail",
  "PasswordResetEmail",
];

describe("getTemplateEntry", () => {
  it.each(REGISTERED_COMPONENTS)(
    "returns a valid entry for %s",
    (name) => {
      const entry = getTemplateEntry(name);
      expect(entry).toBeDefined();
      expect(typeof entry?.component).toBe("function");
      expect(entry?.schema).toBeDefined();
    }
  );

  it("returns undefined for an unknown component name", () => {
    expect(getTemplateEntry("UnknownComponent")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getTemplateEntry("")).toBeUndefined();
  });

  it("each schema can validate a basic object", () => {
    // Ensures schemas are live Zod objects, not null/undefined stubs
    for (const name of REGISTERED_COMPONENTS) {
      const entry = getTemplateEntry(name);
      expect(entry?.schema).toBeDefined();
      // An empty object should fail all schemas (all have required fields)
      const result = entry!.schema.safeParse({});
      expect(result.success).toBe(false);
    }
  });
});
