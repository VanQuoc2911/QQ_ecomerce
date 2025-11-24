import { Box, Button, CircularProgress, Container, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { orderService, type OrderDetailResponse } from "../../api/orderService";

// Helper component to display countdown timer
function CountdownTimer({ remainingMs, isExpired }: { remainingMs: number | null; isExpired: boolean }) {
  const [displayTime, setDisplayTime] = useState<string>("");

  useEffect(() => {
    if (remainingMs === null || remainingMs === undefined) {
      setDisplayTime("");
      return;
    }

    const updateDisplay = () => {
      if (remainingMs <= 0) {
        setDisplayTime("Hết hạn");
        return;
      }
      const totalSecs = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setDisplayTime(`${days}d ${hours}h ${mins}m ${secs}s`);
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

// Helper to get status label and color
function getStatusInfo(status?: string) {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: "⏳ Chờ thanh toán", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)" },
    payment_pending: { label: "⏳ Chờ xác nhận thanh toán", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.1)" },
    processing: { label: "📦 Đang xử lý", color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.1)" },
    shipping: { label: "🚚 Đang giao", color: "#8b5cf6", bgColor: "rgba(139, 92, 246, 0.1)" },
    completed: { label: "✅ Hoàn thành", color: "#22c55e", bgColor: "rgba(34, 197, 94, 0.1)" },
    cancelled: { label: "❌ Hủy", color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.1)" },
  };
  return statusMap[status || "pending"] || statusMap.pending;
}

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Socket connection for real-time updates
  useEffect(() => {
    const socket = io();
    
    socket.on("order:statusUpdated", (payload: { orderId: string; status: string }) => {
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === payload.orderId ? { ...order, status: payload.status } : order
        )
      );
    });

    socket.on("order:paymentConfirmed", (payload: { orderId: string; status: string }) => {
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === payload.orderId ? { ...order, status: "processing" } : order
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ minHeight: "80vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={800} mb={4}>
        📋 Đơn hàng của tôi
      </Typography>

      {orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary" mb={3}>
            Bạn chưa có đơn hàng nào.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/products")}>
            Tiếp tục mua sắm
          </Button>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, overflowX: "auto" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                <TableCell sx={{ fontWeight: 700 }}>Mã đơn</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Khách hàng</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Tổng cộng
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Thời gạn</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Hành động
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => {
                // Helper type for flexible order item shape
                type MaybeOrderItem = { price?: number; quantity: number; productId?: { price?: number } };
                const total = order.items?.reduce((acc: number, it: MaybeOrderItem) => {
                  const itemPrice = it.price ?? (it.productId && (it.productId as unknown as { price?: number }).price) ?? 0;
                  return acc + itemPrice * it.quantity;
                }, 0);

                // Use remainingTime from backend if available
                const remainingTime = (order as unknown as { remainingTime?: number }).remainingTime || null;
                const isExpired = (order as unknown as { isExpired?: boolean }).isExpired || false;
                const statusInfo = getStatusInfo(order.status);

                return (
                  <TableRow key={order._id}>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {order._id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {total ? `${total.toLocaleString("vi-VN")}₫` : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          bgcolor: statusInfo.bgColor,
                          color: statusInfo.color,
                          display: "inline-block",
                        }}
                      >
                        {statusInfo.label}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <Typography sx={{ fontSize: "0.85rem" }}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "N/A"}
                        </Typography>
                        {(order.status === "pending" || order.status === "payment_pending") && (
                          <CountdownTimer remainingMs={remainingTime} isExpired={isExpired} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/Order/${order._id}`)}
                      >
                        Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Container>
  );
}
