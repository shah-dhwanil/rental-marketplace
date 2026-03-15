import { z } from "zod";

export const PromoScopeSchema = z.enum(["product", "vendor", "platform"]);
export const DiscountTypeSchema = z.enum(["percentage", "fixed"]);

export const PromoSchema = z.object({
  id: z.string(),
  code: z.string(),
  scope: PromoScopeSchema,
  product_id: z.string().nullable(),
  vendor_id: z.string().nullable(),
  discount_type: DiscountTypeSchema,
  discount_value: z.number(),
  min_order_value: z.number().nullable(),
  max_discount: z.number().nullable(),
  valid_from: z.string(),
  valid_until: z.string(),
  max_uses: z.number().nullable(),
  uses_count: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Promo = z.infer<typeof PromoSchema>;

export const PaginatedPromosSchema = z.object({
  items: z.array(PromoSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  pages: z.number(),
});

export const PromoValidationResponseSchema = z.object({
  code: z.string(),
  discount_type: DiscountTypeSchema,
  discount_value: z.number(),
  max_discount: z.number().nullable(),
  discount_amount: z.number(),
  final_value: z.number(),
});

export type PromoValidationResult = z.infer<typeof PromoValidationResponseSchema>;
