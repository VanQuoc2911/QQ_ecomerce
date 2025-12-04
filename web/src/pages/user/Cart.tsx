import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ShoppingCartCheckoutIcon from "@mui/icons-material/ShoppingCartCheckout";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { cartService, type CartResponse } from "../../api/cartService";
import { productService } from "../../api/productService";
import { voucherService, type AppliedVoucherResult, type UserVoucher, type VoucherSuggestion } from "../../api/voucherService";

const AI_IMAGE_ENDPOINT = "https://image.pollinations.ai/prompt/";

export default function CartPage() {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [userVouchers, setUserVouchers] = useState<UserVoucher[]>([]);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [voucherDetail, setVoucherDetail] = useState<UserVoucher | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [applyingVoucherCode, setApplyingVoucherCode] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<AppliedVoucherResult | null>(null);
  const [bestVoucher, setBestVoucher] = useState<VoucherSuggestion | null>(null);
  const [bestVoucherLoading, setBestVoucherLoading] = useState(false);
  const [bestVoucherError, setBestVoucherError] = useState<string | null>(null);
  const [manualVoucherCode, setManualVoucherCode] = useState("");
  const [manualVoucherError, setManualVoucherError] = useState<string | null>(null);

  const theme = useTheme();
  const navigate = useNavigate();
  const selectedVoucherCode = selectedVoucher?.code ?? null;

  const formatCurrency = useCallback((value: number) => `${value.toLocaleString("vi-VN")}₫`, []);
  const formatDate = useCallback((value?: string | null) => {
    if (!value) return "Không giới hạn";
    return new Date(value).toLocaleDateString("vi-VN");
  }, []);

  const buildVoucherPrompt = useCallback(
    (voucher: { code?: string; type?: string; value?: number; highlightText?: string }) => {
      const discountText = voucher.type === "percent" ? `${voucher.value}% off` : `giảm ${formatCurrency(voucher.value ?? 0)}`;
      return [
        "poster flash sale",
        `voucher ${voucher.code || "QQSALE"}`,
        discountText,
        voucher.highlightText || "ưu đãi hấp dẫn",
        "gradient neon background, shopping icons, confetti, 3d lighting, no people",
      ].join(", ");
    },
    [formatCurrency],
  );

  const getVoucherImageUrl = useCallback(
    (voucher: { code?: string; highlightText?: string; type?: string; value?: number }) => {
      const prompt = encodeURIComponent(buildVoucherPrompt(voucher));
      const seed = voucher.code ? voucher.code.length * 7919 : Date.now();
      return `${AI_IMAGE_ENDPOINT}${prompt}?width=640&height=360&seed=${seed}&nologo=true`;
    },
    [buildVoucherPrompt],
  );

  const describeVoucherDetail = useCallback(
    (voucher?: Partial<UserVoucher>) => {
      if (!voucher) return "";
      const segments: string[] = [];

      switch (voucher.targetType) {
        case "category":
          if (voucher.targetCategories?.length) {
            segments.push(`Áp dụng cho danh mục: ${voucher.targetCategories.join(", ")}`);
          } else {
            segments.push("Áp dụng cho một số danh mục cụ thể");
          }
          break;
        case "product":
          if (voucher.targetProducts?.length) {
            segments.push(`Áp dụng cho ${voucher.targetProducts.length} sản phẩm được chỉ định`);
          } else {
            segments.push("Áp dụng cho một số sản phẩm cụ thể");
          }
          break;
        default:
          segments.push("Áp dụng cho toàn bộ sản phẩm hợp lệ");
          break;
      }

      if (voucher.minOrderValue) {
        segments.push(`Đơn tối thiểu ${formatCurrency(voucher.minOrderValue)}`);
      }
      if (voucher.maxDiscount) {
        segments.push(`Giảm tối đa ${formatCurrency(voucher.maxDiscount)}`);
      }
      if (voucher.stackable !== undefined) {
        segments.push(voucher.stackable ? "Có thể gộp với voucher khác" : "Không thể gộp cùng voucher khác");
      }

      return segments.join(". ");
    },
    [formatCurrency],
  );

  const voucherDetailDescription = voucherDetail ? describeVoucherDetail(voucherDetail) : "";

  // ✅ Fetch Cart
  const fetchCart = async () => {
    try {
      setLoading(true);
      const data = await cartService.getCart();
      setCart(data);
    } catch (err) {
      console.error("Lỗi fetch giỏ hàng:", err);
      toast.error("❌ Không thể tải giỏ hàng, vui lòng đăng nhập!", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // ✅ Update Quantity
  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    if (!cart) return;
    if (quantity < 1) return;

    // Kiểm tra tồn kho phía client trước khi gửi request
    setUpdatingItemId(productId);
    try {
      try {
        const prod = await productService.getProductById(productId);
        if (quantity > prod.stock) {
          // Nếu vượt quá tồn kho, thông báo và cập nhật lại giỏ với giới hạn tối đa
          toast.warning(`📦 Sản phẩm chỉ còn ${prod.stock} sản phẩm. Vui lòng điều chỉnh số lượng.`, {
            position: "top-right",
            autoClose: 3000,
          });
          // Nếu hiện có trong giỏ, fetchCart sẽ lấy lại số lượng hiện hành từ server
          await fetchCart();
          return;
        }
      } catch (err) {
        // Nếu không lấy được thông tin sản phẩm, vẫn cố gắng gọi API (server sẽ kiểm tra)
        console.warn("Không thể lấy thông tin sản phẩm để kiểm tra tồn kho:", err);
      }

      await cartService.updateQuantity({ productId, quantity });
      await fetchCart();
      // cartService đã dispatch event, nhưng fetchCart sẽ cập nhật local state
    } catch (err) {
      console.error("Lỗi cập nhật số lượng:", err);
      // Hiển thị lỗi server trả về (ví dụ vượt tồn kho)
      const message = err instanceof Error ? err.message : String(err) || "Cập nhật số lượng thất bại!";
      toast.error(`❌ ${message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setUpdatingItemId(null);
    }
  };

  // ✅ Remove Item
  const handleRemoveItem = async (productId: string) => {
    try {
      await cartService.removeFromCart(productId);
      await fetchCart();
      // cartService đã dispatch event, nhưng fetchCart sẽ cập nhật local state
      toast.success("✅ Đã xóa sản phẩm khỏi giỏ!", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error("Lỗi xóa sản phẩm:", err);
      toast.error("❌ Xóa sản phẩm thất bại!", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // ✅ Tính tổng tiền
  const totalPrice = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  const voucherDiscount = selectedVoucher?.discount ?? 0;
  const finalTotal = Math.max(0, totalPrice - voucherDiscount);
  const cartItemCount = cart?.items.length ?? 0;
  const totalQuantity = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  }, [cart]);
  const FREE_SHIPPING_THRESHOLD = 500000;
  const qualifiesFreeShipping = finalTotal >= FREE_SHIPPING_THRESHOLD;
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - finalTotal);

  const loadUserVouchers = useCallback(
    async (total: number) => {
      try {
        setVoucherError(null);
        setVoucherLoading(true);
        const vouchers = await voucherService.getMyVouchers(
          total > 0 ? { total } : undefined,
        );
        setUserVouchers(vouchers);
      } catch (err) {
        console.error("Lỗi tải voucher:", err);
        setUserVouchers([]);
        setVoucherError("Không thể tải voucher. Vui lòng thử lại sau.");
      } finally {
        setVoucherLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!cart) return;
    void loadUserVouchers(totalPrice);
  }, [cart, loadUserVouchers, totalPrice]);

  useEffect(() => {
    if (!cart?.items?.length || totalPrice <= 0) {
      setBestVoucher(null);
      return;
    }

    const normalizedItems = cart.items
      .map((item) => {
        const productId = item.productId?._id;
        if (!productId) return null;
        return {
          productId,
          quantity: item.quantity || 1,
          price: item.price ?? item.productId.price ?? 0,
        };
      })
      .filter((entry): entry is { productId: string; quantity: number; price: number } => Boolean(entry));

    if (!normalizedItems.length) {
      setBestVoucher(null);
      return;
    }

    let cancelled = false;
    setBestVoucherLoading(true);
    setBestVoucherError(null);

    voucherService
      .getBestVoucherSuggestion(normalizedItems)
      .then((suggestion) => {
        if (cancelled) return;
        setBestVoucher(suggestion);
      })
      .catch((err) => {
        console.error("Lỗi gợi ý voucher tốt nhất:", err);
        if (cancelled) return;
        setBestVoucher(null);
        setBestVoucherError("Không tìm được voucher phù hợp cho giỏ hàng này");
      })
      .finally(() => {
        if (cancelled) return;
        setBestVoucherLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cart, totalPrice]);

  useEffect(() => {
    if (!selectedVoucherCode) return;
    const revalidateVoucher = async () => {
      try {
        const refreshed = await voucherService.applyVoucher({ code: selectedVoucherCode, total: totalPrice });
        setSelectedVoucher(refreshed);
      } catch (err) {
        console.warn("Voucher không còn áp dụng:", err);
        setSelectedVoucher(null);
      }
    };
    void revalidateVoucher();
  }, [selectedVoucherCode, totalPrice]);

  const applyVoucherCode = async (code: string, options?: { closeDialog?: boolean }) => {
    try {
      setApplyingVoucherCode(code);
      const applied = await voucherService.applyVoucher({ code, total: totalPrice });
      setSelectedVoucher(applied);
      toast.success(`✅ Đã áp dụng voucher ${code}!`, {
        position: "top-right",
        autoClose: 2000,
      });
      if (options?.closeDialog ?? true) {
        setVoucherDialogOpen(false);
      }
    } catch (err) {
      console.error("Lỗi áp dụng voucher:", err);
      const message = err instanceof Error ? err.message : "Không thể áp dụng voucher";
      toast.error(`❌ ${message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setApplyingVoucherCode(null);
    }
  };

  const handleApplyVoucher = async (voucher: UserVoucher) => {
    await applyVoucherCode(voucher.code, { closeDialog: true });
  };

  const handleApplyBestVoucher = async (code: string) => {
    await applyVoucherCode(code, { closeDialog: false });
  };

  const handleApplyManualVoucher = async () => {
    const raw = manualVoucherCode.trim().toUpperCase();
    if (!raw) {
      setManualVoucherError("Vui lòng nhập mã voucher");
      return;
    }
    setManualVoucherError(null);
    await applyVoucherCode(raw, { closeDialog: false });
    setManualVoucherCode("");
  };

  const showVoucherDetail = (voucher: Partial<UserVoucher> & { code: string }) => {
    setVoucherDetail(voucher as UserVoucher);
  };

  const handleRemoveVoucher = () => {
    setSelectedVoucher(null);
    toast.info("Đã bỏ voucher đang áp dụng", {
      position: "top-right",
      autoClose: 2000,
    });
  };

  // ✅ Loading UI
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={80} />
      </Box>
    );
  }

  // ✅ Empty cart UI
  if (!cart || cart.items.length === 0) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "radial-gradient(circle at 20% 20%, #fdf2ff, #eef4ff 45%, #f5fbff 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Container maxWidth="md">
          <Paper
            sx={{
              borderRadius: 5,
              p: { xs: 4, md: 6 },
              background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(239,246,255,0.92))",
              border: "1px solid rgba(226,232,255,0.8)",
              boxShadow: "0 30px 80px rgba(148,163,184,0.35)",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems="center">
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" sx={{ letterSpacing: 6, color: "#94a3b8" }}>
                  EMPTY CART
                </Typography>
                <Typography variant="h3" fontWeight={900} sx={{ color: "#0f172a", mb: 2 }}>
                  Giỏ hàng của bạn đang trống
                </Typography>
                <Typography sx={{ color: "#475569", mb: 3 }}>
                  Hãy khám phá vô vàn sản phẩm mới, theo dõi deal tốt và quay lại đây khi bạn sẵn sàng thanh toán.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
                  <Chip icon={<LocalOfferOutlinedIcon />} label="Flash sale mỗi ngày" color="primary" variant="outlined" />
                  <Chip icon={<ShoppingCartCheckoutIcon />} label="Thanh toán an toàn" color="primary" variant="outlined" />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 999,
                      background: "linear-gradient(120deg, #4338ca, #a855f7)",
                      boxShadow: "0 20px 45px rgba(79,70,229,0.35)",
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                    onClick={() => navigate("/products")}
                  >
                    Khám phá ưu đãi
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{ borderRadius: 999, textTransform: "none", fontWeight: 700 }}
                    onClick={() => navigate("/home")}
                  >
                    Về trang chủ
                  </Button>
                </Stack>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  width: "100%",
                  borderRadius: 4,
                  background: "radial-gradient(circle at 30% 30%, rgba(67,56,202,0.15), rgba(67,56,202,0.05))",
                  border: "1px dashed rgba(99,102,241,0.4)",
                  p: 4,
                  textAlign: "center",
                }}
              >
                <ShoppingCartCheckoutIcon sx={{ fontSize: 96, color: "#6366f1", mb: 2 }} />
                <Typography fontWeight={700} color="#4338ca">
                  Lưu sản phẩm để chúng tôi giữ hộ bạn.
                </Typography>
                <Typography color="#6b7280">Đơn hàng sẽ tự động đồng bộ giữa web và app.</Typography>
              </Box>
            </Stack>
          </Paper>
        </Container>
      </Box>
    );
  }

  // ✅ UI chính
  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          background: "radial-gradient(circle at 10% 10%, #fdf2ff, #eef4ff 40%, #f5fbff 100%)",
          py: { xs: 4, md: 6 },
          px: { xs: 2, md: 0 },
        }}
      >
        <Container maxWidth="xl">
          <Stack spacing={5}>
            <Paper
              sx={{
                borderRadius: 5,
                p: { xs: 4, md: 5 },
                background: "linear-gradient(135deg, #0f172a, #1d4ed8)",
                color: "#fff",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 35px 90px rgba(15,23,42,0.45)",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2), transparent 55%)",
                }}
              />
              <Stack spacing={3} sx={{ position: "relative", zIndex: 1 }}>
                <Box>
                  <Typography variant="overline" sx={{ letterSpacing: 6, color: "rgba(255,255,255,0.7)" }}>
                    QQ CART
                  </Typography>
                  <Typography variant="h3" fontWeight={900} sx={{ mb: 1 }}>
                    Sẵn sàng thanh toán?
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.75)" }}>
                    Theo dõi trạng thái từng sản phẩm, tận dụng voucher tốt nhất và đừng bỏ lỡ ưu đãi vận chuyển hôm nay.
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                  {[
                    { label: "Sản phẩm", value: cartItemCount },
                    { label: "Số lượng", value: totalQuantity },
                    { label: "Tạm tính", value: formatCurrency(totalPrice) },
                    { label: "Voucher", value: voucherDiscount > 0 ? `-${formatCurrency(voucherDiscount)}` : "Chưa áp dụng", sub: selectedVoucher?.code },
                  ].map((stat) => (
                    <Box
                      key={stat.label}
                      sx={{
                        flex: "1 1 180px",
                        borderRadius: 3,
                        border: "1px solid rgba(255,255,255,0.25)",
                        background: "rgba(255,255,255,0.08)",
                        p: 2.5,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                        {stat.label}
                      </Typography>
                      <Typography variant="h5" fontWeight={800}>
                        {stat.value}
                      </Typography>
                      {stat.sub && (
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          {stat.sub}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <Chip
                    label={qualifiesFreeShipping ? "Miễn phí vận chuyển nội thành" : "Chưa đạt miễn phí vận chuyển"}
                    sx={{
                      background: qualifiesFreeShipping ? "rgba(74,222,128,0.2)" : "rgba(248,250,252,0.2)",
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.4)",
                    }}
                    variant="outlined"
                  />
                  <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
                    {qualifiesFreeShipping
                      ? "Bạn đã đủ điều kiện miễn phí ship cho đơn này."
                      : `Mua thêm ${formatCurrency(amountToFreeShipping)} để nhận miễn phí ship.`}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            <Grid container spacing={4}>
              <Grid item xs={12} md={8}>
                <Stack spacing={3}>
                  {cart.items.map((item, index) => {
                    const stock = (item.productId as unknown as { stock?: number })?.stock ?? 0;
                    const stockUsage = stock > 0 ? Math.min(100, (item.quantity / stock) * 100) : 100;
                    const displayImage = item.productId.images?.[0] || "https://via.placeholder.com/160";
                    const shortId = item.productId._id ? item.productId._id.slice(-6).toUpperCase() : "N/A";
                    return (
                      <motion.div
                        key={item.productId._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.08 }}
                      >
                        <Paper
                          sx={{
                            p: { xs: 3, md: 4 },
                            borderRadius: 4,
                            background: theme.palette.mode === "dark" ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.9)",
                            border: "1px solid rgba(226,232,240,0.8)",
                            boxShadow: "0 25px 65px rgba(15,23,42,0.12)",
                          }}
                        >
                          <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                            <Box
                              component="img"
                              src={displayImage}
                              alt={item.productId.title}
                              sx={{
                                width: { xs: "100%", sm: 160 },
                                height: { xs: 200, sm: 160 },
                                borderRadius: 3,
                                objectFit: "cover",
                                boxShadow: "0 20px 40px rgba(15,23,42,0.2)",
                              }}
                            />
                            <Box flex={1}>
                              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                                <Box>
                                  <Typography variant="h6" fontWeight={800} color="#0f172a">
                                    {item.productId.title}
                                  </Typography>
                                  <Typography color="text.secondary">Mã sản phẩm: #{shortId}</Typography>
                                </Box>
                                <Typography
                                  variant="h5"
                                  fontWeight={800}
                                  sx={{
                                    background: "linear-gradient(120deg, #2563eb, #7c3aed)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                  }}
                                >
                                  {item.productId.price.toLocaleString("vi-VN")}₫
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
                                <Chip label={`Kho: ${stock}`} size="small" variant="outlined" color={stock <= 5 ? "error" : "default"} />
                                <Chip label={`Đã chọn: ${item.quantity}`} size="small" variant="outlined" />
                                {stock > 0 && stock - item.quantity <= 3 && <Chip label="Sắp hết" size="small" color="error" />}
                              </Stack>
                              <Box sx={{ mt: 2 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={stockUsage}
                                  sx={{ height: 8, borderRadius: 999, backgroundColor: "rgba(148,163,184,0.3)" }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  Số lượng bạn chọn chiếm {Math.round(stockUsage)}% tồn kho hiện tại.
                                </Typography>
                              </Box>
                            </Box>
                          </Stack>

                          <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={2}
                            alignItems={{ md: "center" }}
                            justifyContent="space-between"
                            sx={{ mt: 3 }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                borderRadius: 999,
                                background: "rgba(99,102,241,0.08)",
                                p: 0.5,
                              }}
                            >
                              <IconButton
                                onClick={() => handleUpdateQuantity(item.productId._id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || updatingItemId === item.productId._id}
                              >
                                -
                              </IconButton>
                              <TextField
                                type="number"
                                size="small"
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(item.productId._id, Number(e.target.value))}
                                sx={{
                                  width: 80,
                                  "& .MuiInputBase-input": { textAlign: "center", fontWeight: 700 },
                                  background: "#fff",
                                  borderRadius: 2,
                                }}
                              />
                              <IconButton
                                onClick={() => handleUpdateQuantity(item.productId._id, item.quantity + 1)}
                                disabled={updatingItemId === item.productId._id}
                              >
                                +
                              </IconButton>
                            </Box>

                            <Stack direction="row" spacing={1.5} alignItems="center">
                              {updatingItemId === item.productId._id ? (
                                <CircularProgress size={24} />
                              ) : (
                                <Tooltip title="Xóa khỏi giỏ">
                                  <IconButton
                                    onClick={() => handleRemoveItem(item.productId._id)}
                                    sx={{ border: "1px solid rgba(239,68,68,0.3)" }}
                                  >
                                    <DeleteIcon color="error" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Stack>
                        </Paper>
                      </motion.div>
                    );
                  })}

                  <Paper
                    sx={{
                      borderRadius: 4,
                      p: { xs: 3, md: 4 },
                      background: "linear-gradient(120deg, #0ea5e9, #6366f1)",
                      color: "#fff",
                      display: "flex",
                      flexDirection: { xs: "column", md: "row" },
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <LocalOfferOutlinedIcon sx={{ fontSize: 48 }} />
                    <Box>
                      <Typography variant="h5" fontWeight={800}>
                        Nhập thêm voucher để tiết kiệm nhiều hơn
                      </Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.8)", mb: 2 }}>
                        Hệ thống gợi ý tự động sẽ kiểm tra những mã tốt nhất dựa trên giỏ hàng của bạn.
                      </Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <Button variant="contained" color="secondary" onClick={() => setVoucherDialogOpen(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
                          Xem gợi ý voucher
                        </Button>
                        {bestVoucher && (
                          <Button
                            variant="outlined"
                            color="inherit"
                            onClick={() => handleApplyBestVoucher(bestVoucher.code)}
                            disabled={applyingVoucherCode === bestVoucher.code}
                            sx={{ textTransform: "none", color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
                          >
                            {applyingVoucherCode === bestVoucher.code ? "Đang áp dụng..." : `Dùng mã ${bestVoucher.code}`}
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </Paper>
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: 5,
                    position: "sticky",
                    top: 120,
                    background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(241,245,255,0.9))",
                    border: "1px solid rgba(226,232,255,0.9)",
                    boxShadow: "0 30px 70px rgba(148,163,184,0.35)",
                  }}
                >
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="overline" sx={{ letterSpacing: 4, color: "#94a3b8" }}>
                        CHECKOUT SUMMARY
                      </Typography>
                      <Typography variant="h5" fontWeight={800}>
                        Tóm tắt đơn hàng
                      </Typography>
                    </Box>

                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography fontWeight={700}>Ưu đãi vận chuyển</Typography>
                        <Typography color={qualifiesFreeShipping ? "success.main" : "warning.main"} fontWeight={700}>
                          {qualifiesFreeShipping ? "Đủ điều kiện" : `Còn ${formatCurrency(amountToFreeShipping)}`}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (finalTotal / FREE_SHIPPING_THRESHOLD) * 100)}
                        sx={{ height: 10, borderRadius: 999, backgroundColor: "rgba(148,163,184,0.4)" }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {qualifiesFreeShipping ? "QQ hỗ trợ phí ship nội thành cho đơn này." : "Tăng giá trị đơn hàng để nhận miễn phí ship."}
                      </Typography>
                    </Box>

                    <Stack spacing={1.5}>
                      {[
                        { label: "Tổng sản phẩm", value: `${cartItemCount}` },
                        { label: "Tổng số lượng", value: `${totalQuantity}` },
                        { label: "Tạm tính", value: formatCurrency(totalPrice) },
                      ].map((row) => (
                        <Box key={row.label} display="flex" justifyContent="space-between">
                          <Typography color="text.secondary">{row.label}</Typography>
                          <Typography fontWeight={700}>{row.value}</Typography>
                        </Box>
                      ))}
                    </Stack>

                    <Divider />

                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography fontWeight={700}>Voucher</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedVoucher ? `Đang áp dụng mã ${selectedVoucher.code}` : "Chọn hoặc nhập voucher phù hợp"}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<ConfirmationNumberOutlinedIcon />}
                          onClick={() => setVoucherDialogOpen(true)}
                        >
                          {selectedVoucher ? "Đổi" : "Chọn"}
                        </Button>
                      </Stack>

                      {selectedVoucher && (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Chip label={selectedVoucher.code} color="primary" />
                          <Typography color="success.main" fontWeight={700}>
                            - {formatCurrency(voucherDiscount)}
                          </Typography>
                          <Button size="small" color="error" onClick={handleRemoveVoucher}>
                            Bỏ voucher
                          </Button>
                        </Stack>
                      )}
                    </Stack>

                    {voucherDiscount > 0 && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography color="success.main" fontWeight={600}>Giảm giá</Typography>
                        <Typography color="success.main" fontWeight={700}>
                          - {formatCurrency(voucherDiscount)}
                        </Typography>
                      </Box>
                    )}

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Tổng cộng
                        </Typography>
                        <Typography variant="h4" fontWeight={900}>
                          {formatCurrency(finalTotal)}
                        </Typography>
                      </Box>
                      <Tooltip title="Đi tới bước thanh toán">
                        <Button
                          variant="contained"
                          startIcon={<ShoppingCartCheckoutIcon />}
                          onClick={() => navigate(`/checkout/cart/${cart._id}`)}
                          sx={{
                            borderRadius: 999,
                            py: 1.5,
                            px: 4,
                            textTransform: "none",
                            fontWeight: 700,
                            background: "linear-gradient(120deg, #2563eb, #7c3aed)",
                          }}
                        >
                          Thanh toán
                        </Button>
                      </Tooltip>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </Container>
      </Box>

      <Dialog
        open={voucherDialogOpen}
        onClose={() => setVoucherDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chọn voucher cho đơn hàng</DialogTitle>
        <DialogContent dividers>
          {voucherError && (
            <Typography color="error" align="center" sx={{ mb: 2 }}>
              {voucherError}
            </Typography>
          )}

          <Stack spacing={3} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Nhập mã voucher
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
                <TextField
                  fullWidth
                  label="Mã voucher"
                  size="small"
                  value={manualVoucherCode}
                  onChange={(e) => {
                    setManualVoucherCode(e.target.value.toUpperCase());
                    if (manualVoucherError) setManualVoucherError(null);
                  }}
                  error={Boolean(manualVoucherError)}
                  helperText={manualVoucherError || ""}
                />
                <Button
                  variant="contained"
                  onClick={handleApplyManualVoucher}
                  disabled={!manualVoucherCode.trim() || applyingVoucherCode === manualVoucherCode.trim().toUpperCase()}
                  sx={{ minWidth: 140 }}
                >
                  {applyingVoucherCode === manualVoucherCode.trim().toUpperCase() ? (
                    <CircularProgress size={18} sx={{ color: "white" }} />
                  ) : (
                    "Áp dụng"
                  )}
                </Button>
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Gợi ý tốt nhất cho giỏ hàng này
              </Typography>
              {bestVoucherLoading ? (
                <LinearProgress sx={{ borderRadius: 999 }} />
              ) : bestVoucher ? (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700}>{bestVoucher.code}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Giảm {formatCurrency(bestVoucher.discount)}
                      </Typography>
                      {bestVoucher.voucher?.highlightText && (
                        <Typography variant="caption" color="primary">
                          {bestVoucher.voucher.highlightText}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Button
                        variant="contained"
                        size="small"
                        disabled={applyingVoucherCode === bestVoucher.code}
                        onClick={() => handleApplyBestVoucher(bestVoucher.code)}
                      >
                        {applyingVoucherCode === bestVoucher.code ? (
                          <CircularProgress size={18} sx={{ color: "white" }} />
                        ) : (
                          "Áp dụng"
                        )}
                      </Button>
                      {bestVoucher.voucher && (
                        <Button variant="text" size="small" onClick={() => showVoucherDetail(bestVoucher.voucher!)}>
                          Xem chi tiết
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Không có gợi ý nào phù hợp cho giỏ hàng hiện tại.
                </Typography>
              )}
              {bestVoucherError && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
                  {bestVoucherError}
                </Typography>
              )}
            </Box>
          </Stack>

          {voucherLoading ? (
            <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          ) : userVouchers.length ? (
            <Stack spacing={2}>
              {userVouchers.map((voucher) => {
                const applicable = voucher.applicable !== false;
                const discountPreview = voucher.discount ?? 0;
                return (
                  <Paper key={voucher._id} sx={{ p: 2.5, borderRadius: 3 }} variant="outlined">
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      justifyContent="space-between"
                      alignItems={{ sm: "center" }}
                    >
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <Typography variant="h6" fontWeight={800}>
                            {voucher.code}
                          </Typography>
                          {discountPreview > 0 && (
                            <Chip
                              label={`Ưu đãi ~ ${formatCurrency(discountPreview)}`}
                              color="success"
                              size="small"
                            />
                          )}
                        </Stack>
                        <Typography color="text.secondary">
                          Giá trị: {voucher.type === "percent" ? `${voucher.value}%` : formatCurrency(voucher.value)}
                        </Typography>
                        <Typography color="text.secondary">
                          Đơn tối thiểu: {voucher.minOrderValue ? formatCurrency(voucher.minOrderValue) : "Không"}
                        </Typography>
                        <Typography color="text.secondary">
                          Hạn sử dụng: {formatDate(voucher.expiresAt)}
                        </Typography>
                        {voucher.reason && !applicable && (
                          <Typography color="error" variant="body2" sx={{ mt: 0.5 }}>
                            {voucher.reason}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                        <Button
                          variant="outlined"
                          startIcon={<InfoOutlinedIcon />}
                          onClick={() => showVoucherDetail(voucher)}
                        >
                          Chi tiết
                        </Button>
                        <Tooltip
                          title={!applicable ? voucher.reason || "Không đủ điều kiện" : ""}
                          disableHoverListener={applicable}
                        >
                          <span>
                            <Button
                              variant="contained"
                              onClick={() => handleApplyVoucher(voucher)}
                              disabled={!applicable || applyingVoucherCode === voucher.code}
                            >
                              {applyingVoucherCode === voucher.code ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                "Áp dụng"
                              )}
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          ) : (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography color="text.secondary">
                Bạn chưa có voucher cá nhân. Hãy nhập mã hoặc dùng gợi ý bên trên.
              </Typography>
              <Typography color="text.secondary">Hiện chưa có ưu đãi nào phù hợp.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoucherDialogOpen(false)}>Đóng</Button>
          {selectedVoucher && (
            <Button color="error" onClick={handleRemoveVoucher}>
              Bỏ voucher
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(voucherDetail)}
        onClose={() => setVoucherDetail(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Chi tiết voucher</DialogTitle>
        <DialogContent dividers>
          {voucherDetail && (
            <Stack spacing={1.5}>
              <Box
                component="img"
                src={getVoucherImageUrl(voucherDetail)}
                alt={`Voucher ${voucherDetail.code}`}
                sx={{
                  width: "100%",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  maxHeight: 180,
                  objectFit: "cover",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Hình minh hoạ được tạo tự động bằng AI cho voucher này.
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {voucherDetail.code}
              </Typography>
              {voucherDetail.highlightText && (
                <Typography color="primary">{voucherDetail.highlightText}</Typography>
              )}
              {voucherDetailDescription && (
                <Typography variant="body2" color="text.secondary">
                  {voucherDetailDescription}
                </Typography>
              )}
              <Typography>
                Loại ưu đãi: {voucherDetail.type === "percent" ? `${voucherDetail.value}%` : formatCurrency(voucherDetail.value)}
              </Typography>
              <Typography>
                Giảm tối đa: {voucherDetail.maxDiscount ? formatCurrency(voucherDetail.maxDiscount) : "Không giới hạn"}
              </Typography>
              <Typography>
                Đơn tối thiểu: {voucherDetail.minOrderValue ? formatCurrency(voucherDetail.minOrderValue) : "Không"}
              </Typography>
              <Typography>Hạn sử dụng: {formatDate(voucherDetail.expiresAt)}</Typography>
              <Typography>
                Lượt sử dụng: {voucherDetail.usageLimit ? `${voucherDetail.usedCount ?? 0}/${voucherDetail.usageLimit}` : "Không giới hạn"}
              </Typography>
              {voucherDetail.reason && (
                <Typography color="error">{voucherDetail.reason}</Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoucherDetail(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
