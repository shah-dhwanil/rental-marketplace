import { create } from "zustand";
import { useAuthStore } from "./auth.store";
import { toggleWishlistItem, getWishlistIds } from "@/services/wishlist.service";

interface WishlistState {
  productIds: string[];
  isSyncing: boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  syncFromServer: () => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  // Legacy compat aliases
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  productIds: [],
  isSyncing: false,

  isInWishlist: (productId) => get().productIds.includes(productId),

  clearWishlist: () => set({ productIds: [] }),

  // Called on mount by pages that need fresh wishlist state
  syncFromServer: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    set({ isSyncing: true });
    try {
      const ids = await getWishlistIds(token);
      set({ productIds: ids });
    } catch {
      // silently ignore — keep stale state
    } finally {
      set({ isSyncing: false });
    }
  },

  toggleWishlist: async (productId) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      // Unauthenticated: optimistic local toggle
      set((state) => ({
        productIds: state.productIds.includes(productId)
          ? state.productIds.filter((id) => id !== productId)
          : [...state.productIds, productId],
      }));
      return;
    }
    // Optimistic update
    const wasIn = get().productIds.includes(productId);
    set((state) => ({
      productIds: wasIn
        ? state.productIds.filter((id) => id !== productId)
        : [...state.productIds, productId],
    }));
    try {
      const result = await toggleWishlistItem(productId, token);
      // Reconcile with server truth
      set((state) => {
        const without = state.productIds.filter((id) => id !== productId);
        if (result.in_wishlist) return { productIds: [...without, productId] };
        return { productIds: without };
      });
    } catch {
      // Revert optimistic update on error
      set((state) => ({
        productIds: wasIn
          ? [...state.productIds, productId]
          : state.productIds.filter((id) => id !== productId),
      }));
    }
  },

  // Legacy aliases for backward compat
  addToWishlist: (productId) => {
    set((state) => ({
      productIds: state.productIds.includes(productId)
        ? state.productIds
        : [...state.productIds, productId],
    }));
  },
  removeFromWishlist: (productId) => {
    set((state) => ({
      productIds: state.productIds.filter((id) => id !== productId),
    }));
  },
}));
