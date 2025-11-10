import DeleteIcon from "@mui/icons-material/Delete";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import {
  Box,
  Button,
  Chip,
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
      window.dispatchEvent(new Event("cartUpdated"));
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
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("❌ Lỗi xóa sản phẩm:", err);
      alert("Xóa sản phẩm thất bại!");
    }
  };

  const totalPrice =
    cart?.items.reduce((acc, item) => acc + item.price * item.quantity, 0) ?? 0;

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #0a1929 0%, #1a2942 100%)"
              : "linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              position: "relative",
              width: 100,
              height: 100,
              margin: "0 auto 30px",
            }}
          >
            <CircularProgress
              size={100}
              thickness={2}
              sx={{
                color: "primary.main",
                position: "absolute",
                animation: "pulse 1.5s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.5 },
                },
              }}
            />
          </Box>
          <Typography
            variant="h5"
            fontWeight={600}
            sx={{
              background: "linear-gradient(90deg, #1976d2, #42a5f5)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Đang tải giỏ hàng của bạn...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #0a1929 0%, #1a2942 100%)"
              : "linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(25,118,210,0.1) 0%, transparent 70%)",
            top: -100,
            right: -100,
            borderRadius: "50%",
            animation: "float 6s ease-in-out infinite",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            width: 300,
            height: 300,
            background: "radial-gradient(circle, rgba(66,165,245,0.1) 0%, transparent 70%)",
            bottom: -50,
            left: -50,
            borderRadius: "50%",
            animation: "float 8s ease-in-out infinite reverse",
          },
          "@keyframes float": {
            "0%, 100%": { transform: "translate(0, 0)" },
            "50%": { transform: "translate(30px, -30px)" },
          },
        }}
      >
        <Container sx={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Box
              sx={{
                width: 180,
                height: 180,
                margin: "0 auto 40px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 20px 60px rgba(25,118,210,0.4)",
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: -10,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #42a5f5, #1976d2)",
                  opacity: 0.3,
                  filter: "blur(20px)",
                },
              }}
            >
              <Box
                component="img"
                src="https://cdn-icons-png.flaticon.com/512/2038/2038854.png"
                alt="empty cart"
                sx={{ width: 100, height: 100, filter: "brightness(0) invert(1)" }}
              />
            </Box>
          </motion.div>

          <Typography
            variant="h4"
            fontWeight={700}
            gutterBottom
            sx={{
              background: "linear-gradient(90deg, #1976d2, #42a5f5)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Giỏ hàng của bạn đang trống
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 5, fontSize: "1.1rem" }}>
            Hãy khám phá hàng ngàn sản phẩm tuyệt vời! 🛍️
          </Typography>

          <Button
            variant="contained"
            size="large"
            sx={{
              borderRadius: "50px",
              px: 6,
              py: 2,
              fontSize: "1.1rem",
              fontWeight: 600,
              background: "linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)",
              boxShadow: "0 8px 24px rgba(25,118,210,0.4)",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "100%",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                transition: "left 0.5s",
              },
              "&:hover": {
                background: "linear-gradient(90deg, #1565c0 0%, #1976d2 100%)",
                boxShadow: "0 12px 32px rgba(25,118,210,0.5)",
                transform: "translateY(-2px)",
                "&::before": {
                  left: "100%",
                },
              },
              transition: "all 0.3s ease",
            }}
            onClick={() => (window.location.href = "/home")}
          >
            Tiếp tục mua sắm
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #0a1929 0%, #1a2942 100%)"
            : "linear-gradient(135deg, #e3f2fd 0%, #ffffff 50%, #e3f2fd 100%)",
        py: 6,
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          width: 500,
          height: 500,
          background: "radial-gradient(circle, rgba(25,118,210,0.08) 0%, transparent 70%)",
          top: 100,
          right: -100,
          borderRadius: "50%",
          animation: "float 8s ease-in-out infinite",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: 400,
          height: 400,
          background: "radial-gradient(circle, rgba(66,165,245,0.08) 0%, transparent 70%)",
          bottom: 100,
          left: -100,
          borderRadius: "50%",
          animation: "float 10s ease-in-out infinite reverse",
        },
        "@keyframes float": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(40px, -40px)" },
        },
      }}
    >
      <Container sx={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Chip
            label={`${cart.items.length} sản phẩm`}
            sx={{
              mb: 2,
              background: "linear-gradient(90deg, #1976d2, #42a5f5)",
              color: "white",
              fontWeight: 600,
              px: 2,
              fontSize: "0.9rem",
            }}
          />
          <Typography
            variant="h3"
            fontWeight={800}
            gutterBottom
            sx={{
              background: "linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradient 3s linear infinite",
              "@keyframes gradient": {
                "0%": { backgroundPosition: "0% center" },
                "100%": { backgroundPosition: "200% center" },
              },
            }}
          >
            🛍 Giỏ hàng của bạn
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Hoàn tất đơn hàng để nhận ưu đãi đặc biệt!
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            {cart.items.map((item, index) => (
              <motion.div
                key={item.productId._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    mb: 3,
                    p: 3,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backdropFilter: "blur(20px)",
                    background:
                      theme.palette.mode === "dark"
                        ? "rgba(30,41,59,0.8)"
                        : "rgba(255,255,255,0.9)",
                    border: "1px solid",
                    borderColor:
                      theme.palette.mode === "dark"
                        ? "rgba(66,165,245,0.1)"
                        : "rgba(25,118,210,0.1)",
                    boxShadow: "0 4px 20px rgba(25,118,210,0.1)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: "linear-gradient(90deg, #1976d2, #42a5f5, #1976d2)",
                      backgroundSize: "200% auto",
                      animation: "shimmer 3s linear infinite",
                    },
                    "&:hover": {
                      boxShadow: "0 8px 32px rgba(25,118,210,0.2)",
                    },
                    "@keyframes shimmer": {
                      "0%": { backgroundPosition: "0% center" },
                      "100%": { backgroundPosition: "200% center" },
                    },
                  }}
                >
                  <Box display="flex" alignItems="center" gap={3}>
                    <Box
                      sx={{
                        position: "relative",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          inset: -5,
                          borderRadius: 3,
                          background: "linear-gradient(135deg, #42a5f5, #1976d2)",
                          opacity: 0.2,
                          filter: "blur(10px)",
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={
                          item.productId.images[0] ||
                          "https://via.placeholder.com/120"
                        }
                        alt={item.productId.title}
                        sx={{
                          width: 120,
                          height: 120,
                          borderRadius: 3,
                          objectFit: "cover",
                          boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
                          position: "relative",
                          zIndex: 1,
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography fontWeight={700} variant="h6" sx={{ mb: 1 }}>
                        {item.productId.title}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          background: "linear-gradient(90deg, #1976d2, #42a5f5)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          fontWeight: 700,
                        }}
                      >
                        {item.productId.price.toLocaleString("vi-VN")}₫
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        background:
                          theme.palette.mode === "dark"
                            ? "rgba(66,165,245,0.1)"
                            : "rgba(25,118,210,0.05)",
                        borderRadius: 3,
                        p: 0.5,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleUpdateQuantity(
                            item.productId._id,
                            item.quantity - 1
                          )
                        }
                        disabled={
                          item.quantity <= 1 ||
                          updatingItemId === item.productId._id
                        }
                        sx={{
                          background:
                            theme.palette.mode === "dark"
                              ? "rgba(255,255,255,0.1)"
                              : "white",
                          "&:hover": {
                            background: "primary.main",
                            color: "white",
                          },
                        }}
                      >
                        -
                      </IconButton>
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
                          width: 60,
                          mx: 1,
                          "& input": {
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: "1.1rem",
                          },
                          "& fieldset": { border: "none" },
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleUpdateQuantity(
                            item.productId._id,
                            item.quantity + 1
                          )
                        }
                        disabled={updatingItemId === item.productId._id}
                        sx={{
                          background:
                            theme.palette.mode === "dark"
                              ? "rgba(255,255,255,0.1)"
                              : "white",
                          "&:hover": {
                            background: "primary.main",
                            color: "white",
                          },
                        }}
                      >
                        +
                      </IconButton>
                    </Box>
                    {updatingItemId === item.productId._id ? (
                      <CircularProgress size={24} />
                    ) : (
                      <IconButton
                        sx={{
                          background: "rgba(244,67,54,0.1)",
                          "&:hover": {
                            background: "error.main",
                            color: "white",
                            transform: "scale(1.1)",
                          },
                          transition: "all 0.3s ease",
                        }}
                        onClick={() => handleRemoveItem(item.productId._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Paper>
              </motion.div>
            ))}

            {/* Promo Banner */}
            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 2,
                boxShadow: "0 8px 24px rgba(25,118,210,0.4)",
              }}
            >
              <LocalOfferOutlinedIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Giảm ngay 15% cho đơn hàng này! 🎉
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Áp dụng tự động khi thanh toán
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Summary */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 4,
                borderRadius: 4,
                position: "sticky",
                top: 100,
                backdropFilter: "blur(20px)",
                background:
                  theme.palette.mode === "dark"
                    ? "rgba(30,41,59,0.8)"
                    : "rgba(255,255,255,0.9)",
                border: "1px solid",
                borderColor:
                  theme.palette.mode === "dark"
                    ? "rgba(66,165,245,0.2)"
                    : "rgba(25,118,210,0.2)",
                boxShadow: "0 8px 32px rgba(25,118,210,0.15)",
              }}
            >
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Tóm tắt đơn hàng
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body1">Tổng sản phẩm:</Typography>
                <Typography fontWeight={700}>{cart.items.length}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="body1">Tạm tính:</Typography>
                <Typography fontWeight={700}>
                  {totalPrice.toLocaleString("vi-VN")}₫
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={4}
              >
                <Typography variant="h6" fontWeight={700}>
                  Tổng cộng:
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    background: "linear-gradient(90deg, #1976d2, #42a5f5)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
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
                  borderRadius: "50px",
                  py: 2,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  background: "linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)",
                  boxShadow: "0 8px 24px rgba(25,118,210,0.4)",
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                    transition: "left 0.5s",
                  },
                  "&:hover": {
                    background: "linear-gradient(90deg, #1565c0 0%, #1976d2 100%)",
                    boxShadow: "0 12px 32px rgba(25,118,210,0.5)",
                    transform: "translateY(-2px)",
                    "&::before": {
                      left: "100%",
                    },
                  },
                  transition: "all 0.3s ease",
                }}
                onClick={() => (window.location.href = "/checkout")}
              >
                Thanh toán ngay
              </Button>

              <Typography
                variant="caption"
                display="block"
                textAlign="center"
                color="text.secondary"
                mt={2}
              >
                🔒 Thanh toán an toàn & bảo mật
              </Typography>

              {/* Trust Badges */}
              <Box sx={{ mt: 4, pt: 3, borderTop: "1px dashed rgba(0,0,0,0.1)" }}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(25,118,210,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LocalShippingOutlinedIcon color="primary" />
                  </Box>
                  <Typography variant="body2">
                    Miễn phí vận chuyển toàn quốc
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(25,118,210,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <VerifiedUserOutlinedIcon color="primary" />
                  </Box>
                  <Typography variant="body2">Đổi trả trong 30 ngày</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(25,118,210,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LocalOfferOutlinedIcon color="primary" />
                  </Box>
                  <Typography variant="body2">Ưu đãi độc quyền</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}