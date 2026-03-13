import { apiFetch, API_BASE } from "@/lib/api";
import {
  CategorySchema,
  CategoryDetailSchema,
  PaginatedCategoriesSchema,
  PaginatedProductsSchema,
  PaginatedDevicesSchema,
  ProductSchema,
  DeviceSchema,
  type Category,
  type CategoryDetail,
  type Device,
  type PaginatedCategories,
  type PaginatedProducts,
  type PaginatedDevices,
  type Product,
} from "@/schemas/catalog.schema";

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories(params?: {
  page?: number;
  page_size?: number;
  q?: string;
}): Promise<PaginatedCategories> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.q) qs.set("q", params.q);
  const data = await apiFetch<unknown>(`/categories?${qs.toString()}`);
  return PaginatedCategoriesSchema.parse(data);
}

export async function getCategory(id: string): Promise<CategoryDetail> {
  const data = await apiFetch<unknown>(`/categories/${id}`);
  return CategoryDetailSchema.parse(data);
}

export async function createCategory(
  token: string,
  body: Record<string, unknown>,
): Promise<Category> {
  const data = await apiFetch<unknown>(
    `/categories`,
    { method: "POST", body: JSON.stringify(body) },
    token,
  );
  return CategorySchema.parse(data);
}

export async function updateCategory(
  token: string,
  categoryId: string,
  body: Record<string, unknown>,
): Promise<Category> {
  const data = await apiFetch<unknown>(
    `/categories/${categoryId}`,
    { method: "PATCH", body: JSON.stringify(body) },
    token,
  );
  return CategorySchema.parse(data);
}

export async function deleteCategory(token: string, categoryId: string): Promise<void> {
  await apiFetch<void>(`/categories/${categoryId}`, { method: "DELETE" }, token);
}

export async function uploadCategoryImage(
  token: string,
  categoryId: string,
  file: File,
): Promise<{ image_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/categories/${categoryId}/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `Upload failed (${res.status})`);
  }
  return res.json() as Promise<{ image_url: string }>;
}

export async function deleteCategoryImage(token: string, categoryId: string): Promise<void> {
  await apiFetch<void>(`/categories/${categoryId}/image`, { method: "DELETE" }, token);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function listAllProducts(params?: {
  page?: number;
  page_size?: number;
  category_id?: string;
  is_active?: boolean;
  q?: string;
}): Promise<PaginatedProducts> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.category_id) qs.set("category_id", params.category_id);
  if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
  if (params?.q) qs.set("q", params.q);
  const data = await apiFetch<unknown>(`/products?${qs.toString()}`);
  return PaginatedProductsSchema.parse(data);
}

export async function listMyProducts(
  token: string,
  params?: {
    page?: number;
    page_size?: number;
    category_id?: string;
    is_active?: boolean;
    q?: string;
  },
): Promise<PaginatedProducts> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.category_id) qs.set("category_id", params.category_id);
  if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
  if (params?.q) qs.set("q", params.q);
  const data = await apiFetch<unknown>(`/products/vendor/me?${qs.toString()}`, {}, token);
  return PaginatedProductsSchema.parse(data);
}

export async function getProduct(id: string, token?: string): Promise<Product> {
  const data = await apiFetch<unknown>(`/products/${id}`, {}, token);
  return ProductSchema.parse(data);
}

export async function createProduct(
  token: string,
  body: Record<string, unknown>,
): Promise<Product> {
  const data = await apiFetch<unknown>(
    `/products`,
    { method: "POST", body: JSON.stringify(body) },
    token,
  );
  return ProductSchema.parse(data);
}

export async function updateProduct(
  token: string,
  productId: string,
  body: Record<string, unknown>,
): Promise<Product> {
  const data = await apiFetch<unknown>(
    `/products/${productId}`,
    { method: "PATCH", body: JSON.stringify(body) },
    token,
  );
  return ProductSchema.parse(data);
}

export async function deleteProduct(token: string, productId: string): Promise<void> {
  await apiFetch<void>(`/products/${productId}`, { method: "DELETE" }, token);
}

export async function uploadProductImage(
  token: string,
  productId: string,
  file: File,
): Promise<Product> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/products/${productId}/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `Upload failed (${res.status})`);
  }
  const data = await res.json();
  return ProductSchema.parse(data);
}

export async function deleteProductImage(
  token: string,
  productId: string,
  index: number,
): Promise<Product> {
  const data = await apiFetch<unknown>(
    `/products/${productId}/images/${index}`,
    { method: "DELETE" },
    token,
  );
  return ProductSchema.parse(data);
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export async function listDevices(
  token: string,
  params?: {
    page?: number;
    page_size?: number;
    product_id?: string;
    is_active?: boolean;
  },
): Promise<PaginatedDevices> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.product_id) qs.set("product_id", params.product_id);
  if (params?.is_active !== undefined) qs.set("is_active", String(params.is_active));
  const data = await apiFetch<unknown>(`/devices?${qs.toString()}`, {}, token);
  return PaginatedDevicesSchema.parse(data);
}

export async function getDevice(token: string, deviceId: string): Promise<Device> {
  const data = await apiFetch<unknown>(`/devices/${deviceId}`, {}, token);
  return DeviceSchema.parse(data);
}

export async function createDevice(
  token: string,
  body: Record<string, unknown>,
): Promise<Device> {
  const data = await apiFetch<unknown>(
    `/devices`,
    { method: "POST", body: JSON.stringify(body) },
    token,
  );
  return DeviceSchema.parse(data);
}

export async function updateDevice(
  token: string,
  deviceId: string,
  body: Record<string, unknown>,
): Promise<Device> {
  const data = await apiFetch<unknown>(
    `/devices/${deviceId}`,
    { method: "PATCH", body: JSON.stringify(body) },
    token,
  );
  return DeviceSchema.parse(data);
}

export async function deleteDevice(token: string, deviceId: string): Promise<void> {
  await apiFetch<void>(`/devices/${deviceId}`, { method: "DELETE" }, token);
}
