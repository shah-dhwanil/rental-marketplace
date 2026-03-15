/**
 * API service functions for stored payment methods.
 */
import { apiFetch } from "@/lib/api";

export type PaymentType = "card" | "upi" | "net_banking" | "wallet";

export interface PaymentMethod {
  id: string;
  customer_id: string;
  type: PaymentType;
  display_label: string; // e.g. "•••• 4242", "user@upi"
  created_at: string;
}

export interface CardDetails {
  last4: string;
  expiry_month: number;
  expiry_year: number;
  holder_name: string;
  network?: string;
}

export interface UPIDetails {
  upi_id: string;
}

export interface NetBankingDetails {
  bank_name: string;
  account_last4?: string;
}

export interface WalletDetails {
  wallet_name: string;
  linked_mobile?: string;
}

export type PaymentDetails = CardDetails | UPIDetails | NetBankingDetails | WalletDetails;

export interface AddPaymentMethodPayload {
  type: PaymentType;
  details: PaymentDetails;
}

export async function listPaymentMethods(token: string): Promise<PaymentMethod[]> {
  return apiFetch<PaymentMethod[]>("/payment-methods", {}, token);
}

export async function addPaymentMethod(
  token: string,
  payload: AddPaymentMethodPayload,
): Promise<PaymentMethod> {
  return apiFetch<PaymentMethod>("/payment-methods", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function deletePaymentMethod(
  token: string,
  pmId: string,
): Promise<void> {
  await apiFetch<void>(`/payment-methods/${pmId}`, { method: "DELETE" }, token);
}
