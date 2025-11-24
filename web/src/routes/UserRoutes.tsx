import { Route, Routes } from "react-router-dom";
import AIChatPage from "../pages/chat/AIChatPage";
import ChatPage from "../pages/chat/ChatPage";
import ShopPage from "../pages/shop/ShopPage";
import BankingPayment from "../pages/user/BankingPayment";
import Cart from "../pages/user/Cart";
import Checkout from "../pages/user/Checkout";
import CheckoutSuccess from "../pages/user/CheckoutSuccess";
import FavoriteProducts from "../pages/user/FavoriteProducts";
import Home from "../pages/user/Home";
import MomoPayment from "../pages/user/MomoPayment";
import Notifications from "../pages/user/Notifications";
import OrderDetail from "../pages/user/OrderDetail";
import OrderHistory from "../pages/user/OrderHistory";
import Orders from "../pages/user/Orders";
import ProductDetail from "../pages/user/ProductDetail";
import Products from "../pages/user/ProductList";
import Profile from "../pages/user/Profile";
import RequestSeller from "../pages/user/RequestSeller";
import SellerInfoSupplement from "../pages/user/SellerInfoSupplement";
import VnpayReturn from "../pages/user/VnpayReturn";

export default function UserRoutes() {
  return (
    <Routes>
      <Route path="home" element={<Home/>} />
      <Route path="products" element={<Products/>} />
      <Route path="products/:id" element={<ProductDetail/>} />
  <Route path="request-seller" element={<RequestSeller />} />
      <Route path="cart" element={<Cart />} />
      <Route path="checkout/cart/:cartId" element={<Checkout />} />
      <Route path="checkout/buy-now/:productId" element={<Checkout />} />
        <Route path="favorites" element={<FavoriteProducts />} />
      <Route path="profile" element={<Profile />} />
      <Route path="orders" element={<Orders />} />
      <Route path="order-history" element={<OrderHistory />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="checkout-success/:orderId" element={<CheckoutSuccess />} />
      <Route path="payment/:orderId/banking" element={<BankingPayment />} />
      <Route path="payment/:orderId/momo" element={<MomoPayment />} />
      <Route path="payment/vnpay-return" element={<VnpayReturn />} />
      <Route path="shop/:shopId" element={<ShopPage />} />
      <Route path="chat/:convId" element={<ChatPage />} />
      <Route path="ai-chat" element={<AIChatPage />} />
      <Route path="Order/:id" element={<OrderDetail/>} />
      <Route path="seller-info/:id" element={<SellerInfoSupplement />} />


    </Routes>
  );
}
