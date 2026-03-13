import { z } from "zod";

// ── Role ──────────────────────────────────────────────────────────────────────

export const APP_ROLES = ["customer", "vendor", "delivery_partner"] as const;
export const AppRoleSchema = z.enum(APP_ROLES);
export type AppRole = z.infer<typeof AppRoleSchema>;

export const ROLE_LABELS: Record<AppRole, string> = {
  customer: "Customer",
  vendor: "Vendor",
  delivery_partner: "Delivery Partner",
};

// ── Register Step 1 ───────────────────────────────────────────────────────────

export const RegisterStep1Schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email_id: z.string().email("Enter a valid email address"),
    mobile_no: z
      .string()
      .min(10, "Enter at least 10 digits")
      .max(15, "Mobile number is too long")
      .regex(/^[+\d\s\-()|]+$/, "Invalid mobile number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[0-9]/, "Must include a number")
      .regex(/[^A-Za-z0-9]/, "Must include a special character"),
    confirm_password: z.string(),
    role: AppRoleSchema,
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export type RegisterStep1Form = z.infer<typeof RegisterStep1Schema>;

// ── Login ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email_id: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  role: AppRoleSchema,
});

export type LoginForm = z.infer<typeof LoginSchema>;

// ── Vendor / DP Step 2 ────────────────────────────────────────────────────────

export const ProfileStep2Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  gst_no: z.string().optional(),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  pincode: z
    .string()
    .length(6, "Pincode must be exactly 6 digits")
    .regex(/^\d+$/, "Pincode must be numeric"),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export type ProfileStep2Form = z.infer<typeof ProfileStep2Schema>;

// ── Bank Details Step 3 ───────────────────────────────────────────────────────

export const BankDetailsSchema = z.object({
  account_number: z
    .string()
    .min(8, "Account number must be at least 8 digits")
    .regex(/^\d+$/, "Account number must be numeric"),
  ifsc_code: z
    .string()
    .length(11, "IFSC code must be exactly 11 characters")
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"),
  account_holder_name: z
    .string()
    .min(2, "Account holder name is required"),
  bank_name: z.string().min(2, "Bank name is required"),
});

export const Step3Schema = z.object({
  bank_details: BankDetailsSchema,
});

export type BankDetailsForm = z.infer<typeof BankDetailsSchema>;
export type Step3Form = z.infer<typeof Step3Schema>;

// ── API Responses ─────────────────────────────────────────────────────────────

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
});

export const TempTokenResponseSchema = z.object({
  temp_token: z.string(),
  token_type: z.string(),
  registration_step: z.number().int().optional(),
});

export const LoginResponseSchema = z.union([
  TokenResponseSchema,
  TempTokenResponseSchema,
]);

export const MeResponseSchema = z.object({
  user_id: z.string(),
  role: z.string(),
  name: z.string(),
  email_id: z.string(),
  is_profile_complete: z.boolean(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type TempTokenResponse = z.infer<typeof TempTokenResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
