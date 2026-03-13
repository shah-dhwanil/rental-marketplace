import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WishlistState {
  productIds: string[];
  
  // Actions
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],
      
      addToWishlist: (productId) => {
        set((state) => {
          if (!state.productIds.includes(productId)) {
            return {
              productIds: [...state.productIds, productId],
            };
          }
          return state;
        });
      },
      
      removeFromWishlist: (productId) => {
        set((state) => ({
          productIds: state.productIds.filter(id => id !== productId),
        }));
      },
      
      toggleWishlist: (productId) => {
        const current = get();
        if (current.isInWishlist(productId)) {
          current.removeFromWishlist(productId);
        } else {
          current.addToWishlist(productId);
        }
      },
      
      isInWishlist: (productId) => {
        return get().productIds.includes(productId);
      },
      
      clearWishlist: () => {
        set({ productIds: [] });
      },
    }),
    {
      name: "wishlist-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
