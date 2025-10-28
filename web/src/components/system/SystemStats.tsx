// src/components/system/SystemStats.tsx
import {
  AttachMoney,
  People,
  Store,
  LocalShipping,
  RequestPage,
  CheckCircle
} from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Typography
} from "@mui/material";
import GridLegacy from "@mui/material/GridLegacy";

interface SystemStats {
  totalUsers: number;
  totalSellers: number;
  totalShippers: number;
  pendingRequests: number;
  totalRevenue: number;
  completedOrders: number;
}

interface SystemStatsProps {
  stats: SystemStats;
  loading: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export default function SystemStats({ stats, loading }: SystemStatsProps) {
  return (
    <GridLegacy container spacing={3} sx={{ mb: 4 }}>
      <GridLegacy item xs={12} sm={6} md={4}>
        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Tổng User
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : stats.totalUsers}
                </Typography>
              </Box>
              <People sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </GridLegacy>

      <GridLegacy item xs={12} sm={6} md={4}>
        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Tổng Seller
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : stats.totalSellers}
                </Typography>
              </Box>
              <Store sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </GridLegacy>

      <GridLegacy item xs={12} sm={6} md={4}>
        <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Tổng Shipper
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : stats.totalShippers}
                </Typography>
              </Box>
              <LocalShipping sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </GridLegacy>

      <GridLegacy item xs={12} sm={6} md={4}>
        <Card sx={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Yêu cầu chờ duyệt
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : stats.pendingRequests}
                </Typography>
              </Box>
              <RequestPage sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </GridLegacy>

      <GridLegacy item xs={12} sm={6} md={4}>
        <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Tổng doanh thu
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : formatCurrency(stats.totalRevenue)}
                </Typography>
              </Box>
              <AttachMoney sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </GridLegacy>

      <GridLegacy item xs={12} sm={6} md={4}>
        <Card sx={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="white" gutterBottom variant="h6">
                  Đơn hàng hoàn thành
                </Typography>
                <Typography color="white" variant="h4">
                  {loading ? "..." : stats.completedOrders}
                </Typography>
              </Box>
              <CheckCircle sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </GridLegacy>
    </GridLegacy>
  );
}
