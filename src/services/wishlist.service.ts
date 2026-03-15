import { apiFetch } from "@/lib/api";

export interface WishlistItem {
  product_id: string;
  added_at: string;
}

export interface WishlistToggleResult {
  product_id: string;
  in_wishlist: boolean;
}

export async function getWishlistIds(token: string): Promise<string[]> {
  const res = await apiFetch<{ product_ids: string[] }>("/wishlist/ids", {}, token);
  return res.product_ids;
}

export async function toggleWishlistItem(productId: string, token: string): Promise<WishlistToggleResult> {
  return apiFetch<WishlistToggleResult>(
    `/wishlist/toggle/${productId}`,
    { method: "POST" },
    token,
  );
}

export async function removeWishlistItem(productId: string, token: string): Promise<void> {
  await apiFetch<void>(`/wishlist/${productId}`, { method: "DELETE" }, token);
}

export async function listWishlist(token: string): Promise<WishlistItem[]> {
  return apiFetch<WishlistItem[]>("/wishlist", {}, token);
}
