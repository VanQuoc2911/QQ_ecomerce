import PendingActionsIcon from "@mui/icons-material/PendingActions";
import PeopleIcon from "@mui/icons-material/People";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { Box, Card, CardContent, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import React from "react";

const stats = [
  {
    title: "Total Users",
    value: 102,
    icon: <PeopleIcon style={{ fontSize: 32 }} />,
    color: "#4e73df",
  },
  {
    title: "Pending Products",
    value: 8,
    icon: <PendingActionsIcon style={{ fontSize: 32 }} />,
    color: "#f6c23e",
  },
  {
    title: "Orders Today",
    value: 23,
    icon: <ShoppingCartIcon style={{ fontSize: 32 }} />,
    color: "#1cc88a",
  },
];

const AdminDashboard: React.FC = () => {
  return (
    <>
      <Typography
        variant="h4"
        fontWeight={700}
        mb={3}
        sx={{ color: "text.primary" }}
      >
        Dashboard Overview
      </Typography>

      <Grid container spacing={3}>
        {stats.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              elevation={3}
              sx={{
                p: 2,
                borderRadius: 3,
                transition: "0.3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                },
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    color="text.secondary"
                  >
                    {item.title}
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {item.value}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    backgroundColor: item.color + "20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color,
                  }}
                >
                  {item.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default AdminDashboard;
