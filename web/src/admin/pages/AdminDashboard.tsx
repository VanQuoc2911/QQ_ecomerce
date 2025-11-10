// src/admin/pages/AdminDashboard.tsx
import LogoutIcon from "@mui/icons-material/Logout";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import { Box, Button, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  link?: string;
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
      const [usersRes, productsRes] = await Promise.all([
        axios.get("/users", { withCredentials: true }),
        axios.get("/products/pending", { withCredentials: true }),
      ]);

      setStats([
        {
          title: "Total Users",
          value: usersRes.data.length,
          icon: <PeopleIcon style={{ fontSize: 32 }} />,
          color: "#4e73df",
          link: "/admin/users",
        },
        {
          title: "Pending Products",
          value: productsRes.data.length,
          icon: <PendingActionsIcon style={{ fontSize: 32 }} />,
          color: "#f6c23e",
          link: "/admin/products",
        },
        {
          title: "System Settings",
          value: 0,
          icon: <SettingsIcon style={{ fontSize: 32 }} />,
          color: "#1cc88a",
          link: "/admin/settings",
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

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700}>Admin Dashboard</Typography>
        <Button
          variant="contained"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          Logout
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={4} key={stat.title}>
            <Card
              elevation={3}
              sx={{
                p: 2,
                borderRadius: 3,
                transition: "0.3s",
                cursor: stat.link ? "pointer" : "default",
                "&:hover": { transform: "translateY(-6px)", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" },
              }}
              onClick={() => stat.link && navigate(stat.link)}
            >
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary">{stat.title}</Typography>
                  <Typography variant="h4" fontWeight={700}>{stat.value}</Typography>
                </Box>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    backgroundColor: stat.color + "20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
