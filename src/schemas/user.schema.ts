import { z } from "zod";

export const UserRoleSchema = z.enum([
  "user",
  "customer",
  "vendor",
  "delivery_partner",
  "admin",
]);

export const UserAddressSchema = z.object({
  id: z.string(),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string().default("USA"),
  isDefault: z.boolean().default(false),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  avatar: z.string().url().optional(),
  role: UserRoleSchema,
  addresses: z.array(UserAddressSchema).default([]),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const VendorProfileSchema = z.object({
  userId: z.string(),
  businessName: z.string(),
  businessDescription: z.string(),
  businessLogo: z.string().url().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  bankAccount: z.object({
    accountNumber: z.string(),
    routingNumber: z.string(),
    accountHolderName: z.string(),
  }).optional(),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().nonnegative().default(0),
  totalRentals: z.number().int().nonnegative().default(0),
  verified: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserAddress = z.infer<typeof UserAddressSchema>;
export type VendorProfile = z.infer<typeof VendorProfileSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
