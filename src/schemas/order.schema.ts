/**
 * Zod schemas and TypeScript types for the orders domain.
 */
import { z } from "zod";

export const OrderStatusSchema = z.enum([
  "pending_payment",
  "confirmed",
  "active",
  "completed",
  "cancelled",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const DeliveryTypeSchema = z.enum(["pickup", "home_delivery"]);
export type DeliveryType = z.infer<typeof DeliveryTypeSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  product_id: z.string(),
  vendor_id: z.string(),
  address_id: z.string(),
  device_id: z.string(),
  // Dates
  start_date: z.string(),
  end_date: z.string(),
  delivery_date: z.string(),
  return_date: z.string(),
  rental_days: z.number(),
  delivery_type: z.string(),
  // Promo
  promo_code_id: z.string().nullable(),
  promo_code: z.string().nullable(),
  // Amounts
  security_deposit: z.number(),
  amount: z.number(),
  discount: z.number(),
  net_amount: z.number(),
  cgst_amount: z.number(),
  sgst_amount: z.number(),
  damage_amount: z.number(),
  grand_total: z.number(),
  // Status
  status: z.string(),
  cancellation_reason: z.string().nullable(),
  // Timestamps
  created_at: z.string(),
  updated_at: z.string(),
  // Joined fields
  customer_name: z.string().nullable().optional(),
  customer_email: z.string().nullable().optional(),
  customer_mobile: z.string().nullable().optional(),
  product_name: z.string().nullable().optional(),
  vendor_name: z.string().nullable().optional(),
  vendor_gst: z.string().nullable().optional(),
  vendor_city: z.string().nullable().optional(),
  delivery_address_line: z.string().nullable().optional(),
  defect_charge: z.number().nullable().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

export const PaginatedOrdersSchema = z.object({
  items: z.array(OrderSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  pages: z.number(),
});

export type PaginatedOrders = z.infer<typeof PaginatedOrdersSchema>;

export const CreateOrderResponseSchema = z.object({
  order: OrderSchema,
});

export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;

export interface CreateOrderPayload {
  product_id: string;
  address_id: string;
  start_date: string;
  end_date: string;
  delivery_date: string;
  return_date: string;
  delivery_type: "pickup" | "home_delivery";
  promo_code?: string;
}
