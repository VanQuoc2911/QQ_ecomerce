import { api } from "./axios";

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CartResponse {
  _id: string;
  userId: string;
  items: {
    productId: {
      _id: string;
      title: string;
      price: number;
      images: string[];
    };
    quantity: number;
    price: number;
  }[];
}

export const cartService = {
  getCart: async (): Promise<CartResponse> => {
    const { data } = await api.get<CartResponse>("/api/cart");
    return data;
  },

  addToCart: async (item: CartItem): Promise<CartResponse> => {
    const { data } = await api.post<CartResponse>("/api/cart", item);
    return data;
  },

  updateQuantity: async (item: CartItem): Promise<CartResponse> => {
    const { data } = await api.put<CartResponse>("/api/cart", item);
    return data;
  },

  removeFromCart: async (productId: string): Promise<CartResponse> => {
    const { data } = await api.delete<CartResponse>(`/api/cart/${productId}`);
    return data;
  },

  clearCart: async (): Promise<{ message: string }> => {
    const { data } = await api.delete("/api/cart");
    return data;
  },
};
