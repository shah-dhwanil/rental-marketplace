/**
 * API service functions for order defect charges
 */
import { apiFetch } from "@/lib/api";
import { z } from "zod";

// Defect charge schemas
export const DefectChargeSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  vendorId: z.string().uuid(),
  amount: z.number(),
  description: z.string(),
  images: z.array(z.string().url()).default([]),
  stripePaymentIntentId: z.string().optional(),
  status: z.enum(["pending", "paid", "disputed", "waived"]),
  paidAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DefectChargeListSchema = z.object({
  items: z.array(DefectChargeSchema),
  total: z.number(),
});

export type DefectCharge = z.infer<typeof DefectChargeSchema>;
export type DefectChargeList = z.infer<typeof DefectChargeListSchema>;

/**
 * Get defect charges for an order
 */
export async function getOrderDefects(token: string, orderId: string): Promise<DefectChargeList> {
  const response = await apiFetch(`/defects/orders/${orderId}`, {}, token);
  return DefectChargeListSchema.parse(response);
}

/**
 * Get a defect charge by ID
 */
export async function getDefectCharge(token: string, defectId: string): Promise<DefectCharge> {
  const response = await apiFetch(`/defects/${defectId}`, {}, token);
  return DefectChargeSchema.parse(response);
}

/**
 * Confirm payment for a defect charge
 */
export async function confirmDefectPayment(token: string, defectId: string): Promise<DefectCharge> {
  const response = await apiFetch(`/defects/${defectId}/confirm-payment`, {
    method: "POST",
  }, token);
  return DefectChargeSchema.parse(response);
}

/**
 * Update defect charge status
 */
export async function updateDefectStatus(
  token: string,
  defectId: string,
  status: "paid" | "disputed" | "waived"
): Promise<DefectCharge> {
  const response = await apiFetch(`/defects/${defectId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, token);
  return DefectChargeSchema.parse(response);
}
