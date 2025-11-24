// src/admin/pages/AdminDashboard.tsx
import AssessmentIcon from "@mui/icons-material/Assessment";
import LogoutIcon from "@mui/icons-material/Logout";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StoreIcon from "@mui/icons-material/Store";
import { Box, Button, Card, CardContent, CircularProgress, Container, Typography, alpha } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

interface StatCard {
  title: string;
  value?: number | string;
  icon: React.ReactNode;
  color: string;
  link?: string;
  trend?: string;
  subtitle?: string;
}

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/home");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const [usersRes, productsRes, sellersRes] = await Promise.all([
        api.get("/api/users"),
        api.get("/api/admin/products/pending"),
        api.get("/api/admin/seller-requests").catch(() => ({ data: [] })),
      ]);

      const pendingSellers = Array.isArray(sellersRes.data)
        ? sellersRes.data.filter((s: { status: string }) => s.status === "pending").length
        : 0;

      setStats([
        {
          title: "Total Users",
          value: usersRes.data?.data?.length ?? usersRes.data?.length ?? 0,
          icon: <PeopleIcon sx={{ fontSize: 40 }} />,
          color: "#0288d1",
          link: "/admin/users",
          trend: "+12.5%",
          subtitle: "Active members",
        },
        {
          title: "Seller Requests",
          value: pendingSellers,
          icon: <StoreIcon sx={{ fontSize: 40 }} />,
          color: "#7b1fa2",
          link: "/admin/seller-requests",
          trend: "Awaiting review",
          subtitle: "Pending approvals",
        },
        {
          title: "Pending Products",
          value: Array.isArray(productsRes.data) ? productsRes.data.length : productsRes.data?.length ?? 0,
          icon: <PendingActionsIcon sx={{ fontSize: 40 }} />,
          color: "#f57c00",
          link: "/admin/products",
          trend: "Needs review",
          subtitle: "Awaiting approval",
        },
        {
          title: "System Settings",
          icon: <SettingsIcon sx={{ fontSize: 40 }} />,
          color: "#00897b",
          link: "/admin/settings",
          subtitle: "Configure system",
        },
      ]);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const quickActions = [
    { label: "View All Products", description: "Browse and moderate listings", icon: <ShoppingCartIcon />, link: "/admin/products" },
    { label: "User Management", description: "Manage customer accounts", icon: <PeopleIcon />, link: "/admin/users" },
    { label: "Seller Requests", description: "Review pending sellers", icon: <StoreIcon />, link: "/admin/seller-requests" },
    { label: "View Reports", description: "Check performance insights", icon: <AssessmentIcon />, link: "/admin/reports" },
    { label: "System Settings", description: "Update platform policies", icon: <SettingsIcon />, link: "/admin/settings" },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={60} sx={{ color: "#0288d1" }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fb",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Card
          sx={{
            borderRadius: 4,
            background: "linear-gradient(135deg, #0288d1 0%, #01579b 100%)",
            color: "white",
            mb: 4,
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box
              display="flex"
              flexDirection={{ xs: "column", md: "row" }}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
              gap={2}
            >
              <Box>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                  Admin Dashboard
                </Typography>
                <Typography variant="body2" sx={{ color: alpha("#ffffff", 0.85) }}>
                  Monitor the health of your marketplace and take quick action when something looks off.
                </Typography>
              </Box>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={() => navigate("/admin/reports")}
                  sx={{
                    borderColor: "white",
                    color: "white",
                    textTransform: "none",
                    fontWeight: 600,
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: alpha("#ffffff", 0.15),
                    },
                  }}
                >
                  View Reports
                </Button>
                <Button
                  variant="contained"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                  sx={{
                    bgcolor: "white",
                    color: "#0288d1",
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Logout
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box
          display="grid"
          gridTemplateColumns={{ xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
          gap={3}
          mb={4}
        >
          {stats.map((stat) => (
            <Card
              key={stat.title}
              sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: alpha(stat.color, 0.15),
                height: "100%",
                cursor: stat.link ? "pointer" : "default",
                transition: "border-color 0.2s ease",
                "&:hover": stat.link ? { borderColor: stat.color } : {},
              }}
              onClick={() => stat.link && navigate(stat.link)}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      {stat.subtitle}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color={stat.color} mt={1}>
                      {stat.value ?? "--"}
                    </Typography>
                    <Typography variant="body1" fontWeight={700} mt={0.5}>
                      {stat.title}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: alpha(stat.color, 0.1),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
                {stat.trend && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                    {stat.trend}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>

        <Card sx={{ borderRadius: 4, border: "1px solid", borderColor: alpha("#0288d1", 0.1) }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Quick Actions
            </Typography>
            <Box display="grid" gridTemplateColumns={{ xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }} gap={2}>
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  fullWidth
                  variant="outlined"
                  startIcon={action.icon}
                  onClick={() => navigate(action.link)}
                  sx={{
                    justifyContent: "flex-start",
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 600,
                    borderColor: alpha("#0288d1", 0.25),
                    color: "#01579b",
                    py: 1.5,
                    "&:hover": {
                      borderColor: "#0288d1",
                      backgroundColor: alpha("#0288d1", 0.05),
                    },
                  }}
                >
                  <Box textAlign="left">
                    <Typography fontWeight={700}>{action.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
