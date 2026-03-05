import type { ZodTypeAny } from "zod";
import type { FC } from "react";

import { WelcomeEmail, WelcomeEmailSchema } from "./templates/WelcomeEmail";
import {
  OrderConfirmationEmail,
  OrderConfirmationEmailSchema,
} from "./templates/OrderConfirmationEmail";
import {
  PasswordResetEmail,
  PasswordResetEmailSchema,
} from "./templates/PasswordResetEmail";

/**
 * Registry entry: a React component and its Zod validation schema.
 * The component name here MUST match the `component` field in templates.toml.
 */
export interface TemplateEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: FC<any>;
  schema: ZodTypeAny;
}

const registry: Record<string, TemplateEntry> = {
  WelcomeEmail: {
    component: WelcomeEmail,
    schema: WelcomeEmailSchema,
  },
  OrderConfirmationEmail: {
    component: OrderConfirmationEmail,
    schema: OrderConfirmationEmailSchema,
  },
  PasswordResetEmail: {
    component: PasswordResetEmail,
    schema: PasswordResetEmailSchema,
  },
};

/**
 * Look up a template entry by component name (as declared in templates.toml).
 * Returns undefined if the component name is not registered.
 */
export function getTemplateEntry(componentName: string): TemplateEntry | undefined {
  return registry[componentName];
}

export default registry;
