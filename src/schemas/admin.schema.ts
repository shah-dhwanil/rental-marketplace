import { z } from "zod";

export const UserSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email_id: z.string(),
  role: z.string(),
  is_verified: z.boolean(),
  is_active: z.boolean(),
  is_profile_complete: z.boolean(),
  created_at: z.string(),
});

export const PaginatedUsersSchema = z.object({
  items: z.array(UserSummarySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  pages: z.number(),
});

export const AdminUserDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  email_id: z.string(),
  mobile_no: z.string(),
  role: z.string(),
  profile_photo_url: z.string().nullable().optional(),
  is_verified: z.boolean(),
  is_active: z.boolean(),
  is_profile_complete: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  loyalty_points: z.number().nullable().optional(),
  vendor_name: z.string().nullable().optional(),
  dp_name: z.string().nullable().optional(),
  gst_no: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  bank_details: z.unknown().nullable().optional(),
  is_business_verified: z.boolean().nullable().optional(),
});

export type UserSummary = z.infer<typeof UserSummarySchema>;
export type PaginatedUsers = z.infer<typeof PaginatedUsersSchema>;
export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;
