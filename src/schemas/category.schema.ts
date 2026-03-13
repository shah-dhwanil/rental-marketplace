import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  icon: z.string(),
  image: z.string().url(),
  productCount: z.number().int().nonnegative(),
  subcategories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  })).default([]),
});

export const CategoryListSchema = z.array(CategorySchema);

export const CategoryListResponseSchema = z.object({
  categories: z.array(CategorySchema),
});

export type Category = z.infer<typeof CategorySchema>;
export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>;
