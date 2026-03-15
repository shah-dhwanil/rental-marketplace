import { apiFetch } from "@/lib/api";
import type { Promo, PromoValidationResult } from "@/schemas/promo.schema";

export interface CreatePromoPayload {
  code: string;
  scope: "product" | "vendor" | "platform";
  product_id?: string | null;
  vendor_id?: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value?: number | null;
  max_discount?: number | null;
  valid_from: string;      // ISO datetime string
  valid_until: string;     // ISO datetime string
  max_uses?: number | null;
}

export interface UpdatePromoPayload {
  discount_value?: number;
  min_order_value?: number | null;
  max_discount?: number | null;
  valid_from?: string;
  valid_until?: string;
  max_uses?: number | null;
  is_active?: boolean;
}

export interface PaginatedPromos {
  items: Promo[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export async function listMyPromos(
  token: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedPromos> {
  return apiFetch<PaginatedPromos>(
    `/promos/mine?page=${page}&page_size=${pageSize}`,
    {},
    token,
  );
}

export async function createPromo(token: string, body: CreatePromoPayload): Promise<Promo> {
  return apiFetch<Promo>("/promos", { method: "POST", body: JSON.stringify(body) }, token);
}

export async function updatePromo(
  token: string,
  promoId: string,
  body: UpdatePromoPayload,
): Promise<Promo> {
  return apiFetch<Promo>(
    `/promos/${promoId}`,
    { method: "PATCH", body: JSON.stringify(body) },
    token,
  );
}

export async function deletePromo(token: string, promoId: string): Promise<void> {
  await apiFetch<void>(`/promos/${promoId}`, { method: "DELETE" }, token);
}

export async function getPromo(token: string, promoId: string): Promise<Promo> {
  return apiFetch<Promo>(`/promos/${promoId}`, {}, token);
}

export async function validatePromo(
  code: string,
  productId: string,
  orderValue: number,
): Promise<PromoValidationResult> {
  return apiFetch<PromoValidationResult>("/promos/validate", {
    method: "POST",
    body: JSON.stringify({ code, product_id: productId, order_value: orderValue }),
  });
}
