/**
 * API service functions for customer delivery addresses.
 */
import { apiFetch } from "@/lib/api";

export interface Address {
  id: string;
  customer_id: string;
  name: string;
  person_name: string;
  contact_no: string;
  address: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressPayload {
  name: string;
  person_name: string;
  contact_no: string;
  address: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

export async function listAddresses(token: string): Promise<Address[]> {
  return apiFetch<Address[]>("/addresses", {}, token);
}

export async function createAddress(
  token: string,
  payload: CreateAddressPayload,
): Promise<Address> {
  return apiFetch<Address>("/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function updateAddress(
  token: string,
  addressId: string,
  payload: UpdateAddressPayload,
): Promise<Address> {
  return apiFetch<Address>(`/addresses/${addressId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteAddress(
  token: string,
  addressId: string,
): Promise<void> {
  await apiFetch<void>(`/addresses/${addressId}`, { method: "DELETE" }, token);
}
