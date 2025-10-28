// src/components/system/SystemSidebar.tsx
import {
  Assignment,
  Dashboard,
  LocalShipping,
  People,
  RequestPage,
  Settings,
  Store
} from "@mui/icons-material";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from "@mui/material";
import type { ReactNode } from "react";

interface MenuItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface SystemSidebarProps {
  selectedMenu: string;
  onMenuSelect: (menuId: string) => void;
}

const drawerWidth = 280;

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <Dashboard /> },
  { id: "requests", label: "Duyệt yêu cầu", icon: <RequestPage /> },
  { id: "users", label: "Quản lý User", icon: <People /> },
  { id: "sellers", label: "Quản lý Seller", icon: <Store /> },
  { id: "shippers", label: "Quản lý Shipper", icon: <LocalShipping /> },
  { id: "assignments", label: "Phân công", icon: <Assignment /> },
  { id: "settings", label: "Cài đặt hệ thống", icon: <Settings /> },
];

export default function SystemSidebar({ selectedMenu, onMenuSelect }: SystemSidebarProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        },
      }}
    >
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          System Panel
        </Typography>
      </Toolbar>

      <List sx={{ px: 2 }}>
        {menuItems.map((item) => (
          <ListItem
            key={item.id}
            onClick={() => onMenuSelect(item.id)}
            sx={{
              borderRadius: 2,
              mb: 1,
              backgroundColor: selectedMenu === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
              cursor: 'pointer'
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
