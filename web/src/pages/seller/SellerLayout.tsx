import { Box, Drawer, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import { Link, Outlet, useLocation } from "react-router-dom";

const menuItems = [
  { text: "Dashboard", path: "/seller/dashboard" },
  { text: "Sản phẩm", path: "/seller/products" },
  { text: "Đơn hàng", path: "/seller/orders" },
  { text: "Thông tin Shop", path: "/seller/shop" },
];

export default function SellerLayout() {
  const location = useLocation();

  return (
    <Box sx={{ display: "flex" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: 220,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 220,
            boxSizing: "border-box",
            background: "#1e1e2d",
            color: "#fff",
          },
        }}
      >
        <Typography variant="h6" sx={{ textAlign: "center", mt: 3, mb: 2 }}>
          Seller Panel
        </Typography>

        <List>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.text}
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                "&.Mui-selected": { background: "#333", color: "#00e676" },
                "&:hover": { background: "#2c2c3a" },
              }}
            >
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
