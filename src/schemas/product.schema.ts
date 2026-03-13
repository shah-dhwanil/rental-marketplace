import { z } from "zod";

export const ProductConditionSchema = z.enum(["new", "like-new", "good", "fair"]);
export const ProductStatusSchema = z.enum(["available", "rented", "maintenance", "unavailable"]);
export const ProductCategorySchema = z.enum([
  "cameras",
  "laptops",
  "gaming",
  "drones",
  "audio",
  "camping",
  "fashion",
  "events",
]);

export const ProductSpecificationSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const ProductImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  alt: z.string(),
  isPrimary: z.boolean().default(false),
});

export const ProductLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string().default("USA"),
});

export const ProductPricingSchema = z.object({
  daily: z.number().positive(),
  weekly: z.number().positive().optional(),
  monthly: z.number().positive().optional(),
  deposit: z.number().positive(),
  currency: z.string().default("USD"),
});

export const ProductSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: ProductCategorySchema,
  subcategory: z.string().optional(),
  brand: z.string(),
  model: z.string(),
  condition: ProductConditionSchema,
  status: ProductStatusSchema,
  images: z.array(ProductImageSchema).min(1),
  specifications: z.array(ProductSpecificationSchema),
  pricing: ProductPricingSchema,
  location: ProductLocationSchema,
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().nonnegative().default(0),
  rentalCount: z.number().int().nonnegative().default(0),
  wishlistCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProductListResponseSchema = z.object({
  products: z.array(ProductSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean(),
});

export const ProductSearchParamsSchema = z.object({
  query: z.string().optional(),
  category: ProductCategorySchema.optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  condition: ProductConditionSchema.optional(),
  location: z.string().optional(),
  radius: z.number().positive().optional(),
  sortBy: z.enum(["price-asc", "price-desc", "rating", "distance", "newest"]).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
});

export const ProductListSchema = z.array(ProductSchema);

export type Product = z.infer<typeof ProductSchema>;
export type ProductCondition = z.infer<typeof ProductConditionSchema>;
export type ProductStatus = z.infer<typeof ProductStatusSchema>;
export type ProductCategory = z.infer<typeof ProductCategorySchema>;
export type ProductImage = z.infer<typeof ProductImageSchema>;
export type ProductLocation = z.infer<typeof ProductLocationSchema>;
export type ProductPricing = z.infer<typeof ProductPricingSchema>;
export type ProductSpecification = z.infer<typeof ProductSpecificationSchema>;
export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;
export type ProductSearchParams = z.infer<typeof ProductSearchParamsSchema>;
