import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { orderService, type SellerOrder } from "../../api/orderService";
import { productService } from "../../api/productService";
import { sellerService, type SellerStats } from "../../api/sellerService";

// ✅ Định nghĩa kiểu dữ liệu sản phẩm (summary dùng trong top list)
export interface ProductSummary {
  _id: string;
  title: string;
  price: number;
  images: string[];
  soldCount?: number;
  createdAt?: string;
}

// Custom Stat Card Component with blue theme
const StatCard = ({ title, value, icon, trend }: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  trend?: string;
}) => (
  <Card 
    elevation={0}
    sx={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderRadius: 3,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
      }
    }}
  >
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box 
          sx={{ 
            backgroundColor: 'rgba(255,255,255,0.2)', 
            borderRadius: 2, 
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </Box>
        {trend && (
          <Chip 
            label={trend} 
            size="small" 
            icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 600,
              fontSize: 11
            }}
          />
        )}
      </Box>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {title}
      </Typography>
    </CardContent>
  </Card>
);

export default function SellerDashboard() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [topProducts, setTopProducts] = useState<ProductSummary[]>([]);
  const [pendingOrders, setPendingOrders] = useState<SellerOrder[]>([]);
  const navigate = useNavigate();

  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingQ, setPendingQ] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      // server 'pending' indicates awaiting customer payment
      pending: "Chờ thanh toán",
      payment_pending: "Chờ thanh toán",
      awaiting_shipment: "Chờ giao",
      shipping: "Đang giao",
      completed: "Hoàn thành",
      cancelled: "Hủy",
    };
    return status ? labels[status] || status : "—";
  };

  const isAwaitingPayment = (status?: string) => status === "pending" || status === "payment_pending";

  const fetchPendingOrders = async (opts?: { q?: string; stock?: string }) => {
    setPendingLoading(true);
    try {
      const params: Record<string, string | number> = { status: "pending", page: 1, limit: 5 };
      const searchQuery = opts?.q ?? pendingQ;
      if (searchQuery && String(searchQuery).trim().length > 0) {
        params.q = searchQuery;
      }

      const { data } = await api.get("/api/seller/orders", { params });
      const items = Array.isArray(data) ? data : data.items ?? [];
      setPendingOrders(items);
    } catch (err) {
      console.error("❌ fetchPendingOrders error:", err);
    } finally {
      setPendingLoading(false);
    }
  };

  const openDetail = async (orderId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await orderService.getOrderDetail(orderId);
      setSelectedDetail(detail);
    } catch (err) {
      console.error("Failed to load order detail", err);
      setSelectedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedDetail(null);
  };

  const handleQuickStatus = async (newStatus: string) => {
    if (!selectedDetail) return;
    try {
      await orderService.updateOrderStatus(selectedDetail._id, newStatus);
      setSelectedDetail({ ...selectedDetail, status: newStatus });
      await fetchPendingOrders();
      sellerService.getStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedDetail) return;
    try {
      await api.post(`/api/orders/${selectedDetail._id}/confirm-payment`);
      setSelectedDetail({ ...selectedDetail, status: "processing" });
      await fetchPendingOrders();
      sellerService.getStats().then(setStats).catch(() => {});
    } catch (err) {
      console.error("Failed to confirm payment", err);
    }
  };

  // Get allowed next statuses based on current status
  const getAllowedNextStatuses = (currentStatus?: string): string[] => {
    const transitions: Record<string, string[]> = {
      // Sellers may confirm payment when order is in payment_pending
      pending: ["cancelled"],
      // Sellers should only mark an order as prepared (awaiting_shipment) or cancel it.
      processing: ["awaiting_shipment", "cancelled"],
      // Sellers should not advance into shipping; only allow cancellation from awaiting_shipment
      awaiting_shipment: ["cancelled"],
      shipping: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };
    return transitions[currentStatus || ""] || [];
  };

  useEffect(() => {
    sellerService
      .getStats()
      .then(setStats)
      .catch((err) => console.error("❌ getStats error:", err));

    // Use seller's own products for top products (don't show other sellers')
    productService
      .getMyProducts()
      .then((items) => {
        const summaries: ProductSummary[] = items.map((item) => ({
          _id: item._id,
          title: item.title,
          price: item.price,
          images: item.images || [],
          soldCount: item.soldCount ?? 0,
          createdAt: item.createdAt,
        }));

        const sorted = [...summaries].sort(
          (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)
        );

        setTopProducts(sorted.slice(0, 5));
      })
      .catch((err) => console.error("❌ getMyProducts error:", err));

    fetchPendingOrders();

    const onOrderPlaced = () => {
      sellerService.getStats().then(setStats).catch(() => {});
      fetchPendingOrders();
    };

    window.addEventListener("orderPlaced", onOrderPlaced as EventListener);
    return () => window.removeEventListener("orderPlaced", onOrderPlaced as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography 
          variant="h4" 
          fontWeight={700} 
          sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}
        >
          Dashboard Quản Lý
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tổng quan hoạt động kinh doanh của bạn
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Tổng sản phẩm"
            value={stats?.totalProducts ?? 0}
            icon={<InventoryIcon sx={{ fontSize: 28, color: 'white' }} />}
            trend="+12%"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Tổng đơn hàng"
            value={stats?.totalSales ?? 0}
            icon={<ShoppingCartIcon sx={{ fontSize: 28, color: 'white' }} />}
            trend="+8%"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Tổng doanh thu"
            value={
              stats
                ? `${Number(stats.totalRevenue).toLocaleString()} ₫`
                : "0 ₫"
            }
            icon={<AttachMoneyIcon sx={{ fontSize: 28, color: 'white' }} />}
            trend="+23%"
          />
        </Grid>
      </Grid>

      {/* Top Products Section */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mb: 4, border: '1px solid #e0e0e0' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <TrendingUpIcon sx={{ color: '#667eea', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={700}>
              Sản phẩm bán chạy nhất
            </Typography>
          </Box>
          <Button 
            size="small" 
            sx={{ 
              color: '#667eea',
              '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.08)' }
            }}
            onClick={() => navigate('/seller/products')}
          >
            Xem tất cả →
          </Button>
        </Box>

        <Grid container spacing={2}>
          {topProducts.length === 0 ? (
            <Grid item xs={12}>
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                py={6}
                sx={{ opacity: 0.6 }}
              >
                <InventoryIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                <Typography color="text.secondary">
                  Chưa có sản phẩm nào
                </Typography>
              </Box>
            </Grid>
          ) : (
            topProducts.map((p, index) => (
              <Grid item xs={12} sm={6} md={4} key={p._id}>
                <Card 
                  elevation={0}
                  sx={{ 
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    transition: 'all 0.3s',
                    position: 'relative',
                    overflow: 'visible',
                    '&:hover': { 
                      boxShadow: '0 4px 20px rgba(102, 126, 234, 0.15)',
                      transform: 'translateY(-4px)',
                      borderColor: '#667eea'
                    }
                  }}
                >
                  {index < 3 && (
                    <Chip 
                      label={`#${index + 1}`}
                      size="small"
                      sx={{ 
                        position: 'absolute',
                        top: -8,
                        right: 8,
                        backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                        color: 'white',
                        fontWeight: 700,
                        zIndex: 1
                      }}
                    />
                  )}
                  <Box 
                    sx={{ 
                      height: 160,
                      overflow: 'hidden',
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img
                      src={p.images?.[0] ?? "https://via.placeholder.com/300"}
                      alt={p.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                  <CardContent>
                    <Typography 
                      fontWeight={700} 
                      sx={{ 
                        mb: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: 48
                      }}
                    >
                      {p.title}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography color="primary" fontWeight={700} fontSize={18}>
                        {Number(p.price).toLocaleString()}₫
                      </Typography>
                      <Chip 
                        label={`Đã bán: ${p.soldCount ?? 0}`}
                        size="small"
                        sx={{ 
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          color: '#667eea',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Paper>

      {/* Pending Orders Section */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e0e0e0' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={1}>
            <LocalShippingIcon sx={{ color: '#667eea', fontSize: 28 }} />
            <Typography variant="h6" fontWeight={700}>
              Đơn hàng chờ xử lý
              <Chip 
                label={stats?.pendingCount ?? pendingOrders.length}
                size="small"
                sx={{ 
                  ml: 1,
                  backgroundColor: '#ff6b6b',
                  color: 'white',
                  fontWeight: 700
                }}
              />
            </Typography>
          </Box>
          <Button 
            size="small"
            sx={{ 
              color: '#667eea',
              '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.08)' }
            }}
            onClick={() => navigate('/seller/orders')}
          >
            Xem tất cả →
          </Button>
        </Box>

        {/* Search Bar */}
        <Box mb={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Tìm kiếm theo tên khách hàng hoặc mã đơn hàng..."
            value={pendingQ}
            onChange={(e) => setPendingQ(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                fetchPendingOrders({ q: pendingQ });
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#667eea' }} />
                </InputAdornment>
              ),
              endAdornment: pendingQ && (
                <InputAdornment position="end">
                  <Button 
                    size="small" 
                    onClick={() => { setPendingQ(""); fetchPendingOrders({ q: "" }); }}
                    sx={{ minWidth: 'auto', color: '#999' }}
                  >
                    Xóa
                  </Button>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: '#667eea',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                }
              }
            }}
          />
        </Box>

        {/* Loading State */}
        {pendingLoading ? (
          <Box display="flex" alignItems="center" justifyContent="center" py={8}>
            <CircularProgress sx={{ color: '#667eea' }} />
          </Box>
        ) : pendingOrders.length === 0 ? (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            py={8}
            sx={{ opacity: 0.6 }}
          >
            <ShoppingCartIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
            <Typography color="text.secondary">
              Không có đơn hàng chờ xử lý
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {pendingOrders.map((o: SellerOrder) => (
              <ListItem
                key={o._id}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  mb: 1.5,
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.04)',
                    borderColor: '#667eea',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)'
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar 
                    sx={{ 
                      backgroundColor: '#667eea',
                      fontWeight: 700
                    }}
                  >
                    {(o.customerName ?? "K")[0].toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography fontWeight={700} sx={{ color: '#333' }}>
                      {o.customerName ?? "Khách hàng"}
                    </Typography>
                  }
                  secondary={
                    <Box mt={0.5}>
                      <Typography component="span" variant="caption" sx={{ color: '#999' }}>
                        Mã: #{o._id?.slice(0, 8)}
                      </Typography>
                      <Typography 
                        component="span" 
                        variant="caption" 
                        fontWeight={700}
                        sx={{ 
                          ml: 2,
                          color: '#667eea'
                        }}
                      >
                        {(o.total ?? 0).toLocaleString()} ₫
                      </Typography>
                    </Box>
                  }
                />
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => openDetail(o._id)}
                  sx={{
                    backgroundColor: '#667eea',
                    borderRadius: 2,
                    px: 3,
                    '&:hover': {
                      backgroundColor: '#5568d3'
                    }
                  }}
                >
                  Xem chi tiết
                </Button>
              </ListItem>
            ))}
          </List>
        )}

        {/* Detail Dialog */}
        <Dialog 
          open={detailOpen} 
          onClose={closeDetail} 
          fullWidth 
          maxWidth="sm"
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              py: 2.5
            }}
          >
            Chi tiết đơn hàng
          </DialogTitle>
          <DialogContent dividers sx={{ p: 3 }}>
            {detailLoading ? (
              <Box display="flex" alignItems="center" justifyContent="center" py={6}>
                <CircularProgress sx={{ color: '#667eea' }} />
              </Box>
            ) : selectedDetail ? (
              <Box>
                {/* Customer Info */}
                <Paper elevation={0} sx={{ p: 2, mb: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                  <Typography fontWeight={700} color="primary" fontSize={16} mb={1}>
                    👤 {selectedDetail.fullName || selectedDetail.customerName || "Khách hàng"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" display="block">
                    📧 {selectedDetail.email || (selectedDetail.userId?.email) || "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" display="block">
                    🔖 Mã đơn: {selectedDetail._id}
                  </Typography>
                </Paper>

                {/* Shipping Address */}
                <Typography fontWeight={700} mb={1} fontSize={15}>
                  📍 Địa chỉ giao hàng
                </Typography>
                <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                  {selectedDetail.shippingAddress ? (
                    <>
                      <Typography variant="body2" display="block" mb={0.5}>
                        <strong>Người nhận:</strong> {selectedDetail.shippingAddress.name || "—"}
                      </Typography>
                      <Typography variant="body2" display="block" mb={0.5}>
                        <strong>SĐT:</strong> {selectedDetail.shippingAddress.phone || "—"}
                      </Typography>
                      <Typography variant="body2" display="block" mb={0.5}>
                        <strong>Địa chỉ:</strong> {selectedDetail.shippingAddress.detail || selectedDetail.shippingAddress.address || "—"}
                      </Typography>
                      <Typography variant="body2" display="block">
                        {selectedDetail.shippingAddress.ward && selectedDetail.shippingAddress.district && selectedDetail.shippingAddress.province
                          ? `${selectedDetail.shippingAddress.ward}, ${selectedDetail.shippingAddress.district}, ${selectedDetail.shippingAddress.province}`
                          : ""}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Không có thông tin
                    </Typography>
                  )}
                </Paper>

                {/* Items List */}
                <Typography fontWeight={700} mb={2} fontSize={15}>
                  🛍️ Danh sách sản phẩm
                </Typography>
                <Box mb={3}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(selectedDetail.items || selectedDetail.products || []).map((it: any, idx: number) => (
                    <Paper 
                      key={it._id || idx}
                      elevation={0}
                      sx={{ 
                        p: 2, 
                        mb: 1.5, 
                        display: 'flex', 
                        gap: 2,
                        border: '1px solid #e0e0e0',
                        borderRadius: 2
                      }}
                    >
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: 2,
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: '#f5f5f5'
                        }}
                      >
                        <img
                          src={it.productId?.images?.[0] || it.product?.images?.[0] || "https://via.placeholder.com/80"}
                          alt={it.productId?.title || it.product?.title || it.title || ""}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                      <Box flex={1}>
                        <Typography fontWeight={600} fontSize={14} mb={0.5}>
                          {it.productId?.title || it.product?.title || it.title || "Sản phẩm"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Số lượng: <strong>x{it.quantity || 1}</strong>
                        </Typography>
                        <Typography variant="body2" color="primary" fontWeight={600}>
                          {Number(it.price || 0).toLocaleString()} ₫
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>

                {/* Total & Status */}
                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography fontWeight={600}>Tổng tiền:</Typography>
                    <Typography fontWeight={700} color="primary" fontSize={20}>
                      {(selectedDetail.totalAmount ?? selectedDetail.total ?? 0).toLocaleString()} ₫
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={600}>Trạng thái:</Typography>
                    <Chip
                      label={getStatusLabel(selectedDetail.status)}
                      size="medium"
                      icon={
                        selectedDetail.status === "completed" ? <CheckCircleIcon /> :
                        selectedDetail.status === "cancelled" ? <CancelIcon /> :
                        <LocalShippingIcon />
                      }
                      sx={{
                        fontWeight: 700,
                        backgroundColor: 
                          selectedDetail.status === "processing" ? '#ffeaa7' :
                          selectedDetail.status === "completed" ? '#55efc4' :
                          selectedDetail.status === "cancelled" ? '#ff7675' :
                          '#dfe6e9',
                        color: 
                          selectedDetail.status === "processing" ? '#d63031' :
                          selectedDetail.status === "completed" ? '#00b894' :
                          selectedDetail.status === "cancelled" ? '#d63031' :
                          '#636e72'
                      }}
                    />
                  </Box>
                </Paper>
              </Box>
            ) : (
              <Typography color="text.secondary">Không tải được dữ liệu.</Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button 
              onClick={closeDetail}
              sx={{ 
                borderRadius: 2,
                px: 3
              }}
            >
              Đóng
            </Button>
            
            {selectedDetail && (
              <>
                {/* Confirm payment button for orders that are awaiting payment */}
                {isAwaitingPayment(selectedDetail.status) && (
                  <Button 
                    variant="contained" 
                    onClick={handleConfirmPayment}
                    sx={{
                      backgroundColor: '#00b894',
                      borderRadius: 2,
                      px: 3,
                      '&:hover': { backgroundColor: '#009b7d' }
                    }}
                  >
                    ✓ Xác nhận thanh toán
                  </Button>
                )}

                {/* Quick prepare button: when order is in `processing` allow seller to mark it as prepared (awaiting_shipment) */}
                {selectedDetail.status === "processing" && (
                  <Button
                    variant="contained"
                    onClick={() => handleQuickStatus("awaiting_shipment")}
                    sx={{
                      backgroundColor: '#1e88e5',
                      borderRadius: 2,
                      px: 3,
                      '&:hover': { backgroundColor: '#1666c2' }
                    }}
                  >
                    ✓ Đã chuẩn bị đơn hàng
                  </Button>
                )}

                {/* Valid next status buttons (excluding awaiting_shipment to avoid duplicate button) */}
                {(() => {
                  const allowed = getAllowedNextStatuses(selectedDetail.status).filter((s) => s !== "awaiting_shipment");
                  return allowed.map((nextStatus) => {
                    const buttonConfig: Record<string, { label: string; color: string }> = {
                      awaiting_shipment: { label: "Đã chuẩn bị đơn hàng", color: "#1e88e5" },
                      processing: { label: "Đang xử lý", color: "#667eea" },
                      shipping: { label: "Đang giao", color: "#f39c12" },
                      completed: { label: "Hoàn thành", color: "#00b894" },
                      cancelled: { label: "Hủy đơn", color: "#ff7675" },
                    };
                    const config = buttonConfig[nextStatus];

                    if (nextStatus === "cancelled") {
                      return (
                        <Button 
                          key={nextStatus}
                          variant="outlined"
                          onClick={() => handleQuickStatus(nextStatus)}
                          sx={{
                            borderColor: config.color,
                            color: config.color,
                            borderRadius: 2,
                            px: 3,
                            '&:hover': { 
                              borderColor: config.color,
                              backgroundColor: `rgba(255, 118, 117, 0.08)`
                            }
                          }}
                        >
                          {config.label}
                        </Button>
                      );
                    }

                    return (
                      <Button 
                        key={nextStatus}
                        variant="contained" 
                        onClick={() => handleQuickStatus(nextStatus)}
                        sx={{
                          backgroundColor: config.color,
                          borderRadius: 2,
                          px: 3,
                          '&:hover': { backgroundColor: config.color, opacity: 0.8 }
                        }}
                      >
                        ✓ {config.label}
                      </Button>
                    );
                  });
                })()}

                {/* Terminal states message */}
                {(selectedDetail.status === "completed" || selectedDetail.status === "cancelled") && (
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    {selectedDetail.status === "completed" ? "✓ Đơn hàng đã hoàn thành" : "✕ Đơn hàng đã bị hủy"}
                  </Typography>
                )}
              </>
            )}
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}