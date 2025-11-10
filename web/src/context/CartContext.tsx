import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";

interface CartItem {
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

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);

  const fetchCart = async () => {
    try {
      const res = await axios.get("/api/cart/me"); // endpoint backend
      setCart(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error("❌ Lỗi tải giỏ hàng:", err);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  return (
    <CartContext.Provider value={{ cart, total, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}
