import { z } from "zod";

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  parent_category_id: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CategoryDetailSchema = CategorySchema.extend({
  children: z.array(CategorySchema).default([]),
});

export const PaginatedCategoriesSchema = z.object({
  items: z.array(CategorySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  pages: z.number(),
});

export type Category = z.infer<typeof CategorySchema>;
export type CategoryDetail = z.infer<typeof CategoryDetailSchema>;
export type PaginatedCategories = z.infer<typeof PaginatedCategoriesSchema>;

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export const ProductSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  image_urls: z.array(z.string()).default([]),
  category_id: z.string(),
  vendor_id: z.string(),
  price_day: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  is_active: z.boolean(),
  reserved_qty: z.number(),
  created_at: z.string(),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  properties: z.record(z.string(), z.unknown()).default({}),
  image_urls: z.array(z.string()).default([]),
  reserved_qty: z.number(),
  category_id: z.string(),
  vendor_id: z.string(),
  price_day: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  price_week: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  price_month: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  security_deposit: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  defect_charge: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PaginatedProductsSchema = z.object({
  items: z.array(ProductSummarySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  pages: z.number(),
});

export type ProductSummary = z.infer<typeof ProductSummarySchema>;
export type Product = z.infer<typeof ProductSchema>;
export type PaginatedProducts = z.infer<typeof PaginatedProductsSchema>;

// ---------------------------------------------------------------------------
// Device
// ---------------------------------------------------------------------------

export const DeviceSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  serial_no: z.string().nullable().optional(),
  condition: z.enum(["new", "good", "fair", "poor"]),
  properties: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PaginatedDevicesSchema = z.object({
  items: z.array(DeviceSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  pages: z.number(),
});

export type Device = z.infer<typeof DeviceSchema>;
export type PaginatedDevices = z.infer<typeof PaginatedDevicesSchema>;

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------

export type CreateProductForm = {
  name: string;
  description: string;
  category_id: string;
  price_day: string;
  price_week: string;
  price_month: string;
  security_deposit: string;
  defect_charge: string;
  is_active: boolean;
  properties: string; // JSON string
};

export type CreateDeviceForm = {
  product_id: string;
  serial_no: string;
  condition: string;
  properties: string; // JSON string
  is_active: boolean;
};
