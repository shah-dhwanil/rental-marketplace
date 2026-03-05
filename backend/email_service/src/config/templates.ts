import type { ZodTypeAny } from "zod";
import type { FC } from "react";

// Bun natively supports TOML imports
// @ts-ignore – Bun resolves this at runtime
import rawTemplates from "../../templates.toml";

export interface TemplateConfig {
  component: string;
  subject: string;
}

export type TemplatesMap = Record<string, TemplateConfig>;

/**
 * Validated map of all templates defined in templates.toml.
 * Keyed by email type (e.g. "welcome", "order_confirmation").
 */
export const templates: TemplatesMap = rawTemplates as TemplatesMap;

/**
 * Look up a template config by email type.
 * Returns undefined if the type is not registered.
 */
export function getTemplateConfig(type: string): TemplateConfig | undefined {
  return templates[type];
}

/**
 * The structure stored in the registry for each template.
 */
export interface TemplateEntry {
  component: FC<Record<string, unknown>>;
  schema: ZodTypeAny;
}
