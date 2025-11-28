import { create } from "zustand";

export interface CartItem {
  product_id: number;
  product_name: string;
  sku: string | null;
  price: number;
  quantity: number;
  image_url: string | null;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => {
    const existingItem = get().items.find(
      (i) => i.product_id === item.product_id,
    );
    if (existingItem) {
      set({
        items: get().items.map((i) =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + (item.quantity || 1) }
            : i,
        ),
      });
    } else {
      set({
        items: [...get().items, { ...item, quantity: item.quantity || 1 }],
      });
    }
  },
  removeItem: (productId) => {
    set({
      items: get().items.filter((item) => item.product_id !== productId),
    });
  },
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set({
      items: get().items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item,
      ),
    });
  },
  clearCart: () => {
    set({ items: [] });
  },
  getTotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  },
  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

