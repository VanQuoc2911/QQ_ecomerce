import {
    Favorite,
    Home,
    Person,
    Receipt,
    ShoppingCart,
    Store
} from "@mui/icons-material";
import type { ChipProps } from "@mui/material";
import {
    Alert,
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Toolbar,
    Typography
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import { api } from "../../api/axios";
import { favoriteService } from "../../api/favoriteService";
import type { ApiProduct } from "../../api/productService";
import ProductCard from "../../components/user/ProductCard";
import { useAuth } from "../../context/AuthContext";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

interface UserStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
}

interface Order {
  id: number;
  userId: number;
  total: number;
  status: string;
  date: string;
}

const drawerWidth = 280;

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<UserStats>({ 
    totalOrders: 0, 
    pendingOrders: 0, 
    completedOrders: 0,
    totalSpent: 0
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteProducts, setFavoriteProducts] = useState<ProductCardType[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [selectedMenu, setSelectedMenu] = useState("home");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const ordersRes = await api.get<Order[]>("/orders");
        const ordersData = ordersRes.data as Order[];
        
        setStats({
          totalOrders: ordersData.length,
          pendingOrders: ordersData.filter((order) => order.status === "pending").length,
          completedOrders: ordersData.filter((order) => order.status === "completed").length,
          totalSpent: ordersData.reduce((sum: number, order) => sum + order.total, 0),
        });
        
        setOrders(ordersData);
      } catch (err) {
        console.error("Fetch data error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const mapApiProductToCard = (product: ApiProduct): ProductCardType => {
    const maybeShop = product.shopId as unknown as
      | string
      | { _id?: string; shopName?: string; logo?: string };
    const shopId = typeof maybeShop === "string" ? maybeShop : maybeShop?._id;
    const shopName = typeof maybeShop === "object" ? maybeShop?.shopName : undefined;
    const shopLogo = typeof maybeShop === "object" ? maybeShop?.logo : undefined;

    return {
      id: product._id,
      name: product.title,
      price: product.price,
      images: product.images,
      videos: product.videos,
      category: Array.isArray(product.categories) ? product.categories.join(", ") : "",
      description: product.description,
      stock: product.stock,
      rating: product.rating ?? product.Rating ?? 0,
      shopId,
      shopName,
      shopLogo,
      isFavorite: true,
    };
  };

  const loadFavorites = async () => {
    setFavoriteLoading(true);
    setFavoriteError(null);
    try {
      const favorites = await favoriteService.getFavorites();
      setFavoriteProducts(favorites.map(mapApiProductToCard));
    } catch (err) {
      console.error("Failed to load favorites", err);
      setFavoriteError("Không thể tải danh sách yêu thích. Vui lòng thử lại.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMenu === "favorites") {
      loadFavorites();
    }
  }, [selectedMenu]);

  const handleFavoriteToggle = (productId: string, isFav: boolean) => {
    if (!isFav) {
      setFavoriteProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  const menuItems = [
    { id: "home", label: "Trang chủ", icon: <Home /> },
    { id: "orders", label: "Đơn hàng", icon: <Receipt /> },
    { id: "favorites", label: "Yêu thích", icon: <Favorite /> },
    { id: "profile", label: "Hồ sơ", icon: <Person /> },
  ];

  const getStatusColor = (status: string): ChipProps['color'] => {
    switch (status) {
      case "completed": return "success";
      case "pending": return "warning";
      case "shipped": return "info";
      default: return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Hoàn thành";
      case "pending": return "Chờ xử lý";
      case "shipped": return "Đang giao";
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const renderHome = () => (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="white" gutterBottom variant="h6">
                    Tổng đơn hàng
                  </Typography>
                  <Typography color="white" variant="h4">
                    {loading ? "..." : stats.totalOrders}
                  </Typography>
                </Box>
                <Receipt sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
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

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="white" gutterBottom variant="h6">
                    Hoàn thành
                  </Typography>
                  <Typography color="white" variant="h4">
                    {loading ? "..." : stats.completedOrders}
                  </Typography>
                </Box>
                <Receipt sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="white" gutterBottom variant="h6">
                    Tổng chi tiêu
                  </Typography>
                  <Typography color="white" variant="h4">
                    {loading ? "..." : formatCurrency(stats.totalSpent)}
                  </Typography>
                </Box>
                <Store sx={{ fontSize: 40, color: 'white', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Orders */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt />
            Đơn hàng gần đây
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mã đơn</TableCell>
                  <TableCell>Tổng tiền</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ngày</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.slice(0, 5).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>#{order.id}</TableCell>
                    <TableCell>{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                    <Chip 
                      label={getStatusText(order.status)} 
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                    </TableCell>
                    <TableCell>{order.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderOrders = () => (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Đơn hàng của tôi</Typography>
      
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Mã đơn</TableCell>
                  <TableCell>Tổng tiền</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ngày</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>#{order.id}</TableCell>
                    <TableCell>{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(order.status)} 
                        color={getStatusColor(order.status) }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined">
                        Xem chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  const renderFavorites = () => (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Sản phẩm yêu thích</Typography>

      {favoriteLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : favoriteError ? (
        <Alert severity="error">{favoriteError}</Alert>
      ) : favoriteProducts.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              Bạn chưa có sản phẩm yêu thích nào.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hãy khám phá và nhấn ❤️ để lưu lại sản phẩm nhé!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {favoriteProducts.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <ProductCard product={product} onFavoriteToggle={handleFavoriteToggle} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
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
            User Panel
          </Typography>
        </Toolbar>
        
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => (
            <ListItem
              key={item.id}
              onClick={() => setSelectedMenu(item.id)}
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

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top App Bar */}
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'text.primary' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Chào mừng, {user?.name || user?.email || "User"}
            </Typography>
            <Button onClick={handleLogout} color="inherit">
              Đăng xuất
            </Button>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f5f5' }}>
          {selectedMenu === "home" && renderHome()}
          {selectedMenu === "orders" && renderOrders()}
          {selectedMenu === "favorites" && renderFavorites()}
          {selectedMenu === "profile" && (
            <Typography variant="h4">Hồ sơ cá nhân</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
