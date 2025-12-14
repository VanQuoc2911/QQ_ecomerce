import { CategoryRounded, Dashboard, Inventory, People, Settings } from "@mui/icons-material";
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
} from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  mobileOpen: boolean;
  onToggle: () => void;
  variant: "permanent" | "temporary";
}

const menu = [
  { label: "Dashboard", icon: <Dashboard />, path: "/admin" },
  { label: "Users", icon: <People />, path: "/admin/users" },
  { label: "Product Approval", icon: <Inventory />, path: "/admin/products" },
  { label: "Categories", icon: <CategoryRounded />, path: "/admin/categories" },
  { label: "System Settings", icon: <Settings />, path: "/admin/settings" },
];

const drawerWidth = 240;

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onToggle, variant }) => {
  const location = useLocation();

  return (
    <Drawer
      variant={variant}
      open={variant === "temporary" ? mobileOpen : true}
      onClose={onToggle}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" },
      }}
    >
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="h6" fontWeight={700}>
          🛒 Admin Panel
        </Typography>
      </Box>
      <List>
        {menu.map((item) => {
          const isActive =
            item.path === "/admin"
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={isActive}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
};

export default Sidebar;
