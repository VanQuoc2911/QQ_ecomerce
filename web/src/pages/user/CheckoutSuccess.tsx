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
import { useLocation, useNavigate } from "react-router-dom";
import type { Order } from "../../types/Order";

export default function CheckoutSuccessPage(): JSX.Element {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (location.state && (location.state as { order?: Order }).order) {
      setOrder((location.state as { order: Order }).order);
    } else {
      const savedOrder = localStorage.getItem("lastOrder");
      if (savedOrder) setOrder(JSON.parse(savedOrder));
    }
  }, [location.state]);

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

  const totalPrice = order.items?.reduce((acc, it) => acc + it.price * it.quantity, 0);

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
            Người nhận: {order.fullName ?? order.userId}
          </Typography>
          <Typography>Email: {order.email}</Typography>
          <Typography>Điện thoại: {order.phone}</Typography>
          <Typography>Địa chỉ: {order.address}</Typography>
          <Typography>Phương thức thanh toán: {order.paymentMethod}</Typography>
          <Typography>Trạng thái: {order.status ?? "Đang xử lý"}</Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" fontWeight={700} gutterBottom>
            Chi tiết sản phẩm
          </Typography>
          {order.items?.map((item) => (
            <Box
              key={item.productId._id}
              display="flex"
              justifyContent="space-between"
              mb={1.5}
            >
              <Typography>
                {item.productId.title} x {item.quantity}
              </Typography>
              <Typography fontWeight={600}>
                {(item.price * item.quantity).toLocaleString("vi-VN")}₫
              </Typography>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" fontWeight={800} color="primary">
            Tổng cộng: {totalPrice?.toLocaleString("vi-VN")}₫
          </Typography>

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
