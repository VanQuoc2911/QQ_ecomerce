// src/pages/CheckoutSuccessPage.tsx
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HomeIcon from "@mui/icons-material/Home";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PrintIcon from "@mui/icons-material/Print";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import {
    Avatar,
    Box,
    Button,
    Chip,
    Container,
    Divider,
    Paper,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState, type JSX } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { orderService, type OrderDetailResponse } from "../../api/orderService";
import { paymentService } from "../../api/paymentService";
import type { OrderItem } from "../../types/Order";

export default function CheckoutSuccessPage(): JSX.Element {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const { orderId } = useParams<{ orderId?: string }>();

  useEffect(() => {
    (async () => {
      if (orderId) {
        try {
          const data = await orderService.getOrderDetail(orderId);
          setOrder(data);
          return;
        } catch (err) {
          console.error(err);
        }
      }

      if (location.state && (location.state as { order?: OrderDetailResponse }).order) {
        setOrder((location.state as { order: OrderDetailResponse }).order);
      } else {
        const savedOrder = localStorage.getItem("lastOrder");
        if (savedOrder) setOrder(JSON.parse(savedOrder));
      }
    })();
  }, [location.state, orderId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if ((params.get("method") || "").toLowerCase() !== "payos") return;
    if (!orderId) return;

    const rawStatus = (params.get("status") || "").toUpperCase();
    if (!rawStatus) return;
    if (!["PAID", "PROCESSING", "COMPLETED", "SUCCESS", "SUCCEEDED"].includes(rawStatus)) {
      return;
    }

    const orderCodeParam = params.get("orderCode");
    const parsedOrderCode = orderCodeParam ? Number(orderCodeParam) : undefined;
    const normalizedOrderCode =
      typeof parsedOrderCode === "number" && Number.isFinite(parsedOrderCode)
        ? parsedOrderCode
        : undefined;

    void (async () => {
      try {
        const response = await paymentService.syncPayosStatus(
          orderId,
          normalizedOrderCode ? { orderCode: normalizedOrderCode } : undefined
        );
        if (response?.order) {
          setOrder(response.order);
        }
      } catch (err) {
        console.error("CheckoutSuccess PayOS sync error:", err);
      }
    })();
  }, [location.search, orderId]);

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

  type NormalizedItem = {
    id: string;
    title: string;
    images?: string[];
    quantity: number;
    unitPrice: number;
    subTotal: number;
  };

  type ExtendedOrder = OrderDetailResponse & Partial<{
    totalAmount: number;
    paymentMethod: string;
    shippingFee: number;
    discount: number;
    products: OrderItem[];
    items: OrderItem[];
  }>;

  const orderExt = order as ExtendedOrder;
  const isCOD = (orderExt.paymentMethod ?? "").toString().toLowerCase() === "cod";
  const paymentLabel = isCOD ? "Thanh toán khi nhận hàng" : (orderExt.paymentMethod ?? "-");
  const paymentStatusLabel = isCOD ? "Thanh toán khi nhận hàng" : "Đã thanh toán";
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
    const productRef = it.productId ?? null;
    const title = productRef?.title ?? it.title ?? `Sản phẩm ${idx + 1}`;
    const id = productRef?._id ?? it._id ?? String(idx);
    const images = productRef?.images ?? it.images ?? [];
    const unitPrice = (it.price ?? productRef?.price ?? 0) as number;
    const quantity = it.quantity ?? 1;
    const subTotal = unitPrice * quantity;
    return { id, title, images, quantity, unitPrice, subTotal } as NormalizedItem;
  });
  const discountAmount = orderExt.discount ?? 0;
  const hasDiscount = discountAmount > 0;
  const totalPrice = orderExt.totalAmount ?? items.reduce((acc, i) => acc + i.subTotal, 0);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 4, md: 8 },
        background:
          theme.palette.mode === "dark"
            ? "radial-gradient(circle at 20% 20%, rgba(120,140,255,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(0,210,170,0.18), transparent 35%), linear-gradient(140deg, #0d1422, #0f1f32)"
            : "radial-gradient(circle at 20% 20%, rgba(0,122,255,0.12), transparent 35%), radial-gradient(circle at 80% 0%, rgba(0,200,160,0.12), transparent 35%), linear-gradient(135deg, #e8f3ff, #f7fafc)",
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Paper
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              position: "relative",
              overflow: "hidden",
              background: theme.palette.mode === "dark"
                ? "linear-gradient(135deg, rgba(76,175,80,0.08), rgba(33,150,243,0.08))"
                : "linear-gradient(135deg, rgba(76,175,80,0.12), rgba(33,150,243,0.1))",
              boxShadow: "0 18px 50px rgba(15,23,42,0.18)",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: theme.palette.mode === "dark"
                  ? "radial-gradient(circle at 15% 15%, rgba(255,255,255,0.04), transparent 30%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.05), transparent 28%)"
                  : "radial-gradient(circle at 10% 10%, rgba(255,255,255,0.45), transparent 30%), radial-gradient(circle at 90% 10%, rgba(255,255,255,0.38), transparent 30%)",
              }}
            />
            <Grid container spacing={2} alignItems="center" sx={{ position: "relative" }}>
              <Grid item xs={12} md={7}>
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.success.main,
                        width: 76,
                        height: 76,
                        boxShadow: `0 14px 40px ${theme.palette.success.main}4d`,
                        border: `3px solid ${theme.palette.background.paper}`,
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 40, color: theme.palette.getContrastText(theme.palette.success.main) }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" fontWeight={800} lineHeight={1.1}>
                        Thanh toán thành công
                      </Typography>
                      <Typography color="text.secondary">
                        Đơn hàng đã được xác nhận, chúng tôi sẽ bắt đầu chuẩn bị và giao cho bạn sớm nhất.
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Chip icon={<ReceiptLongIcon />} label={`Mã đơn: ${order._id}`} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
                    <Chip icon={<ShoppingBagIcon />} label={`${items.length} sản phẩm`} variant="filled" color="success" sx={{ fontWeight: 600 }} />
                    <Chip icon={<CheckCircleOutlineIcon />} label={order.status ?? "Đang xử lý"} variant="outlined" color="success" />
                  </Stack>
                </Stack>
              </Grid>

              <Grid item xs={12} md={5}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
                    borderColor: theme.palette.divider,
                  }}
                >
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography color="text.secondary">Tổng thanh toán</Typography>
                      <Typography variant="h5" fontWeight={800} color="success.main">
                        {Number(totalPrice).toLocaleString("vi-VN")}₫
                      </Typography>
                    </Stack>
                    <Divider flexItem />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Ngày đặt</Typography>
                      <Typography fontWeight={700}>{new Date(order.createdAt ?? Date.now()).toLocaleString()}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Thanh toán</Typography>
                      <Typography fontWeight={700}>{paymentLabel}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Giao đến</Typography>
                      <Typography fontWeight={700}>{order.shippingAddress?.province ?? order.shippingAddress?.city ?? "-"}</Typography>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 10px 30px rgba(15,23,42,0.1)" }}>
                <Stack spacing={0.75}>
                  <Typography variant="overline" color="text.secondary">Trạng thái</Typography>
                  <Typography variant="h6" fontWeight={800}>{paymentStatusLabel}</Typography>
                  <Typography color="text.secondary">Đơn hàng đang được xử lý và sẽ bàn giao cho đơn vị vận chuyển.</Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 10px 30px rgba(15,23,42,0.1)" }}>
                <Stack spacing={0.75}>
                  <Typography variant="overline" color="text.secondary">Người nhận</Typography>
                  <Typography variant="h6" fontWeight={800}>{order.shippingAddress?.name ?? order.customerName}</Typography>
                  <Typography color="text.secondary">{order.shippingAddress?.phone ?? "-"}</Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 10px 30px rgba(15,23,42,0.1)" }}>
                <Stack spacing={0.75}>
                  <Typography variant="overline" color="text.secondary">Địa chỉ</Typography>
                  <Typography fontWeight={700}>
                    {order.shippingAddress
                      ? `${order.shippingAddress.detail ?? order.shippingAddress.address ?? ""}, ${order.shippingAddress.ward ?? ""}, ${order.shippingAddress.district ?? ""}, ${order.shippingAddress.province ?? order.shippingAddress.city ?? ""}`
                      : "-"}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 14px 40px rgba(15,23,42,0.12)" }}>
            <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" spacing={2} mb={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlineIcon color="success" />
                <Typography variant="h6" fontWeight={800}>Trạng thái giao hàng</Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Chip label="Đặt hàng" color="success" />
                <Chip label={paymentStatusLabel} color="success" variant="outlined" />
                <Chip label="Đang xử lý" color="primary" variant="outlined" />
              </Stack>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%", backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#f8fbff" }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Tiền hàng</Typography>
                      <Typography fontWeight={700}>{(items.reduce((s, i) => s + i.subTotal, 0)).toLocaleString("vi-VN")}₫</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography color="text.secondary">Phí vận chuyển</Typography>
                      <Typography fontWeight={700}>{(orderExt.shippingFee ?? 0).toLocaleString("vi-VN")}₫</Typography>
                    </Stack>
                    {hasDiscount && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">Giảm giá</Typography>
                        <Typography fontWeight={700} color="success.main">-{discountAmount.toLocaleString("vi-VN")}₫</Typography>
                      </Stack>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography fontWeight={800}>Tổng cộng</Typography>
                      <Typography variant="h5" fontWeight={900} color="success.main">{Number(totalPrice).toLocaleString("vi-VN")}₫</Typography>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%", backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "#f8fbff" }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                    <LocalShippingIcon color="primary" />
                    <Typography fontWeight={800}>Thông tin giao hàng</Typography>
                  </Stack>
                  <Stack spacing={0.75}>
                    <Typography fontWeight={700}>{order.shippingAddress?.name ?? order.customerName}</Typography>
                    <Typography color="text.secondary">{order.shippingAddress?.phone ?? "-"}</Typography>
                    <Typography>
                      {order.shippingAddress
                        ? `${order.shippingAddress.detail ?? order.shippingAddress.address ?? ""}, ${order.shippingAddress.ward ?? ""}, ${order.shippingAddress.district ?? ""}, ${order.shippingAddress.province ?? order.shippingAddress.city ?? ""}`
                        : "-"}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 3, boxShadow: "0 12px 36px rgba(15,23,42,0.12)" }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <ShoppingBagIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>Chi tiết sản phẩm</Typography>
            </Stack>
            <Stack spacing={1.5}>
              {items.map((item) => (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{ p: 1.75, borderRadius: 2.5, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
                >
                  <Stack direction="row" spacing={1.75} alignItems="center">
                    <Box
                      component="img"
                      src={item.images?.[0] ?? "/placeholder.png"}
                      alt={item.title}
                      sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: 1.5, boxShadow: "0 6px 16px rgba(15,23,42,0.12)" }}
                    />
                    <Box>
                      <Typography fontWeight={800}>{item.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.quantity} x {item.unitPrice.toLocaleString("vi-VN")}₫
                      </Typography>
                      <Chip size="small" label={`SL: ${item.quantity}`} variant="outlined" sx={{ mt: 0.5 }} />
                    </Box>
                  </Stack>
                  <Typography variant="h6" fontWeight={900}>{item.subTotal.toLocaleString("vi-VN")}₫</Typography>
                </Paper>
              ))}
            </Stack>
          </Paper>

          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
                sx={{ py: 1.2, borderRadius: 2 }}
              >
                In hóa đơn
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<ReceiptLongIcon />}
                onClick={() => navigate(`/orders/${order._id}`)}
                sx={{ py: 1.2, borderRadius: 2 }}
              >
                Xem chi tiết đơn hàng
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="text"
                onClick={() => navigate("/")}
                sx={{ py: 1.1, borderRadius: 2 }}
              >
                Tiếp tục mua sắm
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={<HomeIcon />}
                onClick={() => navigate("/")}
                sx={{ py: 1.2, borderRadius: 2 }}
              >
                Quay về trang chủ
              </Button>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
