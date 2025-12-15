import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Drawer,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Step,
    StepLabel,
    Stepper,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    type ButtonProps,
} from "@mui/material";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../../api/axios";
import { orderService, type OrderDetailResponse } from "../../api/orderService";
import { sellerService, type SellerStats } from "../../api/sellerService";
import { useAuth } from "../../context/AuthContext";
import { getStatusLabel, isAwaitingPayment } from "../../utils/orderStatus";
import { triggerReportModal } from "../../utils/reportModal";

import { io } from "socket.io-client";

interface OrderRow {
  _id: string;
  customerName?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
  products?: Array<{ quantity: number; [key: string]: unknown }>;
}

export default function SellerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [stats, setStats] = useState<SellerStats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    completedCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
    revenueLastMonth: 0,
  });

  // status labels/colors are provided by centralized STATUS_CONFIG

  // Get allowed next statuses based on current status (forward-only transitions)
  const getAllowedNextStatuses = (currentStatus?: string): string[] => {
    const transitions: Record<string, string[]> = {
      // Sellers should not manage payment confirmation here; remove intermediate payment_pending state.
      pending: ["cancelled"],
      // Sellers should only mark an order as prepared (awaiting_shipment) or cancel it.
      // Subsequent shipping statuses are managed by shippers.
      processing: ["awaiting_shipment", "cancelled"],
      // Sau khi đã chuẩn bị hàng, không cho phép huỷ nữa
      awaiting_shipment: [],
      shipping: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };
    return transitions[currentStatus || ""] || [];
  };

  const fetchOrders = async (opts?: { page?: number; limit?: number; q?: string; status?: string | null }) => {
    try {
      const p = opts?.page ?? page;
      const limit = opts?.limit ?? rowsPerPage;
      const params: Record<string, string | number> = { page: p + 1, limit };
      if ((opts?.q ?? q)?.length) params.q = opts?.q ?? q;
      if (opts?.status ?? statusFilter) params.status = (opts?.status ?? statusFilter) as string;

      const res = await api.get("/api/seller/orders", { params });
      // Expecting API to return list and total count (if not available fall back)
      const data = res.data;
      if (Array.isArray(data)) {
        setOrders(data);
        setTotal(data.length);
      } else if (data.items) {
        setOrders(data.items);
        setTotal(data.total ?? data.items.length);
      } else {
        setOrders([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("fetchOrders error", err);
    }
  };

  useEffect(() => {
    fetchOrders({ page, limit: rowsPerPage, q, status: statusFilter });
    fetchStats();

    const onOrderPlaced = () => {
      // when an order is placed we refresh the seller order list and stats
      fetchOrders({ page: 0, limit: rowsPerPage, q, status: statusFilter });
      fetchStats();
    };

    window.addEventListener("orderPlaced", onOrderPlaced as EventListener);
    return () => window.removeEventListener("orderPlaced", onOrderPlaced as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, user]);

  // Real-time updates from server via socket
  useEffect(() => {
    const socket = io();
    socket.on("connect", () => console.log("SellerOrders socket connected:", socket.id));

    const refresh = () => {
      fetchOrders({ page: 0, limit: rowsPerPage, q, status: statusFilter });
      fetchStats();
    };

    socket.on("order:created", refresh);
    socket.on("order:statusUpdated", () => {
      // Optionally narrow by seller-related payload if available
      refresh();
    });
    socket.on("order:paymentConfirmed", refresh);

    return () => {
      socket.disconnect();
    };
    // include deps used by refresh so hooks react to changes
  }, [page, rowsPerPage, q, statusFilter, user]);

  const fetchStats = async () => {
    try {
      const data = await sellerService.getStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(e.target.value));
    setPage(0);
  };

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }),
    []
  );

  const handleReportBuyer = () => {
    if (!selectedOrder) return;
    const orderId = selectedOrder._id ?? "";
    const buyerRaw = selectedOrder.userId as unknown;
    const buyerId =
      typeof buyerRaw === "object" && buyerRaw !== null
        ? (buyerRaw as { _id?: unknown; id?: unknown })._id ?? (buyerRaw as { id?: unknown }).id ?? null
        : buyerRaw;
    const buyerIdValue = typeof buyerId === "string" ? buyerId : typeof buyerId === "number" ? String(buyerId) : null;
    const sellerIdRaw = (user as unknown as { _id?: unknown; id?: unknown })?._id ?? (user as unknown as { id?: unknown })?.id ?? null;
    const sellerIdValue = typeof sellerIdRaw === "string" ? sellerIdRaw : typeof sellerIdRaw === "number" ? String(sellerIdRaw) : null;
    const shortCode = typeof orderId === "string" ? `#${orderId.slice(0, 8)}` : "";
    triggerReportModal({
      role: "user",
      title: `Khiếu nại khách hàng ${shortCode}`.trim(),
      category: "order_issue",
      relatedType: "order",
      relatedId: typeof orderId === "string" ? orderId : null,
      metadata: {
        orderId: typeof orderId === "string" ? orderId : null,
        buyerId: buyerIdValue,
        sellerId: sellerIdValue,
      },
    });
  };

  const openOrderDetail = async (orderId: string) => {
    try {
      const data = await orderService.getOrderDetail(orderId);
      setSelectedOrder(data as OrderDetailResponse);
      setDrawerOpen(true);
    } catch (err) {
      console.error("Failed to load order detail", err);
    }
  };

  const handleUpdateOrderStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    try {
      await orderService.updateOrderStatus(selectedOrder._id, newStatus);
      // Update local state
      setSelectedOrder({ ...selectedOrder, status: newStatus });
      // Refresh orders list
      fetchOrders({ page, limit: rowsPerPage, q, status: statusFilter });
    } catch (err) {
      console.error("Failed to update order status", err);
    }
  };

  // Quick action for list items: mark processing -> awaiting_shipment
  const handlePrepareOrder = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, "awaiting_shipment");
      // Refresh list and stats
      fetchOrders({ page, limit: rowsPerPage, q, status: statusFilter });
      fetchStats();
    } catch (err) {
      console.error("Failed to mark order as prepared", err);
    }
  };

  function getStatusMuiColor(arg0: string): import("@mui/types").OverridableStringUnion<
    "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning",
    import("@mui/material").ChipPropsColorOverrides
  > | undefined {
    switch (arg0) {
      case "pending":
        return "default";
      case "payment_pending":
        return "secondary";
      case "processing":
      case "awaiting_shipment":
        return "info";
      case "shipping":
        return "warning";
      case "completed":
        return "success";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  }

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedOrder(null);
  };

  const statusTabs = [
    { label: "Tất cả", value: null },
    { label: "Chờ xử lý", value: "pending" },
    { label: "Đang xử lý", value: "processing" },
    { label: "Chờ giao", value: "awaiting_shipment" },
    { label: "Đang giao", value: "shipping" },
    { label: "Hoàn thành", value: "completed" },
    { label: "Đã hủy", value: "cancelled" },
  ];

  const focusAwaitingOrders = () => {
    setStatusFilter("awaiting_shipment");
    setPage(0);
    fetchOrders({ page: 0, limit: rowsPerPage, q, status: "awaiting_shipment" });
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg, #ffffff 0%, #dbeafe 85%)", py: 2 }}>
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            background: "linear-gradient(120deg, rgba(191,219,254,0.9), #ffffff)",
            border: "1px solid rgba(37,99,235,0.2)",
            color: "#0f172a",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }}>
            <Stack spacing={1} flex={1}>
              <Typography variant="overline" sx={{ color: "#2563eb", letterSpacing: 2 }}>
                Tổng quan đơn hàng
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Kiểm soát toàn bộ tiến trình giao hàng
              </Typography>
              <Typography variant="body2" sx={{ color: "#0ea5e9", maxWidth: 520 }}>
                Theo dõi doanh thu, số lượng đơn và trạng thái xử lý theo thời gian thực. Các thay đổi được cập nhật tức thì từ hệ thống.
              </Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => fetchOrders({ page, limit: rowsPerPage, q, status: statusFilter })}
                sx={{ borderColor: "rgba(37,99,235,0.4)", color: "#2563eb", textTransform: "none" }}
              >
                Làm mới dữ liệu
              </Button>
              <Button
                variant="contained"
                startIcon={<LocalShippingOutlinedIcon />}
                sx={{
                  textTransform: "none",
                  background: "linear-gradient(120deg, #2563eb, #0ea5e9)",
                }}
                onClick={focusAwaitingOrders}
              >
                Đơn cần gửi
              </Button>
            </Stack>
          </Stack>
          <GridStats stats={stats} formatter={currencyFormatter} />
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            background: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(37,99,235,0.18)",
          }}
        >
          <Stack spacing={2}>
            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const inputValue = (e.target as HTMLInputElement).value;
                  setPage(0);
                  fetchOrders({ page: 0, limit: rowsPerPage, q: inputValue, status: statusFilter });
                }
              }}
              placeholder="Tìm theo mã đơn, khách hàng..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: "#60a5fa" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                fieldset: { borderColor: "rgba(37,99,235,0.35)" },
                input: { color: "#0f172a" },
              }}
            />
            <Tabs
              value={statusFilter ?? "all"}
              onChange={(_, value) => {
                const next = value === "all" ? null : value;
                setStatusFilter(next);
                setPage(0);
                fetchOrders({ page: 0, limit: rowsPerPage, q, status: next });
              }}
              variant="scrollable"
              scrollButtons="auto"
              textColor="primary"
              indicatorColor="primary"
            >
              {statusTabs.map((tab) => (
                <Tab
                  key={tab.label}
                  label={tab.label}
                  value={tab.value ?? "all"}
                  sx={{ color: "#2563eb", textTransform: "none" }}
                />
              ))}
            </Tabs>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            background: "#ffffff",
            border: "1px solid rgba(37,99,235,0.15)",
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "rgba(191,219,254,0.6)" }}>
                  {[
                    "Mã đơn",
                    "Khách hàng",
                    "Sản phẩm",
                    "Giá trị",
                    "Trạng thái",
                    "Ngày tạo",
                    "Hành động",
                  ].map((col) => (
                    <TableCell key={col} sx={{ color: "#0f172a", fontWeight: 600 }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="#60a5fa">Không có đơn hàng phù hợp</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o._id} hover sx={{ "&:hover": { backgroundColor: "rgba(37,99,235,0.05)" } }}>
                      <TableCell sx={{ fontWeight: 600, color: "#0f172a" }}>{o._id?.slice(0, 10)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 36, height: 36, bgcolor: "#2563eb", color: "#fff" }}>
                            {(o.customerName ?? "??").slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>{o.customerName ?? "Khách lẻ"}</Typography>
                            <Typography variant="caption" sx={{ color: "#1d4ed8" }}>
                              {o.products?.length ?? 0} mặt hàng
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: "#1d4ed8" }}>
                          {o.products?.length ?? 0} sản phẩm
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, color: "#2563eb" }}>
                          {currencyFormatter.format(o.totalAmount ?? 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(o.status ?? "pending")}
                          size="small"
                          color={getStatusMuiColor(o.status ?? "pending")}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ color: "#2563eb" }}>
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString("vi-VN") : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button variant="outlined" size="small" onClick={() => openOrderDetail(o._id)} sx={{ borderColor: "rgba(37,99,235,0.4)", color: "#2563eb" }}>
                            Chi tiết
                          </Button>
                          {o.status === "processing" && (
                            <Tooltip title="Đánh dấu đã chuẩn bị hàng">
                              <Button
                                size="small"
                                variant="contained"
                                sx={{ background: "linear-gradient(120deg, #2563eb, #0ea5e9)" }}
                                onClick={() => handlePrepareOrder(o._id)}
                              >
                                ✓ Chuẩn bị xong
                              </Button>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            sx={{ color: "#2563eb" }}
          />
        </Paper>
      </Stack>

      <Drawer anchor="right" open={drawerOpen && !!selectedOrder} onClose={closeDrawer} PaperProps={{ sx: { width: { xs: "100%", sm: 480 } } }}>
        {selectedOrder && (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", color: "#0f172a" }}>
            <Box sx={{ p: 3, borderBottom: "1px solid rgba(37,99,235,0.25)", display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box>
                <Typography variant="overline" sx={{ color: "#60a5fa" }}>
                  Chi tiết đơn hàng
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  #{selectedOrder._id?.slice(0, 10)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="outlined"
                size="small"
                startIcon={<ReportProblemIcon fontSize="small" />}
                onClick={handleReportBuyer}
                sx={{
                  borderColor: "rgba(245,158,11,0.6)",
                  color: "#d97706",
                  textTransform: "none",
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: "rgba(217,119,6,0.8)",
                    background: "rgba(254,243,199,0.6)",
                  },
                }}
              >
                Báo cáo khách
              </Button>
              <IconButton onClick={closeDrawer} sx={{ color: "#2563eb" }}>
                <CloseRoundedIcon />
              </IconButton>
            </Box>

            <Box sx={{ px: 3, py: 2 }}>
              <Stepper activeStep={Math.max(["pending", "processing", "awaiting_shipment", "shipping", "completed"].indexOf(selectedOrder.status ?? "pending"), 0)} alternativeLabel>
                {["pending", "processing", "awaiting_shipment", "shipping", "completed"].map((step) => (
                  <Step key={step}>
                    <StepLabel>{getStatusLabel(step)}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", px: 3, pb: 3 }}>
              <Section title="Thông tin khách hàng">
                <Stack spacing={1}>
                  <InfoRow
                    label="Khách hàng"
                    value={(typeof selectedOrder.userId === "object" && selectedOrder.userId?.name) || selectedOrder.customerName || "-"}
                  />
                  <InfoRow label="Điện thoại" value={selectedOrder.shippingAddress?.phone ?? "-"} />
                  <InfoRow
                    label="Địa chỉ"
                    value={
                      selectedOrder.shippingAddress
                        ? `${selectedOrder.shippingAddress.detail ?? selectedOrder.shippingAddress.address ?? ""}, ${selectedOrder.shippingAddress.ward ?? ""}, ${selectedOrder.shippingAddress.district ?? ""}, ${selectedOrder.shippingAddress.province ?? selectedOrder.shippingAddress.city ?? ""}`
                        : "-"
                    }
                  />
                  <InfoRow label="Thanh toán" value={selectedOrder.paymentMethod ?? "Không xác định"} />
                </Stack>
              </Section>

              {selectedOrder.shipperSnapshot && (
                <Section title="Đơn vị vận chuyển">
                  <Stack spacing={1}>
                    <InfoRow label="Người giao" value={selectedOrder.shipperSnapshot.name ?? "-"} />
                    <InfoRow label="Điện thoại" value={selectedOrder.shipperSnapshot.phone ?? "-"} />
                    <InfoRow label="Phương tiện" value={selectedOrder.shipperSnapshot.vehicleType ?? "-"} />
                    <InfoRow label="Biển số" value={selectedOrder.shipperSnapshot.licensePlate ?? "-"} />
                  </Stack>
                </Section>
              )}

              <Section title={`Sản phẩm (${selectedOrder.products?.length ?? 0})`}>
                <Stack spacing={2}>
                  {selectedOrder.products?.map((p, idx) => {
                    const productRef = p.productId;
                    const title = p.title ?? (typeof productRef === "object" ? productRef?.title : undefined) ?? `Sản phẩm ${idx + 1}`;
                    const unitPrice = p.price ?? (typeof productRef === "object" ? productRef?.price : undefined) ?? 0;
                    const image = typeof productRef === "object" ? productRef?.images?.[0] : undefined;
                    return (
                      <Box key={idx} sx={{ display: "flex", gap: 2, border: "1px solid rgba(37,99,235,0.2)", borderRadius: 2, p: 1.5, background: "rgba(219,234,254,0.4)" }}>
                        {image && (
                          <Box component="img" src={image} alt={title} sx={{ width: 72, height: 72, borderRadius: 1.5, objectFit: "cover" }} />
                        )}
                        <Box flex={1}>
                          <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
                          <Typography variant="body2" color="#1d4ed8">
                            Số lượng: {p.quantity}
                          </Typography>
                          <Typography sx={{ fontWeight: 600, color: "#2563eb" }}>
                            {currencyFormatter.format(unitPrice * p.quantity)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Section>

              <Section title="Tổng kết">
                <Stack spacing={1.5}>
                  <InfoRow label="Tiền hàng" value={currencyFormatter.format(selectedOrder.products?.reduce((s, x) => {
                    const price = x.price ?? (typeof x.productId === "object" ? x.productId?.price : undefined) ?? 0;
                    return s + price * x.quantity;
                  }, 0) ?? 0)} />
                  <Divider sx={{ borderColor: "rgba(37,99,235,0.2)" }} />
                  <InfoRow label="Tổng thanh toán" value={currencyFormatter.format(selectedOrder.totalAmount ?? 0)} highlight />
                  <InfoRow label="Trạng thái" value={getStatusLabel(selectedOrder.status ?? "pending")} />
                </Stack>
              </Section>
            </Box>

            <Box sx={{ p: 3, borderTop: "1px solid rgba(37,99,235,0.2)", display: "flex", gap: 1, flexWrap: "wrap" }}>
              {isAwaitingPayment(selectedOrder.status) && (
                <Button
                  onClick={async () => {
                    try {
                      await api.post(`/api/orders/${selectedOrder._id}/confirm-payment`);
                      setSelectedOrder({ ...selectedOrder, status: "processing" });
                      fetchOrders({ page, limit: rowsPerPage, q, status: statusFilter });
                    } catch (err) {
                      console.error("Failed to confirm payment", err);
                    }
                  }}
                  variant="contained"
                  color="success"
                >
                  Xác nhận thanh toán
                </Button>
              )}
              {getAllowedNextStatuses(selectedOrder.status).map((nextStatus) => {
                const buttonConfig: Record<string, { label: string; color: ButtonProps["color"] }> = {
                  awaiting_shipment: { label: "Đã chuẩn bị hàng", color: "info" },
                  processing: { label: "Đang xử lý", color: "info" },
                  shipping: { label: "Đang giao", color: "warning" },
                  completed: { label: "Hoàn thành", color: "success" },
                  cancelled: { label: "Hủy đơn", color: "error" },
                };
                const config = buttonConfig[nextStatus] ?? { label: getStatusLabel(nextStatus), color: getStatusMuiColor(nextStatus) as ButtonProps["color"] };
                return (
                  <Button key={nextStatus} variant="contained" color={config.color} onClick={() => handleUpdateOrderStatus(nextStatus)}>
                    {config.label}
                  </Button>
                );
              })}
              <Button variant="outlined" onClick={closeDrawer} sx={{ ml: "auto", borderColor: "rgba(37,99,235,0.4)", color: "#2563eb" }}>
                Đóng
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}

type GridStatsProps = {
  stats: SellerStats;
  formatter: Intl.NumberFormat;
};

function GridStats({ stats, formatter }: GridStatsProps) {
  const items = [
    {
      title: "Tổng sản phẩm",
      value: stats.totalProducts.toLocaleString("vi-VN"),
      icon: <PendingActionsOutlinedIcon sx={{ color: "#38bdf8" }} />,
      color: "#0ea5e9",
    },
    {
      title: "Số đơn hàng",
      value: stats.totalSales.toLocaleString("vi-VN"),
      icon: <LocalShippingOutlinedIcon sx={{ color: "#34d399" }} />,
      color: "#34d399",
    },
    {
      title: "Doanh thu 30 ngày",
      value: formatter.format(stats.revenueLastMonth),
      icon: <MonetizationOnOutlinedIcon sx={{ color: "#fbbf24" }} />,
      color: "#fbbf24",
    },
    {
      title: "Doanh thu tích luỹ",
      value: formatter.format(stats.totalRevenue),
      icon: <TrendingUpRoundedIcon sx={{ color: "#a855f7" }} />,
      color: "#a855f7",
    },
    {
      title: "Hoàn thành",
      value: stats.completedCount,
      icon: <CheckCircleOutlineRoundedIcon sx={{ color: "#22c55e" }} />,
      color: "#22c55e",
    },
    {
      title: "Đang chờ",
      value: stats.pendingCount,
      icon: <PendingActionsOutlinedIcon sx={{ color: "#f97316" }} />,
      color: "#f97316",
    },
    {
      title: "Bị hủy",
      value: stats.cancelledCount,
      icon: <CancelOutlinedIcon sx={{ color: "#f87171" }} />,
      color: "#f87171",
    },
  ];

  return (
    <Stack direction={{ xs: "column", md: "row" }} flexWrap="wrap" gap={2} mt={3}>
      {items.map((item) => (
        <Card
          key={item.title}
          sx={{
            flex: "1 1 240px",
            background: "#ffffff",
            border: "1px solid rgba(37,99,235,0.18)",
            boxShadow: "0 15px 30px -12px rgba(37,99,235,0.2)",
          }}
        >
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ p: 1.5, borderRadius: 2, background: `${item.color}22` }}>{item.icon}</Box>
              <Box>
                <Typography variant="body2" sx={{ color: "#2563eb" }}>
                  {item.title}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {item.value}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

type InfoRowProps = { label: string; value: string; highlight?: boolean };

function InfoRow({ label, value, highlight }: InfoRowProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" sx={{ color: "#2563eb" }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: highlight ? 700 : 500, color: highlight ? "#2563eb" : "#0f172a", textAlign: "right" }}>
        {value}
      </Typography>
    </Box>
  );
}

type SectionProps = { title: string; children: ReactNode };

function Section({ title, children }: SectionProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#2563eb" }}>
        {title}
      </Typography>
      <Box sx={{ background: "rgba(219,234,254,0.55)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 2, p: 2 }}>
        {children}
      </Box>
    </Box>
  );
}
