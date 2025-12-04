import RateReviewIcon from "@mui/icons-material/RateReview";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { orderService, type OrderDetailResponse } from "../../api/orderService";
import { paymentService } from "../../api/paymentService";
import ReviewModal from "../../components/ReviewModal";
import { STATUS_CONFIG } from "../../utils/orderStatus";

// use centralized status config
// NOTE: components below reference STATUS_CONFIG for labels/colors/borders

// Countdown timer component for payment deadline
function PaymentCountdown({ remainingMs, isExpired, deadlineDate }: { remainingMs: number | null; isExpired: boolean; deadlineDate: string | null }) {
  const [displayTime, setDisplayTime] = useState<string>("");
  // Keep an absolute end timestamp so the countdown can tick every second
  const endTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (remainingMs === null || remainingMs === undefined) {
      setDisplayTime("");
      endTsRef.current = null;
      return;
    }

    // compute end timestamp relative to now
    endTsRef.current = Date.now() + remainingMs;

    const updateDisplay = () => {
      if (endTsRef.current === null) {
        setDisplayTime("");
        return;
      }
      const diff = endTsRef.current - Date.now();
      if (diff <= 0) {
        setDisplayTime("Hết hạn");
        return;
      }
      const totalSecs = Math.floor(diff / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      if (days > 0) setDisplayTime(`${days}d ${hours}h ${mins}m ${secs}s`);
      else if (hours > 0) setDisplayTime(`${hours}h ${mins}m ${secs}s`);
      else if (mins > 0) setDisplayTime(`${mins}m ${secs}s`);
      else setDisplayTime(`${secs}s`);
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [remainingMs]);

  if (!displayTime) return null;

  return (
    <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: isExpired ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)", border: "1px solid", borderColor: isExpired ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)" }}>
      <Typography sx={{ fontWeight: 700, color: isExpired ? "#ef4444" : "#f59e0b" }}>
        ⏱️ Thời hạn thanh toán: {displayTime}
      </Typography>
      {deadlineDate && (
        <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 1 }}>
          Hết hạn lúc: {new Date(deadlineDate).toLocaleString("vi-VN")}
        </Typography>
      )}
    </Box>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [redirectingPayos, setRedirectingPayos] = useState(false);
  const [codAction, setCodAction] = useState<"confirm" | "cancel" | null>(null);
  const [reviewDialog, setReviewDialog] = useState({ open: false, productId: "", productTitle: "" });
  const [reviewedProductIds, setReviewedProductIds] = useState<string[]>([]);
  const theme = useTheme();

  const fetchOrder = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!id) return;
      if (!silent) {
        setLoading(true);
      }
      try {
        const data = await orderService.getOrderDetail(id);
        // enrich payment deadline fields (7 hours window for payment_pending)
        const out: Partial<OrderDetailResponse> = { ...data };
        if ((out.status === "payment_pending") && !out.paymentDeadline && (out.remainingTime === undefined || out.remainingTime === null)) {
          const createdTs = out.createdAt ? Date.parse(out.createdAt) : NaN;
          if (!Number.isNaN(createdTs)) {
            const deadline = createdTs + 7 * 3600 * 1000;
            const remaining = deadline - Date.now();
            out.paymentDeadline = new Date(deadline).toISOString();
            out.remainingTime = remaining > 0 ? remaining : 0;
            out.isExpired = remaining <= 0;
          }
        } else if (out.paymentDeadline) {
          const remaining = Date.parse(out.paymentDeadline) - Date.now();
          out.remainingTime = remaining > 0 ? remaining : 0;
          out.isExpired = remaining <= 0;
        } else if (out.remainingTime !== undefined) {
          out.isExpired = (out.remainingTime || 0) <= 0;
        }
        setOrder(out as OrderDetailResponse);
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải chi tiết đơn hàng!");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [id]
  );

  // Auto-cancel logic for payment_pending orders: countdown and cancel when expired
  useEffect(() => {
    if (!order || order.status !== "payment_pending") return;

    // Keep a ticking interval to update remainingTime in state for UI and to detect expiry
    const tick = setInterval(() => {
      setOrder((prev) => {
        if (!prev) return prev;
        const prevRem = prev.remainingTime ?? 0;
        const nextRem = Math.max(prevRem - 1000, 0);
        const updated = { ...prev, remainingTime: nextRem, isExpired: nextRem <= 0 } as OrderDetailResponse;
        return updated;
      });
    }, 1000);

    // Cancel timeout: when remainingTime reaches zero, attempt cancel on server
    let cancelTimeout: ReturnType<typeof setTimeout> | null = null;
    if ((order.remainingTime ?? 0) > 0) {
      cancelTimeout = setTimeout(async () => {
        try {
          const res = await orderService.cancelOrder(order._id);
          setOrder(res.order);
          toast.info("Đơn hàng đã tự động hủy do quá hạn thanh toán (7 giờ).");
        } catch (err) {
          // if cancel fails, refetch to sync
          try {
            const fresh = await orderService.getOrderDetail(order._id);
            setOrder(fresh);
          } catch {}
        }
      }, order.remainingTime ?? 0);
    } else {
      // expired already: attempt cancel immediately
      (async () => {
        try {
          const res = await orderService.cancelOrder(order._id);
          setOrder(res.order);
          toast.info("Đơn hàng đã tự động hủy do quá hạn thanh toán (7 giờ).");
        } catch {
          try {
            const fresh = await orderService.getOrderDetail(order._id);
            setOrder(fresh);
          } catch {}
        }
      })();
    }

    return () => {
      clearInterval(tick);
      if (cancelTimeout) clearTimeout(cancelTimeout);
    };
  }, [order?._id, order?.status]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!order?._id) return;

    const socket = io(); // connect to same origin
    socket.on("connect", () => console.log("OrderDetail socket connected:", socket.id));

    socket.on("order:paymentPending", (payload: { orderId: string; status: string }) => {
      if (payload.orderId === order._id) {
        setOrder((o) => o ? { ...o, status: "payment_pending" as const } : null);
      }
    });

    socket.on("order:paymentConfirmed", (payload: { orderId: string; status: string }) => {
      if (payload.orderId === order._id) {
        setOrder((o) => o ? { ...o, status: "processing" as const } : null);
      }
    });

    socket.on("order:statusUpdated", (payload: { orderId: string; status: string }) => {
      if (payload.orderId === order._id) {
        // optionally refetch to sync all fields
        orderService
          .getOrderDetail(order._id)
          .then((fresh) => setOrder(fresh))
          .catch(() => {});
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [order?._id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("changeMethod") !== "true") return;
    if (!order) return;

    if (
      order.paymentExpired ||
      !["pending", "payment_pending"].includes(order.status ?? "")
    ) {
      toast.info("Đơn hàng đã được xử lý, không thể đổi phương thức.");
      return;
    }

    toast.info("Vui lòng chọn hành động COD bên dưới để tiếp tục.");
  }, [location.search, order]);

  const handledPayosParams = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment")?.toLowerCase() !== "payos") {
      handledPayosParams.current = null;
      return;
    }

    const currentSearch = location.search;
    if (handledPayosParams.current === currentSearch) return;
    handledPayosParams.current = currentSearch;

    const rawStatus = (params.get("status") || "").toUpperCase();
    const orderCode = params.get("orderCode");
    const isCancelled = params.get("cancel") === "true";
    const descriptor = orderCode ? ` (Mã PayOS: ${orderCode})` : "";

    const redirectToProductDetail = () => {
      const itemList = (order?.products?.length ? order.products : order?.items) ?? [];
      const firstItemWithProduct = itemList.find((item) => {
        if (!item?.productId) return false;
        if (typeof item.productId === "string") return true;
        return Boolean(item.productId?._id);
      });

      const productId = typeof firstItemWithProduct?.productId === "string"
        ? firstItemWithProduct.productId
        : firstItemWithProduct?.productId?._id;

      if (!productId) {
        return false;
      }

      navigate(`/products/${productId}`, {
        state: {
          fromOrderId: order?._id ?? null,
          paymentStatus: rawStatus || (isCancelled ? "CANCELLED" : undefined),
          paymentDeadline: order?.paymentDeadline ?? null,
          paymentRetryWindowMs: order?.remainingTime ?? null,
        },
      });
      return true;
    };

    let redirected = false;

    if (rawStatus === "PAID" || rawStatus === "PROCESSING") {
      toast.success(`PayOS đã ghi nhận thanh toán${descriptor}. Hệ thống sẽ đồng bộ trạng thái trong giây lát.`);
    } else if (rawStatus === "CANCELLED" || rawStatus === "CANCEL" || isCancelled) {
      toast.info(`Bạn đã hủy thanh toán PayOS${descriptor}. Đang đưa bạn về trang sản phẩm để thanh toán lại.`);
      redirected = redirectToProductDetail();
      if (!redirected) {
        toast.info("Không xác định được sản phẩm để chuyển hướng. Vui lòng thử lại từ danh sách đơn hàng.");
      }
    } else if (rawStatus === "FAILED" || rawStatus === "EXPIRED") {
      toast.error(`Giao dịch PayOS không thành công${descriptor}. Vui lòng thử lại hoặc chọn phương thức khác.`);
    } else if (rawStatus) {
      toast.info(`Trạng thái PayOS: ${rawStatus}${descriptor}`);
    } else {
      toast.info(`Đã thoát khỏi luồng PayOS${descriptor}.`);
    }

    if (!redirected) {
      void fetchOrder({ silent: true });
      navigate(location.pathname, { replace: true });
    }
  }, [fetchOrder, location.pathname, location.search, navigate, order]);

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

  if (!order) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Không tìm thấy đơn hàng!
        </Typography>
      </Box>
    );
  }

  type OrderDetailExtended = OrderDetailResponse & {
    shippingFee?: number;
    voucherDiscount?: number;
    discount?: number;
    shippingMeta?: { summaryEntry?: { fee?: number } };
  };
  const normalizedOrder = order as OrderDetailExtended;
  const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString("vi-VN")}₫`;

  const itemsSubtotal = (normalizedOrder.products || normalizedOrder.items)?.reduce(
    (acc, item) => acc + (item.price || item.productId?.price || 0) * item.quantity,
    0
  ) ?? 0;
  const shippingFee = normalizedOrder.shippingFee ?? normalizedOrder.shippingMeta?.summaryEntry?.fee ?? 0;
  const voucherDiscount = normalizedOrder.voucherDiscount ?? normalizedOrder.discount ?? 0;
  const computedTotal = Math.max(itemsSubtotal + shippingFee - voucherDiscount, 0);
  const totalToDisplay = normalizedOrder.totalAmount ?? computedTotal;
  const statusBadge =
    STATUS_CONFIG[order.status ?? ""] || {
      label: order.status ? order.status : "Không rõ",
      color: "#475569",
      border: "rgba(148, 163, 184, 0.4)",
      background: "rgba(148, 163, 184, 0.15)",
    };
  const isPending = order.status === "pending";
  const isPaymentPending = order.status === "payment_pending";
  const canSwitchToCod =
    order.paymentMethod === "payos" &&
    (isPending || isPaymentPending) &&
    !order.paymentExpired &&
    !order.isExpired;

  const handleMarkAsPaid = async () => {
    if (!order) return;
    setMarking(true);
    try {
      // optimistic UI update
      setOrder((s) => s ? { ...s, status: "payment_pending" as const } : null);
      const res = await orderService.markAsPaid(order._id);
      toast.success("✅ Đã báo hoàn thành. Seller sẽ kiểm tra và xác nhận.");
      // update to canonical response
      setOrder(res.order);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Không thể báo hoàn thành thanh toán.";
      toast.error(`❌ ${errMsg}`);
      // revert optimistic update: refetch order
      try {
        const fresh = await orderService.getOrderDetail(order._id);
        setOrder(fresh);
      } catch {
        // ignore if refetch fails
      }
    } finally {
      setMarking(false);
    }
  };

  const handlePayosCheckout = async (targetOrderId?: string) => {
    const effectiveOrderId = targetOrderId ?? order?._id;
    if (!effectiveOrderId) return;
    setRedirectingPayos(true);
    try {
      toast.info("🔁 Đang mở PayOS...", { autoClose: 1500 });
      const link = await paymentService.createPayosLink(effectiveOrderId);
      if (!link.checkoutUrl) {
        throw new Error("Không lấy được liên kết PayOS");
      }
      window.open(link.checkoutUrl, "_blank", "noopener");
    } catch (err) {
      console.error("OrderDetail PayOS error:", err);
      const message =
        err instanceof Error ? err.message : "Không mở được PayOS. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setRedirectingPayos(false);
    }
  };

  const handleSwitchToCod = async (decision: "confirm" | "cancel") => {
    if (!order?._id) return;
    setCodAction(decision);
    try {
      const { order: updated } = await orderService.changePaymentMethod(
        order._id,
        "cod",
        { decision }
      );
      setOrder(updated);
      toast.success(
        decision === "cancel"
          ? "Đơn hàng đã được huỷ theo yêu cầu của bạn."
          : "Đã chuyển sang COD, seller sẽ xử lý đơn."
      );
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : "Không thể cập nhật phương thức thanh toán.";
      toast.error(message);
    } finally {
      setCodAction(null);
    }
  };

  const openReviewModal = (productId?: string, title?: string) => {
    if (!productId) return;
    setReviewDialog({ open: true, productId, productTitle: title || "Sản phẩm" });
  };

  const closeReviewModal = () => {
    setReviewDialog({ open: false, productId: "", productTitle: "" });
  };

  const handleReviewSuccess = (productId: string) => {
    setReviewedProductIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    closeReviewModal();
  };


  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 6,
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #0a1929 0%, #1a2942 100%)"
            : "linear-gradient(135deg, #e3f2fd 0%, #ffffff 50%, #e3f2fd 100%)",
      }}
    >
      <Container>
        <Typography
          variant="h4"
          fontWeight={800}
          gutterBottom
          sx={{
            background: "linear-gradient(90deg, #1976d2, #42a5f5)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Chi tiết đơn hàng {order._id}
        </Typography>

        <Grid container spacing={4}>
          {/* Thông tin khách hàng */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
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
              }}
            >
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Thông tin khách hàng
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1">
                <strong>Người nhận:</strong> {order.shippingAddress?.name ?? order.customerName ?? "-"}
              </Typography>
              <Typography variant="body1">
                <strong>Tài khoản:</strong>{" "}
                {typeof order.userId === "string" ? order.userId : order.userId?.name ?? "Khách vãng lai"}
              </Typography>
              <Typography variant="body1">
                <strong>Email:</strong> {typeof order.userId === "object" ? order.userId?.email ?? "-" : "-"}
              </Typography>
              <Typography variant="body1">
                <strong>Số điện thoại:</strong> {order.shippingAddress?.phone ?? "-"}
              </Typography>
              <Typography variant="body1">
                <strong>Địa chỉ giao hàng:</strong>{" "}
                {[
                  order.shippingAddress?.detail,
                  order.shippingAddress?.ward,
                  order.shippingAddress?.district,
                  order.shippingAddress?.province,
                  order.shippingAddress?.city,
                  order.shippingAddress?.address,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </Typography>
              <Typography variant="body1">
                <strong>Phí vận chuyển:</strong> {shippingFee > 0 ? formatCurrency(shippingFee) : "Miễn phí"}
              </Typography>
              <Typography variant="body1">
                <strong>Tổng thanh toán:</strong> {formatCurrency(totalToDisplay)}
              </Typography>
              <Typography variant="body1">
                <strong>Phương thức thanh toán:</strong> {order.paymentMethod ?? "-"}
              </Typography>
              {(order.note || order.customerNote) && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Ghi chú khách hàng:</strong> {order.note ?? order.customerNote}
                </Typography>
              )}
              <Typography variant="body1">
                <strong>Ngày tạo:</strong>{" "}
                {order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Trạng thái:
                </Typography>
                <Chip
                  label={statusBadge.label}
                  sx={{
                    fontWeight: 600,
                    color: statusBadge.color,
                    backgroundColor: statusBadge.background,
                    border: `1px solid ${statusBadge.border}`,
                  }}
                />
              </Box>

              {/* Payment Expired Alert */}
              {order.status === "cancelled" && order.paymentExpired && (
                <Paper
                  sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "rgba(239, 68, 68, 0.1)",
                    border: "2px solid #ef4444",
                  }}
                >
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: "#ef4444" }}>
                    ❌ Đơn hàng đã hủy
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#ef4444" }}>
                    Lý do: Quá hạn thanh toán (24h)
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                    Vui lòng đặt hàng lại nếu bạn vẫn muốn mua sản phẩm này.
                  </Typography>
                </Paper>
              )}

              {/* Payment deadline countdown for prepaid methods only */}
              {(order.status === "pending" || order.status === "payment_pending") && order.paymentMethod !== "cod" && (
                <PaymentCountdown
                  remainingMs={order.remainingTime || null}
                  isExpired={order.isExpired || false}
                  deadlineDate={order.paymentDeadline || null}
                />
              )}

              {/* Seller Bank Account Info for Banking/MoMo payments */}
              {(order.status === "pending" || order.status === "payment_pending") && order.sellerBankAccount && order.paymentMethod !== "payos" && (
                <Paper
                  sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: "#fff3cd",
                    border: "2px solid #ff9800",
                  }}
                >
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: "#ff9800" }}>
                    💳 Thông tin chuyển khoản
                  </Typography>
                  <Typography variant="body2">
                    <strong>Ngân hàng:</strong> {order.sellerBankAccount.bankName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Số tài khoản:</strong> {order.sellerBankAccount.accountNumber}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Chủ tài khoản:</strong> {order.sellerBankAccount.accountHolder}
                  </Typography>
                  {order.sellerBankAccount.branch && (
                    <Typography variant="body2">
                      <strong>Chi nhánh:</strong> {order.sellerBankAccount.branch}
                    </Typography>
                  )}
                  {/* Mark as Paid button - only for pending banking/momo orders */}
                  {order.paymentMethod && (order.paymentMethod === "banking" || order.paymentMethod === "momo") && order.status === "pending" && !order.isExpired && (
                    <Button
                      variant="contained"
                      color="success"
                      fullWidth
                      onClick={handleMarkAsPaid}
                      disabled={marking}
                      sx={{ mt: 2 }}
                    >
                      {marking ? "⏳ Đang xử lý..." : "✅ Hoàn thành (Tôi đã chuyển khoản)"}
                    </Button>
                  )}
                  {order.status === "payment_pending" && (
                    <Typography sx={{ mt: 2, p: 1, bgcolor: "rgba(33, 150, 243, 0.1)", borderRadius: 1, color: "#1976d2" }}>
                      ⏳ Đã báo hoàn thành — đang chờ seller xác nhận.
                    </Typography>
                  )}
                  {/* Shipper info (if assigned) */}
                  {order.shipperSnapshot && (
                    <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Thông tin người giao
                      </Typography>
                      <Typography variant="body2"><strong>Tên:</strong> {order.shipperSnapshot.name ?? '-'}</Typography>
                      <Typography variant="body2"><strong>Số điện thoại:</strong> {order.shipperSnapshot.phone ?? '-'}</Typography>
                      <Typography variant="body2"><strong>Phương tiện:</strong> {order.shipperSnapshot.vehicleType ?? '-'}</Typography>
                      <Typography variant="body2"><strong>Biển số:</strong> {order.shipperSnapshot.licensePlate ?? '-'}</Typography>
                    </Paper>
                  )}
                </Paper>
              )}
            </Paper>
          </Grid>

          {/* Danh sách sản phẩm */}
          <Grid item xs={12} md={8}>
            {(order.products || order.items)?.map((item) => (
              item.productId && (
              <Paper
                key={item.productId._id}
                sx={{
                  mb: 3,
                  p: 2,
                  display: "flex",
                  gap: 2,
                  borderRadius: 3,
                  alignItems: "center",
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
                }}
              >
                <Box
                  component="img"
                  src={item.productId?.images?.[0] || "https://via.placeholder.com/100"}
                  alt={item.productId?.title}
                  sx={{
                    width: 100,
                    height: 100,
                    objectFit: "cover",
                    borderRadius: 2,
                  }}
                />
                <Box flex={1}>
                  <Typography fontWeight={700}>{item.productId?.title}</Typography>
                  <Typography>
                    {item.quantity} x {(item.price || item.productId?.price)?.toLocaleString("vi-VN")}₫
                  </Typography>
                </Box>
                {order.status === "completed" && item.productId?._id && (
                  <Button
                    variant={reviewedProductIds.includes(item.productId._id) ? "outlined" : "contained"}
                    startIcon={<RateReviewIcon fontSize="small" />}
                    onClick={() => openReviewModal(item.productId?._id, item.productId?.title)}
                    disabled={reviewedProductIds.includes(item.productId._id)}
                    sx={{
                      textTransform: "none",
                      borderRadius: 3,
                      background: reviewedProductIds.includes(item.productId._id)
                        ? undefined
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  >
                    {reviewedProductIds.includes(item.productId._id) ? "Đã đánh giá" : "Đánh giá"}
                  </Button>
                )}
              </Paper>
              )
            ))}

            {/* Tổng cộng */}
            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                display: "flex",
                flexDirection: "column",
                mt: 2,
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
              }}
            >
              <Stack spacing={1.25} sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Tạm tính</Typography>
                  <Typography fontWeight={700}>{formatCurrency(itemsSubtotal)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Phí vận chuyển</Typography>
                  <Typography fontWeight={700} color={shippingFee > 0 ? "text.primary" : "success.main"}>
                    {shippingFee > 0 ? formatCurrency(shippingFee) : "Miễn phí"}
                  </Typography>
                </Box>
                {voucherDiscount > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Giảm giá</Typography>
                    <Typography fontWeight={700} color="error.main">
                      -{formatCurrency(voucherDiscount)}
                    </Typography>
                  </Box>
                )}
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6" fontWeight={700}>
                  Tổng cộng
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
                  {formatCurrency(totalToDisplay)}
                </Typography>
              </Box>
            </Paper>

            <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
              {order.status === "pending" && !order.isExpired && order.paymentMethod === "payos" && (
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  size="large"
                  sx={{
                    mt: 3,
                    borderRadius: "50px",
                    py: 1.5,
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
                  }}
                  onClick={() => handlePayosCheckout()}
                >
                  {redirectingPayos ? "Đang chuyển..." : "💳 Thanh toán PayOS"}
                </Button>
              )}
              {order.status === "payment_pending" && order.paymentMethod === "payos" && (
                <>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    sx={{
                      mt: 3,
                      borderRadius: "50px",
                      py: 1.5,
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      background: "linear-gradient(90deg, #2196f3 0%, #1976d2 100%)",
                    }}
                    onClick={() => handlePayosCheckout()}
                  >
                    {redirectingPayos ? "Đang chuyển..." : "💳 Thanh toán lại"}
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled
                    size="large"
                    sx={{
                      mt: 2,
                      borderRadius: "50px",
                      py: 1.5,
                      fontSize: "1.1rem",
                      fontWeight: 700,
                    }}
                  >
                    ⏳ Chờ seller xác nhận thanh toán
                  </Button>
                </>
              )}
              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  mt: 3,
                  borderRadius: "50px",
                  py: 1.5,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  background: "linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)",
                }}
                onClick={() => navigate("/home")}
              >
                Quay về trang chủ
              </Button>
            </Box>
            {canSwitchToCod && (
              <Paper
                sx={{
                  mt: 3,
                  p: 3,
                  borderRadius: 3,
                  border: "1px dashed",
                  borderColor:
                    theme.palette.mode === "dark"
                      ? "rgba(148, 163, 184, 0.4)"
                      : "rgba(25,118,210,0.4)",
                  background:
                    theme.palette.mode === "dark"
                      ? "rgba(15,23,42,0.85)"
                      : "rgba(255,255,255,0.95)",
                }}
              >
                <Typography fontWeight={700} sx={{ mb: 1 }}>
                  Muốn chuyển sang COD ngay?
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Bạn có thể chuyển sang thanh toán khi nhận hàng hoặc huỷ đơn nếu không mua nữa.
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    size="large"
                    sx={{ borderRadius: "50px", py: 1.3, fontWeight: 700 }}
                    onClick={() => handleSwitchToCod("confirm")}
                    disabled={codAction !== null}
                  >
                    {codAction === "confirm" ? "Đang chuyển..." : "📦 Giao COD giúp tôi"}
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    size="large"
                    sx={{ borderRadius: "50px", py: 1.3, fontWeight: 700 }}
                    onClick={() => handleSwitchToCod("cancel")}
                    disabled={codAction !== null}
                  >
                    {codAction === "cancel" ? "Đang huỷ..." : "❌ Huỷ đơn hàng"}
                  </Button>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
      <ReviewModal
        open={reviewDialog.open}
        onClose={closeReviewModal}
        productId={reviewDialog.productId}
        productTitle={reviewDialog.productTitle}
        orderId={order._id}
        onSuccess={() => handleReviewSuccess(reviewDialog.productId)}
      />
    </Box>
  );
}
