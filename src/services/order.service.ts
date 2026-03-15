/**
 * API service functions for the orders domain.
 */
import { apiFetch, API_BASE } from "@/lib/api";
import type {
  CreateOrderPayload,
  CreateOrderResponse,
  Order,
  PaginatedOrders,
} from "@/schemas/order.schema";

export async function createOrder(
  token: string,
  payload: CreateOrderPayload,
): Promise<CreateOrderResponse> {
  return apiFetch<CreateOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function confirmPayment(
  token: string,
  orderId: string,
): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/confirm-payment`, {
    method: "POST",
  }, token);
}

export async function getOrder(token: string, orderId: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}`, {}, token);
}

export async function listMyOrders(
  token: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedOrders> {
  return apiFetch<PaginatedOrders>(
    `/orders/my?page=${page}&page_size=${pageSize}`,
    {},
    token,
  );
}

export async function listVendorOrders(
  token: string,
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<PaginatedOrders> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) params.set("status", status);
  return apiFetch<PaginatedOrders>(`/orders/vendor?${params}`, {}, token);
}

export async function listAllOrders(
  token: string,
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<PaginatedOrders> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) params.set("status", status);
  return apiFetch<PaginatedOrders>(`/orders?${params}`, {}, token);
}

export async function updateOrderStatus(
  token: string,
  orderId: string,
  status: string,
  cancellationReason?: string,
): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, cancellation_reason: cancellationReason }),
  }, token);
}

/** Downloads an order PDF (invoice or contract) using the authenticated token. */
export async function downloadOrderPdf(
  token: string,
  orderId: string,
  type: "invoice" | "contract",
): Promise<void> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to download ${type} (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `order-${orderId.slice(0, 8)}-${type}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
