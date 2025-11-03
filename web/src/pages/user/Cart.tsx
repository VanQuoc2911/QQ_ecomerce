import DeleteIcon from "@mui/icons-material/Delete";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cartService, type CartResponse } from "../../api/cartService";

export default function CartPage() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const theme = useTheme();

  const fetchCart = async () => {
    try {
      setLoading(true);
      const data = await cartService.getCart();
      setCart(data);
    } catch (err) {
      console.error("❌ Lỗi khi lấy giỏ hàng:", err);
      alert("Không thể tải giỏ hàng. Vui lòng đăng nhập!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    if (!cart) return;
    if (quantity < 1) return;
    setUpdatingItemId(productId);
    try {
      await cartService.updateQuantity({ productId, quantity });
      await fetchCart();
      window.dispatchEvent(new Event("cartUpdated")); // 🔁 Cập nhật navbar
    } catch (err) {
      console.error("❌ Lỗi cập nhật số lượng:", err);
      alert("Cập nhật số lượng thất bại!");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!cart) return;
    try {
      await cartService.removeFromCart(productId);
      await fetchCart();
      window.dispatchEvent(new Event("cartUpdated")); // 🔁 Cập nhật navbar
    } catch (err) {
      console.error("❌ Lỗi xóa sản phẩm:", err);
      alert("Xóa sản phẩm thất bại!");
    }
  };

  const totalPrice =
    cart?.items.reduce((acc, item) => acc + item.price * item.quantity, 0) ?? 0;

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress color="primary" size={60} />
        <Typography mt={3} variant="h6">
          Đang tải giỏ hàng của bạn...
        </Typography>
      </Container>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Container sx={{ py: 10, textAlign: "center" }}>
        <Box
          component="img"
          src="https://cdn-icons-png.flaticon.com/512/2038/2038854.png"
          alt="empty cart"
          sx={{ width: 200, opacity: 0.7, mb: 3 }}
        />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Giỏ hàng của bạn đang trống 😢
        </Typography>
        <Button
          variant="contained"
          sx={{
            borderRadius: 3,
            px: 5,
            py: 1.2,
            background: "linear-gradient(45deg, #42a5f5, #1976d2)",
            boxShadow: "0 4px 14px rgba(25,118,210,0.3)",
            "&:hover": {
              background: "linear-gradient(45deg, #1976d2, #42a5f5)",
              transform: "scale(1.03)",
            },
          }}
          onClick={() => (window.location.href = "/")}
        >
          Tiếp tục mua sắm
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
        <Typography
          variant="h4"
          fontWeight={700}
          textAlign="center"
          gutterBottom
          sx={{
            mb: 5,
            background: "linear-gradient(90deg, #1976d2, #42a5f5)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          🛍 Giỏ hàng của bạn
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            {cart.items.map((item) => (
              <motion.div
                key={item.productId._id}
                whileHover={{ scale: 1.02, y: -3 }}
                transition={{ duration: 0.3 }}
              >
                <Paper
                  elevation={4}
                  sx={{
                    mb: 3,
                    p: 2.5,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backdropFilter: "blur(12px)",
                    background:
                      theme.palette.mode === "dark"
                        ? "rgba(30,30,30,0.8)"
                        : "rgba(255,255,255,0.8)",
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? "0 8px 24px rgba(0,0,0,0.3)"
                        : "0 8px 20px rgba(0,0,0,0.1)",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={3}>
                    <Box
                      component="img"
                      src={
                        item.productId.images[0] ||
                        "https://via.placeholder.com/120"
                      }
                      alt={item.productId.title}
                      sx={{
                        width: 100,
                        height: 100,
                        borderRadius: 3,
                        objectFit: "cover",
                        boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
                      }}
                    />
                    <Box>
                      <Typography fontWeight={600} variant="subtitle1">
                        {item.productId.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {item.productId.price.toLocaleString("vi-VN")}₫
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" alignItems="center" gap={2}>
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantity}
                      inputProps={{ min: 1 }}
                      onChange={(e) =>
                        handleUpdateQuantity(
                          item.productId._id,
                          Number(e.target.value)
                        )
                      }
                      disabled={updatingItemId === item.productId._id}
                      sx={{
                        width: 80,
                        "& input": {
                          textAlign: "center",
                          fontWeight: 600,
                        },
                      }}
                    />
                    {updatingItemId === item.productId._id ? (
                      <CircularProgress size={24} />
                    ) : (
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveItem(item.productId._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Paper>
              </motion.div>
            ))}
          </Grid>

          {/* Tổng kết */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 4, borderRadius: 4, position: "sticky", top: 100 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Tóm tắt đơn hàng
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography>Tổng sản phẩm:</Typography>
                <Typography fontWeight={600}>{cart.items.length}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography>Tổng tạm tính:</Typography>
                <Typography fontWeight={600}>
                  {totalPrice.toLocaleString("vi-VN")}₫
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" justifyContent="space-between" mb={3}>
                <Typography variant="h6" fontWeight={700}>
                  Tổng cộng:
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  color="primary"
                >
                  {totalPrice.toLocaleString("vi-VN")}₫
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<ShoppingCartCheckoutIcon />}
                sx={{
                  borderRadius: "30px",
                  py: 1.4,
                  fontSize: "1rem",
                  background:
                    "linear-gradient(45deg, #1976d2, #42a5f5, #64b5f6)",
                  boxShadow: "0 6px 20px rgba(25,118,210,0.4)",
                }}
                onClick={() => alert("Chuyển đến trang thanh toán 💳")}
              >
                Thanh toán ngay
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
