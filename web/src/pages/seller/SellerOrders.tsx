import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import api from "../../api/axios";
import { orderService, type OrderDetailResponse } from "../../api/orderService";
import { sellerService, type SellerStats } from "../../api/sellerService";
import { useAuth } from "../../context/AuthContext";

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
  const [stats, setStats] = useState<SellerStats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    completedCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
    revenueLastMonth: 0,
  });

  // Helper functions
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Chờ thanh toán",
      payment_pending: "Chờ xác nhận thanh toán",
      processing: "Đang xử lý",
      shipping: "Đang giao",
      completed: "Hoàn thành",
      cancelled: "Hủy",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, "warning" | "success" | "error" | "info" | "default"> = {
      pending: "warning",
      payment_pending: "info",
      processing: "info",
      shipping: "warning",
      completed: "success",
      cancelled: "error",
    };
    return colors[status] || "default";
  };

  // Get allowed next statuses based on current status (forward-only transitions)
  const getAllowedNextStatuses = (currentStatus?: string): string[] => {
    const transitions: Record<string, string[]> = {
      pending: ["payment_pending", "cancelled"],
      payment_pending: ["processing", "cancelled"],
      processing: ["shipping", "completed", "cancelled"],
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

  const openOrderDetail = async (orderId: string) => {
    try {
      const data = await orderService.getOrderDetail(orderId);
      setSelectedOrder(data as OrderDetailResponse);
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

  return (
    <Box>
      <Typography variant="h5" mb={3}>
        Đơn hàng của shop
      </Typography>

      {/* Stats Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2, mb: 3 }}>
        <Card sx={{ backgroundColor: "#f5f5f5" }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Tổng sản phẩm
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {stats.totalProducts}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ backgroundColor: "#f5f5f5" }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Số đơn hàng
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {stats.totalSales}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hoàn thành: {stats.completedCount} | Chờ: {stats.pendingCount}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ backgroundColor: "#fff3e0" }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Doanh thu (30 ngày)
            </Typography>
            <Typography variant="h5" sx={{ color: "#d32f2f", fontWeight: 700 }}>
              {stats.revenueLastMonth.toLocaleString()} ₫
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ backgroundColor: "#e8f5e9" }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Doanh thu (tất cả)
            </Typography>
            <Typography variant="h5" sx={{ color: "#2e7d32", fontWeight: 700 }}>
              {stats.totalRevenue.toLocaleString()} ₫
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ backgroundColor: "#fff8e1" }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Đơn hoàn thành
            </Typography>
            <Typography variant="h5" sx={{ color: "#f57f17", fontWeight: 700 }}>
              {stats.completedCount}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ backgroundColor: "#ffebee" }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Đơn chờ xử lý
            </Typography>
            <Typography variant="h5" sx={{ color: "#c62828", fontWeight: 700 }}>
              {stats.pendingCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <TextField size="small" placeholder="Tìm kiếm mã đơn hoặc khách hàng" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchOrders({ page: 0, limit: rowsPerPage, q, status: statusFilter }); }} />
          <Stack direction="row" spacing={1}>
            <Chip label="Tất cả" color={!statusFilter ? "primary" : "default"} onClick={() => { setStatusFilter(null); fetchOrders({ page: 0, limit: rowsPerPage, q, status: null }); }} />
            <Chip label="Chờ xử lý" color={statusFilter === "pending" ? "primary" : "default"} onClick={() => { setStatusFilter("pending"); fetchOrders({ page: 0, limit: rowsPerPage, q, status: "pending" }); }} />
            <Chip label="Hoàn thành" color={statusFilter === "completed" ? "primary" : "default"} onClick={() => { setStatusFilter("completed"); fetchOrders({ page: 0, limit: rowsPerPage, q, status: "completed" }); }} />
            <Chip label="Hủy" color={statusFilter === "cancelled" ? "primary" : "default"} onClick={() => { setStatusFilter("cancelled"); fetchOrders({ page: 0, limit: rowsPerPage, q, status: "cancelled" }); }} />
          </Stack>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 600 }}>Mã đơn</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Khách hàng</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Sản phẩm</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Thành tiền</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ngày tạo</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography color="text.secondary">Không có đơn hàng</Typography>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o._id} hover sx={{ "&:hover": { backgroundColor: "#fafafa" } }}>
                  <TableCell sx={{ fontWeight: 500, fontSize: "0.95rem" }}>{o._id?.slice(0, 8)}...</TableCell>
                  <TableCell>{o.customerName ?? "-"}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="primary">
                      {o.products?.length ?? 0} sản phẩm
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#d32f2f" }}>
                    {(o.totalAmount ?? 0).toLocaleString()} ₫
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(o.status ?? "pending")}
                      size="small"
                      color={getStatusColor(o.status ?? "pending")}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString("vi-VN") : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" variant="contained" onClick={() => openOrderDetail(o._id)}>
                      Xem
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>

      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, fontSize: "1.3rem" }}>Chi tiết đơn hàng #{selectedOrder?._id?.slice(0, 8)}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedOrder ? (
            <Box>
              {/* Customer & Shipping Info Section */}
              <Paper sx={{ p: 2, mb: 2, backgroundColor: "#f9f9f9" }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Thông tin khách hàng
                </Typography>
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Tên:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {typeof selectedOrder.userId === "object" && selectedOrder.userId?.name
                        ? selectedOrder.userId.name
                        : selectedOrder.customerName ?? "-"}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Điện thoại:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedOrder.shippingAddress?.phone ?? "-"}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Địa chỉ:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
                      {selectedOrder.shippingAddress
                        ? `${selectedOrder.shippingAddress.detail ?? selectedOrder.shippingAddress.address ?? ""}, ${selectedOrder.shippingAddress.ward ?? ""}, ${selectedOrder.shippingAddress.district ?? ""}, ${selectedOrder.shippingAddress.province ?? selectedOrder.shippingAddress.city ?? ""}`
                        : "-"}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Products Section */}
              <Paper sx={{ p: 2, mb: 2, backgroundColor: "#f9f9f9" }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Sản phẩm ({selectedOrder.products?.length ?? 0})
                </Typography>
                <Stack spacing={2}>
                  {selectedOrder.products?.map((p, idx) => {
                    const productRef = p.productId;
                    const title = p.title ?? (typeof productRef === "object" ? productRef?.title : undefined) ?? `Sản phẩm ${idx + 1}`;
                    const unitPrice = p.price ?? (typeof productRef === "object" ? productRef?.price : undefined) ?? 0;
                    const image = typeof productRef === "object" ? productRef?.images?.[0] : undefined;
                    return (
                      <Box
                        key={String((typeof productRef === "object" ? productRef?._id : productRef) ?? idx)}
                        display="flex"
                        gap={2}
                        pb={1.5}
                        borderBottom="1px solid #e0e0e0"
                      >
                        {image && (
                          <Box
                            component="img"
                            src={image}
                            alt={title}
                            sx={{ width: 80, height: 80, objectFit: "cover", borderRadius: 1 }}
                          />
                        )}
                        <Box flex={1}>
                          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                            {title}
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Số lượng: <strong>{p.quantity}</strong>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Giá: <strong>{unitPrice.toLocaleString()} ₫</strong>
                            </Typography>
                          </Stack>
                          <Typography sx={{ fontWeight: 600, color: "#d32f2f" }}>
                            {(unitPrice * p.quantity).toLocaleString()} ₫
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>

              {/* Summary Section */}
              <Paper sx={{ p: 2, backgroundColor: "#f9f9f9" }}>
                <Stack spacing={1.5}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Tiền hàng:</Typography>
                    <Typography sx={{ fontWeight: 500 }}>
                      {selectedOrder.products
                        ?.reduce((s, x) => {
                          const xPrice = x.price ?? (typeof x.productId === "object" ? x.productId?.price : undefined) ?? 0;
                          return s + xPrice * x.quantity;
                        }, 0)
                        .toLocaleString()}{" "}
                      ₫
                    </Typography>
                  </Box>
                  <Divider />
                  <Box display="flex" justifyContent="space-between" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
                    <Typography>Tổng thanh toán:</Typography>
                    <Typography sx={{ color: "#d32f2f" }}>
                      {(selectedOrder.totalAmount ??
                        selectedOrder.products?.reduce((s, x) => {
                          const xPrice = x.price ?? (typeof x.productId === "object" ? x.productId?.price : undefined) ?? 0;
                          return s + xPrice * x.quantity;
                        }, 0) ??
                        0).toLocaleString()}{" "}
                      ₫
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" sx={{ pt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Trạng thái:
                    </Typography>
                    <Chip
                      label={getStatusLabel(selectedOrder.status ?? "pending")}
                      color={getStatusColor(selectedOrder.status ?? "pending")}
                      size="small"
                    />
                  </Box>
                </Stack>
              </Paper>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          {selectedOrder && (
            <>
              <Box sx={{ flex: 1 }} />
              {/* Special case: confirm payment for payment_pending orders */}
              {selectedOrder.status === "payment_pending" && (
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
                  size="small"
                >
                  ✓ Xác nhận thanh toán
                </Button>
              )}
              {/* Show valid next status buttons */}
              {getAllowedNextStatuses(selectedOrder.status).map((nextStatus) => {
                const buttonConfig: Record<string, { label: string; color: "warning" | "info" | "error" | "success" }> = {
                  payment_pending: { label: "Chờ xác nhận thanh toán", color: "info" },
                  processing: { label: "Đang xử lý", color: "info" },
                  shipping: { label: "Đang giao", color: "warning" },
                  completed: { label: "Hoàn thành", color: "success" },
                  cancelled: { label: "Hủy đơn", color: "error" },
                };
                const config = buttonConfig[nextStatus];
                return (
                  <Button
                    key={nextStatus}
                    onClick={() => handleUpdateOrderStatus(nextStatus)}
                    variant="contained"
                    color={config.color}
                    size="small"
                  >
                    {config.label}
                  </Button>
                );
              })}
            </>
          )}
          <Button onClick={() => setSelectedOrder(null)} variant="outlined">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
