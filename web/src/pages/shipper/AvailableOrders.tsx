import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Button, CircularProgress, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import { AxiosError, isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/useSocket";
import type { Order } from "../../types/Order";
import { getStatusLabel, getStatusMuiColor } from "../../utils/orderStatus";
import { triggerReportModal } from "../../utils/reportModal";

export default function AvailableOrders() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const { socket } = useSocket();
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/shipper/orders/available");
      // assume API returns { data: Order[] } or plain array
      const data = res.data?.data ?? res.data ?? [];
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load available orders", err);
      toast.error("Không thể tải danh sách đơn hàng có sẵn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // refresh when socket announces new awaiting_shipment order
    if (!socket) return;
    const handler = () => {
      // payload may include orderId — just refetch list
      fetchOrders();
      toast.info("Có đơn hàng mới chờ giao");
    };
    socket.on("order:awaiting_shipment", handler);
    return () => {
      socket.off("order:awaiting_shipment", handler);
    };
  }, [socket]);
  const handleClaim = async (orderId: string) => {
    try {
      await api.post(`/shipper/orders/${orderId}/claim`);
      toast.success("Yêu cầu nhận đơn thành công");
      fetchOrders();
    } catch (err: unknown) {
      console.error("claim failed", err);
      let msg = "Không thể nhận đơn";
      if (isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        msg = axiosErr.response?.data?.message ?? axiosErr.message ?? msg;
      } else if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
        msg = (err as { message: string }).message;
      }
      toast.error(msg);
    }
  };

  const handleReportIssue = (order: Order) => {
    const orderId = order._id;
    const buyerIdValue = typeof order.userId === "string" ? order.userId : null;
    const shipperIdRaw = (user as unknown as { _id?: unknown; id?: unknown })?._id ?? (user as unknown as { id?: unknown })?.id ?? null;
    const shipperIdValue = typeof shipperIdRaw === "string" ? shipperIdRaw : typeof shipperIdRaw === "number" ? String(shipperIdRaw) : null;
    triggerReportModal({
      role: "seller",
      title: `Shipper báo cáo đơn #${orderId.slice(0, 8)}`,
      category: "shipping_issue",
      relatedType: "order",
      relatedId: orderId,
      metadata: {
        orderId,
        buyerId: buyerIdValue,
        shipperId: shipperIdValue,
      },
    });
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>Đơn hàng đang chờ giao</Typography>
      {orders.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography>Không có đơn hàng nào sẵn sàng để nhận.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã đơn</TableCell>
                <TableCell>Người mua</TableCell>
                <TableCell>Địa chỉ</TableCell>
                <TableCell>Tổng</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o._id}>
                  <TableCell>{o._id}</TableCell>
                  <TableCell>{o.fullName ?? o.userId ?? "-"}</TableCell>
                  <TableCell style={{ maxWidth: 300 }}>{o.address}</TableCell>
                  <TableCell>{o.total?.toLocaleString?.() ?? o.total}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color={getStatusMuiColor(o.status) as "inherit" | "primary" | "secondary" | "error" | "info" | "success" | "warning"}
                    >
                      {getStatusLabel(o.status)}
                    </Button>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Báo cáo sự cố">
                      <IconButton size="small" color="warning" onClick={() => handleReportIssue(o)}>
                        <ReportProblemIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => navigate(`/Order/${o._id}`)}>
                      <VisibilityIcon />
                    </IconButton>
                    <Button size="small" variant="contained" sx={{ ml: 1 }} onClick={() => handleClaim(o._id)}>
                      Nhận
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
