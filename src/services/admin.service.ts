import { apiFetch } from "@/lib/api";
import {
  PaginatedUsersSchema,
  AdminUserDetailSchema,
  type PaginatedUsers,
  type AdminUserDetail,
} from "@/schemas/admin.schema";

export async function listAdminUsers(
  token: string,
  params?: {
    page?: number;
    page_size?: number;
    role?: string;
    is_verified?: boolean;
    q?: string;
  },
): Promise<PaginatedUsers> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.role) qs.set("role", params.role);
  if (params?.is_verified !== undefined) qs.set("is_verified", String(params.is_verified));
  if (params?.q) qs.set("q", params.q);
  const data = await apiFetch<unknown>(`/users/admin/users?${qs.toString()}`, {}, token);
  return PaginatedUsersSchema.parse(data);
}

export async function getAdminUser(token: string, userId: string): Promise<AdminUserDetail> {
  const data = await apiFetch<unknown>(`/users/admin/users/${userId}`, {}, token);
  return AdminUserDetailSchema.parse(data);
}

export async function verifyUser(token: string, userId: string): Promise<void> {
  await apiFetch<void>(`/users/admin/users/${userId}/verify`, { method: "PATCH" }, token);
}

export async function updateUserStatus(
  token: string,
  userId: string,
  is_active: boolean,
): Promise<void> {
  await apiFetch<void>(
    `/users/admin/users/${userId}/status`,
    { method: "PATCH", body: JSON.stringify({ is_active }) },
    token,
  );
}

export async function deleteAdminUser(token: string, userId: string): Promise<void> {
  await apiFetch<void>(`/users/admin/users/${userId}`, { method: "DELETE" }, token);
}
