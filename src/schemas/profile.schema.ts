import { z } from "zod";

// ── Base user fields shared by all roles ─────────────────────────────────────

const BaseProfileSchema = z.object({
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
});

// ── Role-specific profile response schemas ────────────────────────────────────

export const CustomerProfileSchema = BaseProfileSchema.extend({
  loyalty_points: z.number(),
});

export const VendorProfileSchema = BaseProfileSchema.extend({
  vendor_name: z.string().nullable().optional(),
  gst_no: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  is_business_verified: z.boolean(),
});

export const DeliveryPartnerProfileSchema = BaseProfileSchema.extend({
  dp_name: z.string().nullable().optional(),
  gst_no: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  is_business_verified: z.boolean(),
});

export const AdminProfileSchema = BaseProfileSchema;

// Merged schema — all role-specific fields are optional; we parse any profile
// response without needing to know the role ahead of time.
export const AnyProfileSchema = BaseProfileSchema.extend({
  loyalty_points: z.number().optional(),
  vendor_name: z.string().nullable().optional(),
  dp_name: z.string().nullable().optional(),
  gst_no: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  is_business_verified: z.boolean().optional(),
});

// ── Update profile request ────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  address: z.string().min(5, "Address must be at least 5 characters").optional(),
  city: z.string().min(2, "City is required").optional(),
  pincode: z.string().length(6, "Pincode must be 6 digits").regex(/^\d+$/, "Digits only").optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;
export type VendorProfile = z.infer<typeof VendorProfileSchema>;
export type DeliveryPartnerProfile = z.infer<typeof DeliveryPartnerProfileSchema>;
export type AnyProfile = z.infer<typeof AnyProfileSchema>;
export type UpdateProfileForm = z.infer<typeof UpdateProfileSchema>;
