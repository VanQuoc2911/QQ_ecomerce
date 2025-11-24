/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

export interface CartItem {
  _id: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartContextType {
  cart: CartItem[];
  total: number;
  fetchCart: () => void;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  total: 0,
  fetchCart: () => {},
});

export const useCart = () => useContext(CartContext);

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);

const fetchCart = async () => {
  try {
    const res = await api.get("/api/cart/me");
    setCart(res.data.items);
    // ✅ Tính tổng số lượng trực tiếp từ items
    const totalQty = res.data.items.reduce(
      (acc: number, item: CartItem) => acc + item.quantity,
      0
    );
    setTotal(totalQty);
  } catch (err) {
    console.error("❌ Lỗi tải giỏ hàng:", err);
    setCart([]);
    setTotal(0);
  }
};


  useEffect(() => {
    fetchCart();

    // 🔔 Lắng nghe event cartUpdated để tự động fetch giỏ
    const listener = () => fetchCart();
    window.addEventListener("cartUpdated", listener);

    return () => {
      window.removeEventListener("cartUpdated", listener);
    };
  }, []);

  return (
    <CartContext.Provider value={{ cart, total, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}
