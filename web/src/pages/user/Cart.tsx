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
      <Container sx={{ textAlign: "center", mt: 12 }}>
        <Typography variant="h4" fontWeight={700} mb={2}>
          Giỏ hàng của bạn đang trống 🛒
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate("/home")}
        >
          Tiếp tục mua sắm
        </Button>
      </Container>
    );
  }

  // ✅ UI chính
  return (
    <>
      <Box sx={{ py: 6 }}>
        <Container>
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Chip
            label={`${cart.items.length} sản phẩm`}
            sx={{
              mb: 2,
              background: "linear-gradient(90deg, #1976d2, #42a5f5)",
              color: "white",
            }}
          />
          <Typography variant="h3" fontWeight={800}>
            🛍 Giỏ hàng của bạn
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* LEFT */}
          <Grid item xs={12} md={8}>
            {cart.items.map((item, index) => (
              <motion.div
                key={item.productId._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Paper
                  sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 4,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: theme.palette.background.paper,
                    boxShadow: "0 4px 20px rgba(25,118,210,0.1)",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={3}>
                    <Box
                      component="img"
                      src={
                        item.productId.images[0] ||
                        "https://via.placeholder.com/120"
                      }
                      sx={{
                        width: 120,
                        height: 120,
                        borderRadius: 3,
                        objectFit: "cover",
                      }}
                    />
                    <Box>
                      <Typography fontWeight={700} variant="h6">
                        {item.productId.title}
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          background:
                            "linear-gradient(90deg, #1976d2, #42a5f5)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {item.productId.price.toLocaleString("vi-VN")}₫
                      </Typography>
                    </Box>
                  </Box>

                  {/* Quantity */}
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 0.5,
                        borderRadius: 3,
                        background: "rgba(25,118,210,0.05)",
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
                      >
                        -
                      </IconButton>

                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateQuantity(
                            item.productId._id,
                            Number(e.target.value)
                          )
                        }
                        sx={{
                          width: 60,
                          "& input": { textAlign: "center" },
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
                      >
                        +
                      </IconButton>
                    </Box>

                    {/* Remove */}
                    {updatingItemId === item.productId._id ? (
                      <CircularProgress size={24} />
                    ) : (
                      <IconButton
                        onClick={() =>
                          handleRemoveItem(item.productId._id)
                        }
                        sx={{
                          "&:hover": {
                            background: "error.main",
                            color: "white",
                          },
                        }}
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
                mt: 2,
                background:
                  "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <LocalOfferOutlinedIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Giảm ngay 15% cho đơn hàng này 🎉
                </Typography>
                <Typography variant="body2">
                  Áp dụng tự động khi thanh toán
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* RIGHT – SUMMARY */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 4,
                borderRadius: 4,
                position: "sticky",
                top: 100,
                boxShadow: "0 8px 32px rgba(25,118,210,0.15)",
              }}
            >
              <Typography variant="h5" fontWeight={700} mb={2}>
                Tóm tắt đơn hàng
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography>Tổng sản phẩm:</Typography>
                <Typography fontWeight={700}>
                  {cart.items.length}
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography>Tạm tính:</Typography>
                <Typography fontWeight={700}>
                  {totalPrice.toLocaleString("vi-VN")}₫
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Stack spacing={2} mb={3}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={700}>Voucher</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedVoucher ? `Đang dùng mã ${selectedVoucher.code}` : "Chọn voucher phù hợp cho đơn hàng này"}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ConfirmationNumberOutlinedIcon />}
                    onClick={() => setVoucherDialogOpen(true)}
                  >
                    {selectedVoucher ? "Đổi mã" : "Chọn mã"}
                  </Button>
                </Box>

                {selectedVoucher && (
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
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
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography color="success.main">Giảm giá</Typography>
                  <Typography color="success.main" fontWeight={700}>
                    - {formatCurrency(voucherDiscount)}
                  </Typography>
                </Box>
              )}

              <Box
                display="flex"
                justifyContent="space-between"
                mb={4}
                alignItems="center"
              >
                <Typography variant="h6" fontWeight={700}>
                  Tổng cộng:
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    background:
                      "linear-gradient(90deg, #1976d2, #42a5f5)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {formatCurrency(finalTotal)}
                </Typography>
              </Box>

              {/* ✅ BUTTON CHECKOUT – CHUYỂN THEO ID */}
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<ShoppingCartCheckoutIcon />}
                sx={{
                  py: 2,
                  borderRadius: "50px",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  background:
                    "linear-gradient(90deg, #1976d2, #42a5f5)",
                }}
                onClick={() => navigate(`/checkout/cart/${cart._id}`)}
              >
                Tiến hành thanh toán
              </Button>
            </Paper>
          </Grid>
        </Grid>
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
