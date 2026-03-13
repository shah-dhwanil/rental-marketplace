import { z } from "zod";

export const RentalStatusSchema = z.enum([
  "pending",
  "confirmed",
  "active",
  "completed",
  "cancelled",
  "disputed",
]);

export const PaymentStatusSchema = z.enum([
  "pending",
  "completed",
  "refunded",
  "failed",
]);

export const DeliveryMethodSchema = z.enum(["pickup", "delivery"]);

export const RentalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string(),
  vendorId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: RentalStatusSchema,
  deliveryMethod: DeliveryMethodSchema,
  deliveryAddress: z.string().optional(),
  pickupAddress: z.string().optional(),
  pricing: z.object({
    dailyRate: z.number().positive(),
    totalDays: z.number().int().positive(),
    subtotal: z.number().positive(),
    deposit: z.number().positive(),
    deliveryFee: z.number().nonnegative().default(0),
    tax: z.number().nonnegative().default(0),
    total: z.number().positive(),
  }),
  payment: z.object({
    status: PaymentStatusSchema,
    method: z.string(),
    transactionId: z.string().optional(),
    paidAt: z.string().datetime().optional(),
  }),
  pickupPhotos: z.array(z.string().url()).default([]),
  returnPhotos: z.array(z.string().url()).default([]),
  qrCodeScanned: z.boolean().default(false),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateRentalRequestSchema = z.object({
  productId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  deliveryMethod: DeliveryMethodSchema,
  deliveryAddress: z.string().optional(),
  paymentMethod: z.string(),
});

export const RentalListResponseSchema = z.object({
  rentals: z.array(RentalSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export type Rental = z.infer<typeof RentalSchema>;
export type RentalStatus = z.infer<typeof RentalStatusSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type DeliveryMethod = z.infer<typeof DeliveryMethodSchema>;
export type CreateRentalRequest = z.infer<typeof CreateRentalRequestSchema>;
export type RentalListResponse = z.infer<typeof RentalListResponseSchema>;
