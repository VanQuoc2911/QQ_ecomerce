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

// 🔥 Hàm tiện ích: phát sự kiện để Navbar cập nhật tự động
const notifyCartUpdated = () => {
  window.dispatchEvent(new Event("cartUpdated"));
};

export const cartService = {
  getCart: async (): Promise<CartResponse> => {
    const { data } = await api.get<CartResponse>("/api/cart");
    return data;
  },

  addToCart: async (item: CartItem): Promise<CartResponse> => {
    const { data } = await api.post<CartResponse>("/api/cart", item);
    notifyCartUpdated(); // 🔔 phát event khi thêm sản phẩm
    return data;
  },

  updateQuantity: async (item: CartItem): Promise<CartResponse> => {
    const { data } = await api.put<CartResponse>("/api/cart", item);
    notifyCartUpdated(); // 🔔 phát event khi cập nhật số lượng
    return data;
  },

  removeFromCart: async (productId: string): Promise<CartResponse> => {
    const { data } = await api.delete<CartResponse>(`/api/cart/${productId}`);
    notifyCartUpdated(); // 🔔 phát event khi xóa sản phẩm
    return data;
  },

  clearCart: async (): Promise<{ message: string }> => {
    const { data } = await api.delete("/api/cart");
    notifyCartUpdated(); // 🔔 phát event khi làm trống giỏ
    return data;
  },

  // ✅ Hàm checkout full, dùng payload, không báo ESLint
  checkout: async (payload: {
    fullName: string;
    email: string;
    address: string;
    paymentMethod: string;
    items: CartResponse["items"];
    total: number;
  }): Promise<{ message: string }> => {
    // 🔹 Log payload để debug hoặc sau này gửi API thật
    console.log("🚀 Checkout payload:", payload);

    // 🔹 Giả lập delay thanh toán
    await new Promise((res) => setTimeout(res, 1000));

    // 🔹 Xóa giỏ hàng sau khi thanh toán
    await cartService.clearCart();

    return { message: "Thanh toán thành công!" };
  },
};
