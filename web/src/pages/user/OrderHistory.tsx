import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { orderService, type OrderDetailResponse, type OrderProduct } from "../../api/orderService";
import { paymentService } from "../../api/paymentService";

// Countdown Timer Component
function CountdownTimer({ remainingMs, isExpired }: { remainingMs: number | null; isExpired: boolean }) {
  const [displayTime, setDisplayTime] = useState<string>("");
  // Use a ref to store the absolute end timestamp so we can compute a live remaining value
  const endTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (remainingMs === null || remainingMs === undefined) {
      setDisplayTime("");
      endTsRef.current = null;
      return;
    }

    // compute the absolute end timestamp from current time + remainingMs
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
    <Typography
      sx={{
        fontSize: "0.85rem",
        fontWeight: 600,
        color: isExpired ? "#ef4444" : "#f59e0b",
        display: "inline-block",
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: isExpired ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)",
      }}
    >
      ⏱️ {displayTime}
    </Typography>
  );
}

// Status badge component
function StatusBadge({ status }: { status?: string }) {
  const statusConfig: Record<string, { color: string; bgcolor: string; label: string }> = {
    pending: { color: "#f59e0b", bgcolor: "rgba(245, 158, 11, 0.1)", label: "⏳ Chờ thanh toán" },
    payment_pending: { color: "#ff9800", bgcolor: "rgba(255, 152, 0, 0.1)", label: "📦 Chờ xử lý" },
    processing: { color: "#3b82f6", bgcolor: "rgba(59, 130, 246, 0.1)", label: "📦 Đang xử lý" },
    completed: { color: "#22c55e", bgcolor: "rgba(34, 197, 94, 0.1)", label: "✓ Hoàn thành" },
    cancelled: { color: "#ef4444", bgcolor: "rgba(239, 68, 68, 0.1)", label: "✗ Đã hủy" },
  };

  const config = statusConfig[status || ""] || statusConfig.pending;

  return (
    <Chip
      label={config.label}
      sx={{
        fontWeight: 600,
        fontSize: "0.85rem",
        color: config.color,
        bgcolor: config.bgcolor,
        border: `1px solid ${config.color}`,
      }}
    />
  );
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [orders, setOrders] = useState<OrderDetailResponse[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const handlePayosCheckout = async (orderId: string) => {
    setPayingOrderId(orderId);
    try {
      toast.info("🔁 Đang tạo liên kết PayOS...", { autoClose: 1500 });
      const link = await paymentService.createPayosLink(orderId);
      if (!link.checkoutUrl) throw new Error("Không lấy được liên kết PayOS");
      window.open(link.checkoutUrl, "_blank", "noopener");
    } catch (err) {
      console.error("OrderHistory PayOS error:", err);
      const message =
        err instanceof Error ? err.message : "Không mở được PayOS. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setPayingOrderId(null);
    }
  };

  // Fetch orders on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await orderService.getUserOrders();
        setOrders(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Apply filters whenever orders, searchId, or filterStatus changes
  useEffect(() => {
    let result = orders;

    // Filter by status
    if (filterStatus) {
      result = result.filter((o) => o.status === filterStatus);
    }

    // Filter by order ID (substring search)
    if (searchId.trim()) {
      result = result.filter((o) => o._id.toLowerCase().includes(searchId.toLowerCase()));
    }

    setFilteredOrders(result);
  }, [orders, searchId, filterStatus]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "80vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

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
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
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
            📜 Lịch sử mua hàng
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quản lý và theo dõi các đơn hàng của bạn
          </Typography>
        </Box>

        {/* Filters Section */}
        <Paper
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            backdropFilter: "blur(20px)",
            background:
              theme.palette.mode === "dark" ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.9)",
            border: "1px solid",
            borderColor: theme.palette.mode === "dark" ? "rgba(66,165,245,0.2)" : "rgba(25,118,210,0.2)",
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Tìm kiếm mã đơn hàng..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                size="small"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  size="small"
                  variant={filterStatus === null ? "contained" : "outlined"}
                  onClick={() => setFilterStatus(null)}
                >
                  Tất cả
                </Button>
                {["pending", "payment_pending", "processing", "completed", "cancelled"].map((status) => (
                  <Button
                    key={status}
                    size="small"
                    variant={filterStatus === status ? "contained" : "outlined"}
                    onClick={() => setFilterStatus(status)}
                  >
                    {status === "pending"
                      ? "Chờ TT"
                      : status === "payment_pending"
                        ? "Chờ xử lý"
                        : status === "processing"
                          ? "Xử lý"
                          : status === "completed"
                            ? "Hoàn thành"
                            : "Hủy"}
                  </Button>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Statistics */}
        {orders.length > 0 && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700}>
                  {orders.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tổng đơn hàng
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: "#f59e0b" }}>
                  {orders.filter((o) => o.status === "pending" || o.status === "payment_pending").length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Chờ xử lý / thanh toán
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: "#3b82f6" }}>
                  {orders.filter((o) => o.status === "processing").length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Đang xử lý
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: "#22c55e" }}>
                  {orders.filter((o) => o.status === "completed").length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Hoàn thành
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 3,
              backdropFilter: "blur(20px)",
              background:
                theme.palette.mode === "dark" ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.9)",
            }}
          >
            <Typography color="text.secondary" mb={3}>
              {orders.length === 0 ? "Bạn chưa có đơn hàng nào." : "Không tìm thấy đơn hàng phù hợp."}
            </Typography>
            <Button variant="contained" onClick={() => navigate("/products")}>
              Tiếp tục mua sắm
            </Button>
          </Paper>
        ) : (
          <Paper
            sx={{
              p: 2,
              borderRadius: 3,
              backdropFilter: "blur(20px)",
              background:
                theme.palette.mode === "dark" ? "rgba(30,41,59,0.8)" : "rgba(255,255,255,0.9)",
              border: "1px solid",
              borderColor: theme.palette.mode === "dark" ? "rgba(66,165,245,0.1)" : "rgba(25,118,210,0.1)",
              overflowX: "auto",
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.mode === "dark" ? "rgba(66,165,245,0.1)" : "#f5f5f5" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Mã đơn</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Tổng cộng
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Hạn thanh toán</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày đặt</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Hành động
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map((order) => {
                  const total = (order.products || order.items)?.reduce(
                    (acc: number, item: OrderProduct) => acc + (item.price || item.productId?.price || 0) * item.quantity,
                    0
                  ) || order.totalAmount || 0;


                  // Đơn đã thanh toán thành công hoặc COD thì không hiện nút thanh toán lại/đổi phương thức
                  const isPaid = order.status === "processing" || order.status === "completed";
                  const isCOD = order.paymentMethod === "cod";
                  // Chỉ hiện nút khi đơn chưa thanh toán thành công, không phải COD, còn hạn thanh toán
                  const canPay =
                    !isPaid && !isCOD &&
                    (order.status === "pending" || order.status === "payment_pending") &&
                    !!order.remainingTime && order.remainingTime > 0 && !order.isExpired;

                  return (
                    <TableRow
                      key={order._id}
                      hover
                      sx={{
                        "&:hover": {
                          bgcolor: theme.palette.mode === "dark" ? "rgba(66,165,245,0.1)" : "rgba(25,118,210,0.05)",
                        },
                      }}
                    >
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 600 }}>
                        {order._id.substring(0, 12)}...
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        <Typography sx={{ background: "linear-gradient(90deg, #1976d2, #42a5f5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          {total.toLocaleString("vi-VN")}₫
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        {order.status === "cancelled" && order.paymentExpired ? (
                          <Typography sx={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: 600 }}>
                            ❌ Hết hạn thanh toán
                          </Typography>
                        ) : (order.status === "pending" || order.status === "payment_pending") && order.remainingTime && order.paymentMethod !== "cod" ? (
                          <CountdownTimer remainingMs={order.remainingTime} isExpired={order.isExpired || false} />
                        ) : (
                          <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>--</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.9rem", color: "text.secondary" }}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "N/A"}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
                          {canPay && order.paymentMethod === "payos" && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={payingOrderId === order._id}
                              onClick={() => handlePayosCheckout(order._id)}
                              sx={{ borderRadius: 1, textTransform: "none" }}
                            >
                              {payingOrderId === order._id ? "Đang mở..." : "💳 Thanh toán lại"}
                            </Button>
                          )}
                          {canPay && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => navigate(`/Order/${order._id}?changeMethod=true`)}
                              sx={{ borderRadius: 1, textTransform: "none" }}
                            >
                              🔄 Đổi phương thức thanh toán
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => navigate(`/Order/${order._id}`)}
                            sx={{ borderRadius: 1, textTransform: "none" }}
                          >
                            Chi tiết
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Container>
    </Box>
  );
}
