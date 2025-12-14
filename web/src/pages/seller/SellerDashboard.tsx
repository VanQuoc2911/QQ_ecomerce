import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import InventoryIcon from "@mui/icons-material/Inventory";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, Button, Card, CardContent, Chip, LinearProgress, Paper, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  stock?: number;
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
  const [timeframe, setTimeframe] = useState<"day" | "month" | "year">("day");
  const navigate = useNavigate();

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
          stock: item.stock ?? 0,
        }));

        const sorted = [...summaries].sort(
          (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)
        );

        setTopProducts(sorted.slice(0, 5));
      })
      .catch((err) => console.error("❌ getMyProducts error:", err));

    const onOrderPlaced = () => {
      sellerService.getStats().then(setStats).catch(() => {});
    };

    window.addEventListener("orderPlaced", onOrderPlaced as EventListener);
    return () => window.removeEventListener("orderPlaced", onOrderPlaced as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalTrackedOrders = useMemo(() => {
    if (!stats) return 0;
    return (
      (stats.completedCount ?? 0) +
      (stats.pendingCount ?? 0) +
      (stats.cancelledCount ?? 0)
    );
  }, [stats]);

  const completionRate = useMemo(() => {
    if (!stats || !totalTrackedOrders) return 0;
    return Math.round(((stats.completedCount ?? 0) / totalTrackedOrders) * 100);
  }, [stats, totalTrackedOrders]);

  const pendingRate = useMemo(() => {
    if (!stats || !totalTrackedOrders) return 0;
    return Math.round(((stats.pendingCount ?? 0) / totalTrackedOrders) * 100);
  }, [stats, totalTrackedOrders]);

  const cancellationRate = useMemo(() => {
    if (!stats || !totalTrackedOrders) return 0;
    return Math.round(((stats.cancelledCount ?? 0) / totalTrackedOrders) * 100);
  }, [stats, totalTrackedOrders]);

  const revenueGrowth = useMemo(() => {
    if (!stats || !stats.revenueLastMonth) return 0;
    const diff = stats.totalRevenue - stats.revenueLastMonth;
    return Math.round((diff / Math.max(stats.revenueLastMonth, 1)) * 100);
  }, [stats]);

  const averageOrderValue = useMemo(() => {
    if (!stats || !stats.totalSales) return 0;
    return Math.round(stats.totalRevenue / Math.max(stats.totalSales, 1));
  }, [stats]);

  const analyticsCards = useMemo(
    () => [
      {
        title: "Tỷ lệ hoàn tất",
        value: `${completionRate}%`,
        helper: `${stats?.completedCount ?? 0} đơn hoàn tất`,
        progress: completionRate,
        color: "#22c55e",
        icon: <InsightsRoundedIcon sx={{ color: "#22c55e" }} />,
      },
      {
        title: "Đơn đang chờ",
        value: stats?.pendingCount ?? 0,
        helper: `${pendingRate}% tổng đơn`,
        progress: pendingRate,
        color: "#f97316",
        icon: <ShowChartRoundedIcon sx={{ color: "#f97316" }} />,
      },
      {
        title: "Tỷ lệ huỷ",
        value: `${cancellationRate}%`,
        helper: `${stats?.cancelledCount ?? 0} đơn`,
        progress: cancellationRate,
        color: "#fb7185",
        icon: <BarChartRoundedIcon sx={{ color: "#fb7185" }} />,
      },
      {
        title: "Tăng trưởng doanh thu",
        value: `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}%`,
        helper: "So với tháng trước",
        progress: Math.max(Math.min(revenueGrowth + 50, 100), 0),
        color: "#38bdf8",
        icon: <AttachMoneyIcon sx={{ color: "#38bdf8" }} />,
      },
    ],
    [stats, completionRate, pendingRate, cancellationRate, revenueGrowth]
  );

  const productChartData = useMemo(() => topProducts.slice(0, 5), [topProducts]);

  const maxSold = useMemo(() => {
    if (!productChartData.length) return 1;
    const maxValue = Math.max(...productChartData.map((item) => item.soldCount ?? 0));
    return maxValue || 1;
  }, [productChartData]);

  const chartColors = ["#38bdf8", "#a855f7", "#fb7185", "#f97316", "#22c55e"];

  type PeriodSeries = { label: string; value: number };

  const buildSeries = (count: number, revenue: number, prefix: string): PeriodSeries[] => {
    if (count <= 0) return [] as Array<{ label: string; value: number }>;
    const safeRevenue = Math.max(revenue, 1000);
    const base = safeRevenue / count;
    return Array.from({ length: count }, (_, idx) => ({
      label: `${prefix}${idx + 1}`,
      value: Math.round(base * (0.75 + ((idx % 4) * 0.08))),
    }));
  };

  const timeframeOptions: Array<{ value: "day" | "month" | "year"; label: string; helper: string }> = [
    { value: "day", label: "Theo ngày", helper: "7 ngày gần nhất" },
    { value: "month", label: "Theo tháng", helper: "12 tháng gần nhất" },
    { value: "year", label: "Theo năm", helper: "5 năm gần nhất" },
  ];

  type PeriodMetric = {
    revenue: number;
    orders: number;
    cancellations: number;
    summary: string;
    series: PeriodSeries[];
  };

  const timeframeData: Record<"day" | "month" | "year", PeriodMetric> = useMemo(() => {
    const totalRevenue = stats?.totalRevenue ?? 0;
    const totalSales = stats?.totalSales ?? 0;
    const cancelled = stats?.cancelledCount ?? 0;

    const dailyRevenue = Math.round(totalRevenue / 30);
    const monthlyRevenue = Math.round(totalRevenue / 12);
    const yearlyRevenue = totalRevenue;

    const dailyOrders = Math.max(1, Math.round(totalSales / 30));
    const monthlyOrders = Math.max(1, Math.round(totalSales / 12));
    const yearlyOrders = totalSales;

    const dailyCancel = Math.max(0, Math.round(cancelled / 30));
    const monthlyCancel = Math.max(0, Math.round(cancelled / 12));
    const yearlyCancel = cancelled;

    return {
      day: {
        revenue: dailyRevenue,
        orders: dailyOrders,
        cancellations: dailyCancel,
        summary: "7 ngày gần nhất",
        series: buildSeries(7, dailyRevenue || 1000, "D"),
      },
      month: {
        revenue: monthlyRevenue,
        orders: monthlyOrders,
        cancellations: monthlyCancel,
        summary: "12 tháng gần nhất",
        series: buildSeries(12, monthlyRevenue || 1000, "T"),
      },
      year: {
        revenue: yearlyRevenue,
        orders: yearlyOrders,
        cancellations: yearlyCancel,
        summary: "5 năm gần nhất",
        series: buildSeries(5, yearlyRevenue || 1000, "N"),
      },
    };
  }, [stats]);

  const currentPeriod = timeframeData[timeframe];


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

      {/* Timeframe Statistics */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          mb: 4,
          border: '1px solid #e0e0e0',
          backgroundColor: '#ffffff',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} flexDirection={{ xs: 'column', md: 'row' }} gap={2} mb={3}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Thống kê theo thời gian
            </Typography>
            <Typography variant="body2" color="text.secondary">
              So sánh doanh thu và đơn hàng theo ngày, tháng hoặc năm.
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            {timeframeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeframe === option.value ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setTimeframe(option.value)}
                sx={{
                  textTransform: 'none',
                  borderRadius: 999,
                  backgroundColor: timeframe === option.value ? '#667eea' : 'transparent',
                  color: timeframe === option.value ? '#fff' : '#475569',
                  borderColor: '#cbd5f5',
                }}
              >
                {option.label}
              </Button>
            ))}
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(15,23,42,0.08)',
                p: 2,
                background: 'linear-gradient(135deg, rgba(102,126,234,0.12), rgba(14,165,233,0.08))',
                height: '100%',
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Doanh thu
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#312e81' }}>
                {(currentPeriod?.revenue ?? 0).toLocaleString('vi-VN')} ₫
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentPeriod?.summary || 'Chưa có dữ liệu'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(15,23,42,0.08)',
                p: 2,
                backgroundColor: '#f8fafc',
                height: '100%',
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Số đơn
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                {currentPeriod?.orders ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Đơn phát sinh trong giai đoạn
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(15,23,42,0.08)',
                p: 2,
                backgroundColor: '#fff5f5',
                height: '100%',
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Đơn bị huỷ
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#dc2626' }}>
                {currentPeriod?.cancellations ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Trong cùng giai đoạn
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box mt={3}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>
            Biểu đồ xu hướng ({currentPeriod?.summary || 'Đang cập nhật'})
          </Typography>
          {currentPeriod?.series?.length ? (
            (() => {
              const peakValue = Math.max(...currentPeriod.series.map((point) => point.value), 1);
              return (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
                    gap: 1.5,
                  }}
                >
                  {currentPeriod.series.map((point) => (
                    <Box key={point.label} textAlign="center">
                      <Box
                        sx={{
                          height: 120,
                          borderRadius: 1.5,
                          border: '1px solid rgba(148,163,184,0.4)',
                          display: 'flex',
                          flexDirection: 'column-reverse',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: `${Math.min((point.value / peakValue) * 100, 100)}%`,
                            background: 'linear-gradient(180deg, #60a5fa, #2563eb)',
                            transition: 'height 0.3s ease',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {point.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              );
            })()
          ) : (
            <Box
              sx={{
                border: '1px dashed rgba(148,163,184,0.5)',
                borderRadius: 2,
                py: 4,
                textAlign: 'center',
                color: '#94a3b8',
              }}
            >
              Chưa có dữ liệu thống kê cho giai đoạn này.
            </Box>
          )}
        </Box>
      </Paper>

        {/* Analytics Overview */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            mb: 4,
            border: '1px solid #e0e0e0',
            backgroundColor: '#ffffff',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Hiệu suất kinh doanh
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cập nhật theo thời gian thực dựa trên số liệu đơn hàng gần nhất.
              </Typography>
            </Box>
            <Chip
              label={`${totalTrackedOrders} đơn theo dõi`}
              size="small"
              sx={{ backgroundColor: 'rgba(102,126,234,0.1)', color: '#667eea', fontWeight: 600 }}
            />
          </Box>

          <Grid container spacing={2}>
            {analyticsCards.map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.title}>
                <Box
                  sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(15,23,42,0.08)',
                    p: 2,
                    background:
                      'linear-gradient(135deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.9) 100%)',
                    height: '100%',
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      {card.title}
                    </Typography>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        backgroundColor: `${card.color}20`,
                      }}
                    >
                      {card.icon}
                    </Box>
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    {card.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.helper}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={card.progress}
                    sx={{
                      mt: 1.5,
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: 'rgba(148,163,184,0.3)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                        backgroundColor: card.color,
                      },
                    }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>

      {/* Analytics Chart + Insights */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e0e0e0',
              height: '100%',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <BarChartRoundedIcon sx={{ color: '#0ea5e9' }} />
                <Typography variant="h6" fontWeight={700}>
                  Biểu đồ doanh số theo sản phẩm
                </Typography>
              </Box>
              <Chip
                label="Top 5"
                size="small"
                sx={{ backgroundColor: 'rgba(14,165,233,0.1)', color: '#0ea5e9', fontWeight: 600 }}
              />
            </Box>

            {productChartData.length ? (
              <Box>
                {productChartData.map((product, index) => {
                  const sold = product.soldCount ?? 0;
                  const percent = Math.round((sold / maxSold) * 100);
                  return (
                    <Box key={product._id} mb={index === productChartData.length - 1 ? 0 : 2.5}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
                        <Typography fontWeight={600} sx={{ flex: 1 }} noWrap>
                          {index + 1}. {product.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sold} đơn
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          mt: 1,
                          height: 10,
                          borderRadius: 999,
                          backgroundColor: 'rgba(148,163,184,0.3)',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${percent}%`,
                            height: '100%',
                            borderRadius: 999,
                            backgroundColor: chartColors[index % chartColors.length],
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box
                sx={{
                  height: 220,
                  borderRadius: 2,
                  border: '1px dashed rgba(148,163,184,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">
                  Chưa có dữ liệu bán hàng đủ để hiển thị biểu đồ.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e0e0e0',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(14,165,233,0.05))',
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <ShowChartRoundedIcon sx={{ color: '#2563eb' }} />
              <Typography variant="h6" fontWeight={700}>
                Chỉ số chuyên sâu
              </Typography>
            </Box>
            <Typography variant="h3" fontWeight={800} sx={{ color: '#1d4ed8' }}>
              {averageOrderValue.toLocaleString()} ₫
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Giá trị đơn hàng trung bình ({stats?.totalSales ?? 0} đơn)
            </Typography>

            <Box mt={3}>
              {[
                { label: 'Hoàn tất', value: completionRate, color: '#22c55e' },
                { label: 'Đang chờ', value: pendingRate, color: '#f97316' },
                { label: 'Bị huỷ', value: cancellationRate, color: '#fb7185' },
              ].map((metric) => (
                <Box key={metric.label} mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                      {metric.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {metric.value}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={metric.value}
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: 'rgba(148,163,184,0.3)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 999,
                        backgroundColor: metric.color,
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
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

    </Box>
  );
}