import { Route, Routes } from "react-router-dom";
import Cart from "../pages/user/Cart";
import Checkout from "../pages/user/Checkout";
import CheckoutSuccess from "../pages/user/CheckoutSuccess";
import Home from "../pages/user/Home";
import ProductDetail from "../pages/user/ProductDetail";
import Products from "../pages/user/ProductList";
import Profile from "../pages/user/Profile";

export default function UserRoutes() {
  return (
    <Routes>
      <Route path="home" element={<Home/>} />
      <Route path="products" element={<Products/>} />
      <Route path="products/:id" element={<ProductDetail/>} />
      <Route path="cart" element={<Cart />} />
      <Route path="checkout" element={<Checkout />} />
      <Route path="profile" element={<Profile />} />
      <Route path="checkout-success" element={<CheckoutSuccess />} />

    </Routes>
  );
}
