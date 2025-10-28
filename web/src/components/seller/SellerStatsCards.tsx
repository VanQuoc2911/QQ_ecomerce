import {
  AttachMoney,
  Inventory,
  ShoppingCart
} from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Typography
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";

interface SellerStats {
  products: number;
  orders: number;
  revenue: number;
  pendingOrders: number;
}

interface SellerStatsCardsProps {
  stats: SellerStats;
  loading: boolean;
}

export default function SellerStatsCards({ stats, loading }: SellerStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Sản phẩm
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : stats.products}
                </Typography>
              </Box>
              <Inventory sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Đơn hàng
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : stats.orders}
                </Typography>
              </Box>
              <ShoppingCart sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Doanh thu
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : formatCurrency(stats.revenue)}
                </Typography>
              </Box>
              <AttachMoney sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Chờ xử lý
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : stats.pendingOrders}
                </Typography>
              </Box>
              <ShoppingCart sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
