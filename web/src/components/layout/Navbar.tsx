/* eslint-disable react-hooks/exhaustive-deps */
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StorefrontIcon from "@mui/icons-material/Storefront";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cartService } from "../../api/cartService";
import LoginModal from "../../components/auth/LoginModal";
import RegisterModal from "../../components/auth/RegisterModal";
import { useAuth } from "../../context/AuthContext";

interface ProductInCart {
  _id: string;
  title: string;
  price: number;
  images?: string[];
}

interface CartItem {
  productId: ProductInCart;
  quantity: number;
  price: number;
}

interface CartResponse {
  items: CartItem[];
}

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const fetchCartCount = async (): Promise<void> => {
    try {
      if (!user) {
        setCartCount(0);
        return;
      }

      const data: CartResponse = await cartService.getCart();
      const totalItems = data.items.reduce(
        (acc: number, item: CartItem) => acc + item.quantity,
        0
      );

      setCartCount(totalItems);
      setAnimate(true);
      setTimeout(() => setAnimate(false), 600);
    } catch (error) {
      console.error("Fetch cart count failed:", error);
      setCartCount(0);
    }
  };

  useEffect(() => {
    fetchCartCount();
  }, [user]);

  useEffect(() => {
    const handleCartChange = () => fetchCartCount();
    window.addEventListener("cartUpdated", handleCartChange);
    return () => window.removeEventListener("cartUpdated", handleCartChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Trang chủ", path: "/", icon: <StorefrontIcon /> },
    { label: "Sản phẩm", path: "/products", icon: <StorefrontIcon /> },
  ];

  return (
    <>
      <AppBar
        position="sticky"
        elevation={scrolled ? 4 : 0}
        sx={{
          background: scrolled
            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            : "linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)",
          backdropFilter: "blur(10px)",
          transition: "all 0.3s ease",
          borderBottom: scrolled ? "none" : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ py: 1 }}>
            {/* Logo */}
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #fff 0%, #f0f9ff 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    transition: "transform 0.3s ease",
                    "&:hover": {
                      transform: "rotate(5deg) scale(1.1)",
                    },
                  }}
                >
                  <StorefrontIcon sx={{ fontSize: 28, color: "#667eea" }} />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    color: "#fff",
                    textShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    letterSpacing: "0.5px",
                    display: { xs: "none", sm: "block" },
                  }}
                >
                  QQ Store
                </Typography>
              </Link>
            </Box>

            {/* Desktop Menu */}
            {!isMobile && (
              <Box display="flex" alignItems="center" gap={1}>
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    sx={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 15,
                      px: 3,
                      py: 1,
                      borderRadius: 3,
                      textTransform: "none",
                      position: "relative",
                      background:
                        location.pathname === item.path
                          ? "rgba(255,255,255,0.2)"
                          : "transparent",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        background: "rgba(255,255,255,0.25)",
                        transform: "translateY(-2px)",
                      },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: location.pathname === item.path ? "60%" : "0%",
                        height: 3,
                        background: "#fff",
                        borderRadius: "3px 3px 0 0",
                        transition: "width 0.3s ease",
                      },
                      "&:hover::after": {
                        width: "60%",
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}

                {/* Auth Buttons hoặc Avatar */}
                {user ? (
                  <IconButton
                    component={Link}
                    to="/profile"
                    sx={{
                      ml: 2,
                      p: 0.5,
                      border: "3px solid rgba(255,255,255,0.3)",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "scale(1.1)",
                        border: "3px solid rgba(255,255,255,0.6)",
                      },
                    }}
                  >
                    <Avatar
                      src={
                        user?.avatar ||
                        "https://cdn-icons-png.flaticon.com/512/219/219983.png"
                      }
                      sx={{
                        width: 42,
                        height: 42,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      }}
                    />
                  </IconButton>
                ) : (
                  <Box display="flex" gap={1.5} ml={2}>
                    <Button
                      onClick={() => setLoginOpen(true)}
                      sx={{
                        color: "#fff",
                        borderColor: "#fff",
                        fontWeight: 700,
                        borderRadius: 3,
                        px: 3,
                        py: 1,
                        textTransform: "none",
                        border: "2px solid rgba(255,255,255,0.5)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          background: "rgba(255,255,255,0.15)",
                          borderColor: "#fff",
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      Đăng nhập
                    </Button>
                    <Button
                      onClick={() => setRegisterOpen(true)}
                      sx={{
                        background: "linear-gradient(135deg, #fff 0%, #f0f9ff 100%)",
                        color: "#667eea",
                        fontWeight: 800,
                        borderRadius: 3,
                        px: 3,
                        py: 1,
                        textTransform: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          background: "linear-gradient(135deg, #f0f9ff 0%, #fff 100%)",
                          transform: "translateY(-2px)",
                          boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
                        },
                      }}
                    >
                      Đăng ký
                    </Button>
                  </Box>
                )}

                {/* Giỏ hàng với hiệu ứng */}
                <IconButton
                  component={Link}
                  to="/cart"
                  sx={{
                    ml: 2,
                    background: "rgba(255,255,255,0.2)",
                    transition: "all 0.3s ease",
                    animation: animate ? "cart-shake 0.6s ease" : "none",
                    "&:hover": {
                      background: "rgba(255,255,255,0.3)",
                      transform: "scale(1.1)",
                    },
                  }}
                >
                  <Badge
                    badgeContent={cartCount}
                    sx={{
                      "& .MuiBadge-badge": {
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 12,
                        minWidth: 22,
                        height: 22,
                        borderRadius: "11px",
                        border: "2px solid #fff",
                        animation: animate ? "badge-bounce 0.6s ease" : "none",
                      },
                    }}
                    overlap="circular"
                    invisible={cartCount === 0}
                  >
                    <ShoppingCartIcon sx={{ color: "#fff", fontSize: 28 }} />
                  </Badge>
                </IconButton>
              </Box>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton
                  component={Link}
                  to="/cart"
                  sx={{
                    background: "rgba(255,255,255,0.2)",
                    animation: animate ? "cart-shake 0.6s ease" : "none",
                  }}
                >
                  <Badge
                    badgeContent={cartCount}
                    sx={{
                      "& .MuiBadge-badge": {
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "#fff",
                        fontWeight: 800,
                        border: "2px solid #fff",
                      },
                    }}
                  >
                    <ShoppingCartIcon sx={{ color: "#fff" }} />
                  </Badge>
                </IconButton>
                <IconButton
                  onClick={() => setDrawerOpen(true)}
                  sx={{
                    color: "#fff",
                    background: "rgba(255,255,255,0.2)",
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: 280,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={800} mb={3}>
            Menu
          </Typography>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    borderRadius: 2,
                    background:
                      location.pathname === item.path
                        ? "rgba(255,255,255,0.2)"
                        : "transparent",
                    "&:hover": {
                      background: "rgba(255,255,255,0.25)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: 700 }}
                  />
                </ListItemButton>
              </ListItem>
            ))}

            {user ? (
              <ListItem disablePadding sx={{ mt: 3 }}>
                <ListItemButton
                  component={Link}
                  to="/profile"
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.2)",
                    "&:hover": {
                      background: "rgba(255,255,255,0.3)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: "#fff", minWidth: 40 }}>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Tài khoản"
                    primaryTypographyProps={{ fontWeight: 700 }}
                  />
                </ListItemButton>
              </ListItem>
            ) : (
              <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Button
                  fullWidth
                  onClick={() => {
                    setLoginOpen(true);
                    setDrawerOpen(false);
                  }}
                  sx={{
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontWeight: 700,
                    borderRadius: 2,
                    py: 1.5,
                    "&:hover": {
                      background: "rgba(255,255,255,0.3)",
                    },
                  }}
                >
                  Đăng nhập
                </Button>
                <Button
                  fullWidth
                  onClick={() => {
                    setRegisterOpen(true);
                    setDrawerOpen(false);
                  }}
                  sx={{
                    background: "#fff",
                    color: "#667eea",
                    fontWeight: 800,
                    borderRadius: 2,
                    py: 1.5,
                    "&:hover": {
                      background: "#f0f9ff",
                    },
                  }}
                >
                  Đăng ký
                </Button>
              </Box>
            )}
          </List>
        </Box>
      </Drawer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />

      {/* CSS Animations */}
      <style>
        {`
          @keyframes cart-shake {
            0%, 100% { transform: rotate(0deg) scale(1); }
            10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg) scale(1.15); }
            20%, 40%, 60%, 80% { transform: rotate(10deg) scale(1.15); }
          }

          @keyframes badge-bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.3); }
          }
        `}
      </style>
    </>
  );
}