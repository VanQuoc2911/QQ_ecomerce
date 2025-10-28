import {
    Analytics,
    Dashboard,
    Inventory,
    ShoppingCart
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

interface SellerSidebarProps {
  selectedMenu: string;
  onMenuSelect: (menuId: string) => void;
  drawerWidth: number;
}

export default function SellerSidebar({ selectedMenu, onMenuSelect, drawerWidth }: SellerSidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <Dashboard /> },
    { id: "products", label: "Sản phẩm", icon: <Inventory /> },
    { id: "orders", label: "Đơn hàng", icon: <ShoppingCart /> },
    { id: "analytics", label: "Phân tích", icon: <Analytics /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          background: 'linear-gradient(180deg, #f093fb 0%, #f5576c 100%)',
          color: 'white'
        },
      }}
    >
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Seller Panel
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
              }
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
