import axios from "axios";
import { api } from "./axios";
import { type ApiProduct, productService } from "./productService";

export type PaymentMethod = "banking" | "momo" | "cod" | "qr" | "payos";

// Kiểu giỏ hàng
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
      sellerId?: string;
      shopId?:
        | string
        | {
            _id: string;
            shopName?: string;
            province?: string;
            address?: string;
            lat?: number;
            lng?: number;
          };
    };
    quantity: number;
    price: number;
  }[];
}

// ✅ Kết quả trả về khi thanh toán
export interface CheckoutResult {
  orderId: string;
  message: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  shippingSummary?: {
    method: "standard" | "express" | "rush";
    totalShippingFee: number;
    breakdown: Array<{
      sellerId: string;
      shopId?: string | null;
      fee: number;
      scope: string;
      distanceKm?: number | null;
      shopProvince?: string | null;
      destinationProvince?: string | null;
      usedFallbackDistance?: boolean;
    }>;
  };
}

// ✅ Thông báo cho Navbar cập nhật
const notifyCartUpdated = (totalItems?: number) => {
  const event = new CustomEvent("cartUpdated", { detail: { totalItems } });
  window.dispatchEvent(event);
};

export const cartService = {
  // ✅ Lấy giỏ hàng
  getCart: async (): Promise<CartResponse> => {
    const { data } = await api.get<CartResponse>("/api/cart");
    return data;
  },

  // ✅ Thêm vào giỏ
  addToCart: async (item: CartItem): Promise<CartResponse> => {
    // Prevent sellers from adding products to cart (business rule)
    try {
      const role = localStorage.getItem("userRole");
      if (role === "seller") throw new Error("Sellers are not allowed to purchase items.");
    } catch (err) {
      // If storage isn't available, continue and let server enforce rules
    }
    const product: ApiProduct = await productService.getProductById(item.productId);

    if (item.quantity > product.stock) {
      throw new Error(`Số lượng vượt quá tồn kho. Hiện tại chỉ còn ${product.stock}.`);
    }

    const { data } = await api.post<CartResponse>("/api/cart", item);
    // Tính tổng số lượng và gửi trong event
    const totalItems = data.items.reduce((sum, it) => sum + it.quantity, 0);
    notifyCartUpdated(totalItems);
    return data;
  },

  // ✅ Cập nhật số lượng
  updateQuantity: async (item: CartItem): Promise<CartResponse> => {
    // Prevent sellers from modifying cart quantities
    try {
      const role = localStorage.getItem("userRole");
      if (role === "seller") throw new Error("Sellers are not allowed to purchase items.");
    } catch (err) {
      // ignore
    }
    const product: ApiProduct = await productService.getProductById(item.productId);

    if (item.quantity > product.stock) {
      throw new Error(`Số lượng vượt quá tồn kho. Hiện tại chỉ còn ${product.stock}.`);
    }

    const { data } = await api.put<CartResponse>("/api/cart", item);
    // Tính tổng số lượng và gửi trong event
    const totalItems = data.items.reduce((sum, it) => sum + it.quantity, 0);
    notifyCartUpdated(totalItems);
    return data;
  },

  // ✅ Xóa khỏi giỏ
  removeFromCart: async (productId: string): Promise<CartResponse> => {
    const { data } = await api.delete<CartResponse>(`/api/cart/${productId}`);
    // Tính tổng số lượng và gửi trong event
    const totalItems = data.items.reduce((sum, it) => sum + it.quantity, 0);
    notifyCartUpdated(totalItems);
    return data;
  },

  // ✅ Xóa toàn bộ giỏ
  clearCart: async (): Promise<{ message: string }> => {
    const { data } = await api.delete("/api/cart");
    notifyCartUpdated(0);
    return data;
  },

  // ✅ Thanh toán
  checkout: async (payload: {
    userId: string;
    fullName: string;
    email: string;
    address: string;
    paymentMethod: PaymentMethod;
    items: CartResponse["items"];
    total: number;
    mode: "cart" | "buy-now";
    productId?: string;
    shippingAddress?: {
      name: string;
      phone: string;
      province: string;
      district: string;
      ward: string;
      detail: string;
      lat?: number;
      lng?: number;
      type?: "home" | "office";
      isDefault?: boolean;
    };
    shippingOption: {
      method: "standard" | "express" | "rush";
      rushDistanceKm?: number;
    };
  }): Promise<CheckoutResult> => {
    // Prevent sellers from performing checkout
    try {
      const role = localStorage.getItem("userRole");
      if (role === "seller") throw new Error("Sellers are not allowed to perform purchases.");
    } catch (err) {
      // ignore and let server enforce
    }
    // Kiểm tra tồn kho
    for (const item of payload.items) {
      const product = await productService.getProductById(item.productId._id);
      if (item.quantity > product.stock) {
        throw new Error(
          `Sản phẩm "${product.title}" chỉ còn ${product.stock} sản phẩm.`
        );
      }
    }

    // Gửi thanh toán
    let data;
    try {
      const res = await api.post<CheckoutResult>("/api/checkout", payload);
      data = res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const serverMsg = err.response?.data?.message as string | undefined;
        throw new Error(serverMsg || err.message || "Thanh toán thất bại");
      }
      throw new Error("Thanh toán thất bại");
    }

    // Nếu thanh toán giỏ thì clear giỏ
    if (payload.mode === "cart") {
      await cartService.clearCart();
    }

    return data;
  },
  
};
