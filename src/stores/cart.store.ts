import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  totalDays: number;
  deposit: number;
  deliveryMethod: "pickup" | "delivery";
  deliveryFee: number;
}

interface CartState {
  items: CartItem[];
  
  // Actions
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateCartItem: (productId: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  
  // Computed
  getItemCount: () => number;
  getTotal: () => number;
  getSubtotal: () => number;
  getTotalDeposit: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addToCart: (item) => {
        set((state) => {
          // Check if item already exists
          const exists = state.items.find(i => i.productId === item.productId);
          
          if (exists) {
            // Update existing item
            return {
              items: state.items.map(i =>
                i.productId === item.productId ? item : i
              ),
            };
          }
          
          // Add new item
          return {
            items: [...state.items, item],
          };
        });
      },
      
      removeFromCart: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.productId !== productId),
        }));
      },
      
      updateCartItem: (productId, updates) => {
        set((state) => ({
          items: state.items.map(i =>
            i.productId === productId ? { ...i, ...updates } : i
          ),
        }));
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getItemCount: () => {
        return get().items.length;
      },
      
      getSubtotal: () => {
        return get().items.reduce((sum, item) => 
          sum + (item.dailyRate * item.totalDays), 0
        );
      },
      
      getTotalDeposit: () => {
        return get().items.reduce((sum, item) => sum + item.deposit, 0);
      },
      
      getTotal: () => {
        const items = get().items;
        const subtotal = get().getSubtotal();
        const deposit = get().getTotalDeposit();
        const deliveryFee = items.reduce((sum, item) => sum + item.deliveryFee, 0);
        
        return subtotal + deposit + deliveryFee;
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
