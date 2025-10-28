import { Route, Routes } from "react-router-dom";
import Checkout from "../pages/user/Checkout";
import Home from "../pages/user/Home";
import ProductDetail from "../pages/user/ProductDetail";
import Products from "../pages/user/ProductList";
import Profile from "../pages/user/Profile";

export default function UserRoutes() {
  return (
    <Routes>
      <Route path="home" element={<Home />} />
      <Route path="products" element={<Products />} />
      <Route path="product/:id" element={<ProductDetail />} />
      {/* <Route path="cart" element={<Cart />} /> */}
      <Route path="checkout" element={<Checkout />} />
      <Route path="profile" element={<Profile />} />
    </Routes>
  );
}
