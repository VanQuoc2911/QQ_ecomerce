// src/pages/CheckoutSuccessPage.tsx
import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import { useEffect, useState, type JSX } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { orderService, type OrderDetailResponse } from "../../api/orderService";
import type { OrderItem } from "../../types/Order";

export default function CheckoutSuccessPage(): JSX.Element {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const { orderId } = useParams<{ orderId?: string }>();

  useEffect(() => {
    (async () => {
      // If we have orderId as route param, fetch full order detail from API
      if (orderId) {
        try {
          const data = await orderService.getOrderDetail(orderId);
          setOrder(data);
          return;
        } catch (err) {
          // continue to fallback below
          console.error(err);
        }
      }

      // fallback: check location state or localStorage
      if (location.state && (location.state as { order?: OrderDetailResponse }).order) {
        setOrder((location.state as { order: OrderDetailResponse }).order);
      } else {
        const savedOrder = localStorage.getItem("lastOrder");
        if (savedOrder) setOrder(JSON.parse(savedOrder));
      }
    })();
  }, [location.state, orderId]);

  if (!order) {
    return (
      <Container sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Không tìm thấy đơn hàng.
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 3 }}
          onClick={() => navigate("/")}
        >
          Quay về trang chủ
        </Button>
      </Container>
    );
  }

  // normalize items whether backend returns `items` or `products`
  type NormalizedItem = {
    id: string;
    title: string;
    images?: string[];
    quantity: number;
    unitPrice: number;
    subTotal: number;
  };
  // Extend Order type with optional backend-only fields to avoid `any`
  type ExtendedOrder = OrderDetailResponse & Partial<{
    totalAmount: number;
    paymentMethod: string;
    shippingFee: number;
    discount: number;
    products: OrderItem[];
    items: OrderItem[];
  }>;

  const orderExt = order as ExtendedOrder;
  type FlexibleItem = {
    productId?: { _id?: string; title?: string; images?: string[]; price?: number };
    title?: string;
    images?: string[];
    price?: number;
    quantity?: number;
    _id?: string;
  };

  const rawItems = (orderExt.items ?? orderExt.products ?? []) as FlexibleItem[];
  const items: NormalizedItem[] = (rawItems || []).map((it, idx) => {
    // shape may be { productId: {...}, quantity, price } or { productId, title, quantity, price }
    const productRef = it.productId ?? null;
    const title = productRef?.title ?? it.title ?? `Sản phẩm ${idx + 1}`;
    const id = productRef?._id ?? it._id ?? String(idx);
    const images = productRef?.images ?? it.images ?? [];
    const unitPrice = (it.price ?? productRef?.price ?? 0) as number;
    const quantity = it.quantity ?? 1;
    const subTotal = unitPrice * quantity;
    return { id, title, images, quantity, unitPrice, subTotal } as NormalizedItem;
  });
  const totalPrice = orderExt.totalAmount ?? items.reduce((acc, i) => acc + i.subTotal, 0);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 6,
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #101820, #1a273a)"
            : "linear-gradient(135deg, #e3f2fd, #f5f7fa)",
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: 5, borderRadius: 4, textAlign: "center" }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            ✅ Thanh toán thành công!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Cảm ơn bạn đã mua sắm. Đơn hàng của bạn đã được ghi nhận.
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" fontWeight={600} gutterBottom>
            Thông tin đơn hàng
          </Typography>
          <Typography>
            Mã đơn hàng: <strong>{order._id}</strong>
          </Typography>
          <Typography>
            Ngày đặt: {new Date(order.createdAt ?? Date.now()).toLocaleString()}
          </Typography>
          <Typography>
            Người nhận: {order.shippingAddress?.name ?? order.customerName}
          </Typography>
          <Typography>Điện thoại: {order.shippingAddress?.phone ?? "-"}</Typography>
          <Typography>
            Địa chỉ: {order.shippingAddress ? `${order.shippingAddress.detail ?? order.shippingAddress.address ?? ""}, ${order.shippingAddress.ward ?? ""}, ${order.shippingAddress.district ?? ""}, ${order.shippingAddress.province ?? order.shippingAddress.city ?? ""}` : "-"}
          </Typography>
          <Typography>Phương thức thanh toán: {(orderExt.paymentMethod ?? "-")}</Typography>
          <Typography>Trạng thái: {order.status ?? "Đang xử lý"}</Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" fontWeight={700} gutterBottom>
            Chi tiết sản phẩm
          </Typography>
          {items.map((item) => (
            <Box
              key={item.id}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={1.5}
            >
              <Box display="flex" alignItems="center">
                <Box
                  component="img"
                  src={item.images?.[0] ?? "/placeholder.png"}
                  alt={item.title}
                  sx={{ width: 64, height: 64, objectFit: "cover", borderRadius: 1, mr: 2 }}
                />
                <Box>
                  <Typography>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.quantity} x {item.unitPrice.toLocaleString("vi-VN")}₫
                  </Typography>
                </Box>
              </Box>

              <Typography fontWeight={600}>
                {item.subTotal.toLocaleString("vi-VN")}₫
              </Typography>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography>Tiền hàng</Typography>
            <Typography>{(items.reduce((s, i) => s + i.subTotal, 0)).toLocaleString("vi-VN")}₫</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography>Phí vận chuyển</Typography>
            <Typography>{((orderExt.shippingFee ?? 0)).toLocaleString("vi-VN")}₫</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography>Giảm giá</Typography>
            <Typography>-{((orderExt.discount ?? 0)).toLocaleString("vi-VN")}₫</Typography>
          </Box>
          <Typography variant="h6" fontWeight={800} color="primary">
            Tổng thanh toán: {Number(totalPrice).toLocaleString("vi-VN")}₫
          </Typography>

          <Box display="flex" gap={1} mt={3}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => window.print()}
            >
              In hóa đơn
            </Button>
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate(`/orders/${order._id}`)}
            >
              Xem chi tiết đơn hàng
            </Button>
          </Box>

          <Button
            variant="text"
            fullWidth
            sx={{ mt: 2 }}
            onClick={() => navigate("/")}
          >
            Tiếp tục mua sắm
          </Button>

          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 4, borderRadius: "30px", py: 1.5 }}
            onClick={() => navigate("/")}
          >
            Quay về trang chủ
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
