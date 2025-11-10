// src/pages/CheckoutPage.tsx
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import type { CartResponse } from "../../api/cartService";
import { cartService } from "../../api/cartService";
import { useAuth } from "../../context/AuthContext";
import type { CheckoutOrder, Order, OrderItem } from "../../types/Order";

export default function CheckoutPage(): JSX.Element {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cod" | "qr">("card");

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  const totalPrice = cart?.items.reduce((acc, it) => acc + it.price * it.quantity, 0) ?? 0;

  const fetchCart = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await cartService.getCart();
      setCart(data);
    } catch (err) {
      console.error("Lỗi khi lấy giỏ hàng:", err);
      setSnackbar({
        open: true,
        message: "Không thể tải giỏ hàng. Vui lòng đăng nhập.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    if (user) {
      setFullName(user.name ?? user.displayName ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setAddress(user.address ?? "");
    }
  }, [user]);

  const handlePayment = async (): Promise<void> => {
    const finalName = fullName.trim() || user?.name || user?.displayName || "";
    const finalPhone = phone.trim() || user?.phone || "";
    const finalEmail = email.trim() || user?.email || "";

    if (!finalName || !finalEmail || !finalPhone || !address.trim()) {
      setSnackbar({
        open: true,
        message: "Vui lòng cung cấp tên, email, số điện thoại và địa chỉ.",
        severity: "error",
      });
      return;
    }

    if (!cart || cart.items.length === 0) {
      setSnackbar({ open: true, message: "Giỏ hàng trống.", severity: "error" });
      return;
    }

    setProcessing(true);
    try {
      const items: OrderItem[] = cart.items.map((item) => ({
        productId: {
          _id: item.productId._id,
          title: item.productId.title,
          price: item.price,
          images: item.productId.images || [],
        },
        quantity: item.quantity,
        price: item.price,
      }));

      const payload: CheckoutOrder = {
        userId: user?._id,
        fullName: finalName,
        email: finalEmail,
        phone: finalPhone,
        address,
        paymentMethod,
        total: totalPrice,
        items,
      };


      // Đồng bộ type với Order.ts
      const orderFromApi = await cartService.checkout(payload);
      const order: Order = {
        ...orderFromApi,
        status: orderFromApi.status ?? "pending",
        createdAt: orderFromApi.createdAt ?? new Date().toISOString(),
        updatedAt: orderFromApi.updatedAt ?? new Date().toISOString(),
        paymentMethod:
          orderFromApi.paymentMethod === "card" ||
          orderFromApi.paymentMethod === "cod" ||
          orderFromApi.paymentMethod === "qr"
            ? orderFromApi.paymentMethod
            : "card", // fallback nếu API trả giá trị lạ
      };



      try {
        localStorage.setItem("lastOrder", JSON.stringify(order));
      } catch { /* ignore */ }

      navigate("/checkout/success", { state: { order } });
    } catch (err: unknown) {
      console.error("Lỗi thanh toán:", err);
      let msg = "Thanh toán thất bại. Vui lòng thử lại.";
      if (err && typeof err === "object" && "response" in err) {
        const resp = (err as { response?: { data?: { message?: string } } }).response;
        if (resp?.data?.message) msg = resp.data.message;
      }
      setSnackbar({ open: true, message: msg, severity: "error" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress color="primary" size={60} />
        <Typography mt={3} variant="h6">
          Đang tải giỏ hàng...
        </Typography>
      </Container>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Container sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Giỏ hàng trống 😢
        </Typography>
        <Button variant="contained" onClick={() => (window.location.href = "/")}>
          Quay lại mua sắm
        </Button>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #101820, #1a273a)"
            : "linear-gradient(135deg, #e3f2fd, #f5f7fa)",
        py: 6,
      }}
    >
      <Container>
        <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom sx={{ mb: 5 }}>
          🧾 Thanh toán
        </Typography>

        <Grid container spacing={4}>
          {/* Thông tin người nhận */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Thông tin người nhận
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <TextField
                fullWidth
                label="Họ và tên"
                margin="normal"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                helperText="Nếu để trống sẽ dùng tên từ profile"
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText="Nếu để trống sẽ dùng email từ profile"
              />
              <TextField
                fullWidth
                label="Số điện thoại"
                margin="normal"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                helperText="Nếu để trống sẽ dùng số điện thoại từ profile"
              />
              <TextField
                fullWidth
                label="Địa chỉ nhận hàng"
                margin="normal"
                multiline
                minRows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <TextField
                select
                fullWidth
                label="Phương thức thanh toán"
                margin="normal"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "card" | "cod" | "qr")}
              >
                <MenuItem value="card">Thẻ ngân hàng</MenuItem>
                <MenuItem value="cod">COD</MenuItem>
                <MenuItem value="qr">Quét mã QR</MenuItem>
              </TextField>
            </Paper>
          </Grid>

          {/* Tổng đơn hàng */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 4, borderRadius: 4, position: "sticky", top: 100 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Đơn hàng của bạn
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {cart.items.map((item) => (
                <Box key={item.productId._id} display="flex" justifyContent="space-between" mb={1.5}>
                  <Typography>
                    {item.productId.title} x {item.quantity}
                  </Typography>
                  <Typography fontWeight={600}>
                    {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" mb={3}>
                <Typography variant="h6" fontWeight={700}>
                  Tổng cộng:
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary">
                  {totalPrice.toLocaleString("vi-VN")}₫
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  borderRadius: "30px",
                  py: 1.4,
                  fontSize: "1rem",
                  background: "linear-gradient(45deg, #1976d2, #42a5f5, #64b5f6)",
                }}
                onClick={handlePayment}
                disabled={processing}
              >
                {processing ? <CircularProgress size={24} /> : "Thanh toán"}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
