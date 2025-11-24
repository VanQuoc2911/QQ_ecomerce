/* eslint-disable react-hooks/exhaustive-deps */
import FavoriteIcon from "@mui/icons-material/Favorite";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import StorefrontIcon from "@mui/icons-material/Storefront";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cartService, type CartResponse } from "../../api/cartService";
import { notificationService, type NotificationItem } from "../../api/notificationService";
import { productService, type ApiProduct } from "../../api/productService";
import LoginModal from "../../components/auth/LoginModal";
import RegisterModal from "../../components/auth/RegisterModal";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/useSocket";
import NotificationDetail from "./NotificationDetail";

type CartItem = CartResponse["items"][number];

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifAnchorEl, setNotifAnchorEl] = useState<HTMLElement | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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

  const fetchNotifications = async () => {
    if (!user) return setNotifications([]);
    setNotifLoading(true);
    try {
      const items = await notificationService.getNotifications();
      setNotifications(items || []);
    } catch (err) {
      console.error("Fetch notifications failed:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  // Handle search input with live results
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);
    try {
      const response = await productService.getProducts({ 
        limit: 8,
        status: "approved",
        q: query.trim(),
      });
      setSearchResults(response.items || []);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchResultClick = (productId: string) => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    navigate(`/products/${productId}`);
  };

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setShowSearchResults(false);
    setSearchResults([]);
    navigate(`/products?q=${encodeURIComponent(trimmed)}`);
  };

  // Handle click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showSearchResults]);

  useEffect(() => {
    fetchCartCount();
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    const handleCartChange = (event: Event) => {
      // Nếu event có detail với totalItems, cập nhật ngay không cần fetch
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.totalItems !== undefined) {
        setCartCount(customEvent.detail.totalItems);
        setAnimate(true);
        setTimeout(() => setAnimate(false), 600);
      } else {
        // Fallback: fetch từ server nếu không có detail
        fetchCartCount();
      }
    };
    window.addEventListener("cartUpdated", handleCartChange);
    const handleOpenLogin = () => setLoginOpen(true);
    const handleOpenRegister = () => setRegisterOpen(true);
    const handleProfileUpdated = () => {
      // Refresh user info từ AuthContext (sẽ trigger re-render với new avatar)
      // và cập nhật cart count
      fetchCartCount();
    };
    window.addEventListener("openLogin", handleOpenLogin as EventListener);
    window.addEventListener("openRegister", handleOpenRegister as EventListener);
    window.addEventListener("profileUpdated", handleProfileUpdated);
    return () => {
      window.removeEventListener("cartUpdated", handleCartChange);
      window.removeEventListener("openLogin", handleOpenLogin as EventListener);
      window.removeEventListener("openRegister", handleOpenRegister as EventListener);
      window.removeEventListener("profileUpdated", handleProfileUpdated);
    };
  }, []);

  // Socket: listen for new notification events
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const onNew = (notif: NotificationItem) => {
      // Prepend and refetch lightly
      setNotifications((prev) => [notif, ...prev]);
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const favoriteCount = user?.favorites?.length ?? 0;

  const handleNotifClick = (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(e.currentTarget);
  };

  const handleNotifClose = () => setNotifAnchorEl(null);

  const handleFavoritesClick = () => {
    navigate("/favorites");
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const openDetail = async (notif: NotificationItem) => {
    // If notification has a URL, navigate to it directly
    const tryNavigateTo = async () => {
      if (notif.url) {
        // mark read first
        if (!notif.read) {
          try {
            await notificationService.markAsRead(notif._id);
            setNotifications((prev) => prev.map((p) => (p._id === notif._id ? { ...p, read: true } : p)));
          } catch (err) {
            console.error("mark on navigate failed", err);
          }
        }
        try {
          const url = new URL(notif.url, window.location.origin);
          if (url.origin === window.location.origin) {
            navigate(url.pathname + url.search + url.hash);
          } else {
            window.open(notif.url, "_blank", "noopener");
          }
        } catch {
          window.open(notif.url, "_blank", "noopener");
        }
        setNotifAnchorEl(null);
        return true;
      }

      // If it's an order notification, try to extract order id and navigate to order detail
      if (notif.type === "order") {
        // prefer explicit refId if provided
        const orderId = notif.refId || (() => {
          const m = notif.message ? notif.message.match(/[0-9a-fA-F]{24}/) : null;
          return m ? m[0] : null;
        })();

        if (orderId) {
          if (!notif.read) {
            try {
              await notificationService.markAsRead(notif._id);
              setNotifications((prev) => prev.map((p) => (p._id === notif._id ? { ...p, read: true } : p)));
            } catch (err) {
              console.error("mark on navigate failed", err);
            }
          }
          // route to order detail (UserRoutes uses /Order/:id)
          navigate(`/Order/${orderId}`);
          setNotifAnchorEl(null);
          return true;
        }
      }

      return false;
    };

    const navigated = await tryNavigateTo();
    if (navigated) return;

    // Fallback: open modal detail
    if (!notif.read) {
      try {
        await notificationService.markAsRead(notif._id);
        setNotifications((prev) => prev.map((p) => (p._id === notif._id ? { ...p, read: true } : p)));
      } catch (err) {
        console.error("mark on open failed", err);
      }
    }
    setSelectedNotif(notif);
    setDetailOpen(true);
    setNotifAnchorEl(null);
  };

  const closeDetail = () => {
    setSelectedNotif(null);
    setDetailOpen(false);
  };

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
    { label: "Lịch sử mua hàng", path: "/order-history", icon: <StorefrontIcon /> },
  ];

  const palette = {
    primary: "#1d4ed8",
    primaryDark: "#1e3a8a",
    accent: "#38bdf8",
    text: "#0f172a",
    softBackground: "rgba(219,234,254,0.92)",
    frosted: "linear-gradient(135deg, rgba(191,219,254,0.95) 0%, rgba(219,234,254,0.95) 100%)",
  };

  const iconAccents = {
    notifications: {
      main: "#6666e4ff",
      light: "rgba(249,115,22,0.15)",
      border: "rgba(249,115,22,0.25)",
    },
    favorites: {
      main: "#ec4899",
      light: "rgba(236,72,153,0.15)",
      border: "rgba(236,72,153,0.25)",
    },
    ai: {
      main: "#a855f7",
      light: "rgba(168,85,247,0.15)",
      border: "rgba(168,85,247,0.25)",
    },
    cart: {
      main: "#0ea5e9",
      light: "rgba(14,165,233,0.15)",
      border: "rgba(14,165,233,0.25)",
    },
  } as const;

  return (
    <>
      <AppBar
        position="sticky"
        elevation={scrolled ? 4 : 0}
        sx={{
          background: scrolled ? palette.softBackground : palette.frosted,
          backdropFilter: "blur(18px)",
          transition: "all 0.3s ease",
          borderBottom: scrolled ? "1px solid rgba(148,163,184,0.25)" : "1px solid rgba(148,163,184,0.2)",
          boxShadow: scrolled
            ? "0 10px 30px rgba(15,23,42,0.08)"
            : "0 8px 20px rgba(59,130,246,0.07)",
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
                    background: "linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 18px rgba(15,23,42,0.15)",
                    transition: "transform 0.3s ease",
                    "&:hover": {
                      transform: "rotate(5deg) scale(1.1)",
                    },
                  }}
                >
                  <StorefrontIcon sx={{ fontSize: 28, color: palette.primary }} />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    fontSize: 22,
                    backgroundImage: "linear-gradient(120deg, #0f172a, #1d4ed8)",
                    backgroundClip: "text",
                    color: "transparent",
                    letterSpacing: 0.3,
                    display: { xs: "none", sm: "block" },
                  }}
                >
                  QQ Store
                </Typography>
              </Link>
            </Box>

            {/* Desktop Menu */}
            {!isMobile && (
              <Box display="flex" alignItems="center" gap={1.5}>
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    component={Link}
                    to={item.path}
                    sx={{
                      color:
                        location.pathname === item.path ? palette.primary : palette.text,
                      fontWeight: 600,
                      fontSize: 14,
                      px: 2.2,
                      py: 0.75,
                      borderRadius: 999,
                      textTransform: "none",
                      position: "relative",
                      background:
                        location.pathname === item.path
                          ? "rgba(59,130,246,0.12)"
                          : "transparent",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        background: "rgba(59,130,246,0.15)",
                        color: palette.primary,
                        transform: "translateY(-2px)",
                      },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: -6,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: location.pathname === item.path ? "60%" : "0%",
                        height: 3,
                        background: palette.primary,
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

                {/* Search Bar */}
                <Box
                  ref={searchRef}
                  sx={{
                    position: "relative",
                    flexGrow: 0,
                    minWidth: 280,
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      p: 0.4,
                      borderRadius: 999,
                      background: "linear-gradient(120deg, rgba(59,130,246,0.8) 0%, rgba(14,165,233,0.8) 60%, rgba(14,165,233,0.5) 100%)",
                      boxShadow: "0 14px 32px rgba(37,99,235,0.25)",
                      transition: "transform 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 16px 34px rgba(37,99,235,0.35)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: -12,
                        left: 24,
                        px: 0.8,
                        py: 0.35,
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.25,
                        background: "rgba(255,255,255,0.95)",
                        color: palette.primaryDark,
                        boxShadow: "0 6px 18px rgba(15,23,42,0.15)",
                        pointerEvents: "none",
                      }}
                    >
                      Tìm kiếm nhanh
                    </Box>
                    <TextField
                      placeholder="Tìm kiếm sản phẩm, thương hiệu, danh mục..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => searchQuery.trim().length >= 2 && setShowSearchResults(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearchSubmit();
                        }
                      }}
                      size="small"
                      sx={{
                        width: 320,
                        "& .MuiOutlinedInput-root": {
                          color: palette.text,
                          backgroundColor: "rgba(255,255,255,0.98)",
                          border: "1px solid rgba(148,163,184,0.4)",
                          borderRadius: 999,
                          px: 0.8,
                          py: 0.2,
                          boxShadow: "0 10px 20px rgba(15,23,42,0.12)",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            borderColor: palette.primary,
                            boxShadow: "0 16px 30px rgba(37,99,235,0.2)",
                          },
                          "&.Mui-focused": {
                            borderColor: palette.primary,
                            boxShadow: "0 18px 32px rgba(37,99,235,0.3)",
                          },
                        },
                        "& .MuiOutlinedInput-input": {
                          py: 0.7,
                          fontSize: 13,
                        },
                        "& .MuiOutlinedInput-input::placeholder": {
                          color: "rgba(15,23,42,0.55)",
                          opacity: 1,
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: palette.primary, fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: searchQuery ? (
                          <Typography
                            variant="caption"
                            sx={{
                              color: palette.primary,
                              fontWeight: 700,
                              cursor: "pointer",
                              mr: 1,
                            }}
                            onClick={() => {
                              setSearchQuery("");
                              setSearchResults([]);
                              setShowSearchResults(false);
                            }}
                          >
                            Xóa
                          </Typography>
                        ) : null,
                      }}
                    />
                  </Box>

                  {/* Search Results Dropdown */}
                  {showSearchResults && (searchResults.length > 0 || searchLoading) && (
                    <Paper
                      sx={{
                        position: "absolute",
                        top: "calc(100% + 12px)",
                        left: 0,
                        right: 0,
                        maxHeight: 420,
                        overflowY: "auto",
                        zIndex: 1000,
                        borderRadius: 3,
                        border: "1px solid rgba(226,232,240,0.9)",
                        boxShadow: "0 24px 50px rgba(15,23,42,0.25)",
                      }}
                    >
                      {searchLoading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((product) => (
                          <Box
                            key={product._id}
                            onClick={() => handleSearchResultClick(product._id)}
                            sx={{
                              display: "flex",
                              gap: 1.5,
                              p: 1.5,
                              borderBottom: "1px solid #eee",
                              cursor: "pointer",
                              transition: "background 0.2s ease",
                              "&:hover": {
                                background: "#f5f5f5",
                              },
                              "&:last-child": {
                                borderBottom: "none",
                              },
                            }}
                          >
                            <Box
                              component="img"
                              src={product.images?.[0] || "https://via.placeholder.com/50"}
                              alt={product.title}
                              sx={{ width: 50, height: 50, borderRadius: 1, objectFit: "cover" }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" fontWeight={600} noWrap>
                                {product.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {product.description?.slice(0, 50)}...
                              </Typography>
                              <Typography variant="body2" color="primary" fontWeight={700}>
                                {product.price.toLocaleString("vi-VN")}₫
                              </Typography>
                            </Box>
                          </Box>
                        ))
                      ) : (
                        <Box sx={{ p: 2, textAlign: "center" }}>
                          <Typography variant="caption" color="text.secondary">
                            Không tìm thấy sản phẩm
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  )}
                </Box>

                {/* Auth Buttons hoặc Avatar */}
                {user ? (
                  <>
                    <IconButton
                      onClick={handleNotifClick}
                      sx={{
                        ml: 1.5,
                        background: iconAccents.notifications.light,
                        border: `1px solid ${iconAccents.notifications.border}`,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          background: "rgba(249,115,22,0.22)",
                          transform: "translateY(-2px)",
                        },
                      }}
                      title="Thông báo"
                    >
                      <Badge
                        badgeContent={unreadCount}
                        color="error"
                        invisible={unreadCount === 0}
                        sx={{
                          "& .MuiBadge-badge": {
                            fontWeight: 800,
                            backgroundColor: iconAccents.notifications.main,
                            color: "#fff",
                          },
                        }}
                      >
                        <NotificationsIcon sx={{ color: iconAccents.notifications.main, fontSize: 26 }} />
                      </Badge>
                    </IconButton>

                    <IconButton
                      component={Link}
                      to="/profile"
                      sx={{
                        ml: 2,
                        p: 0.5,
                        border: "2px solid rgba(59,130,246,0.35)",
                        borderRadius: 3,
                        transition: "all 0.3s ease",
                        background: "rgba(59,130,246,0.08)",
                        "&:hover": {
                          transform: "scale(1.05)",
                          borderColor: palette.primary,
                          background: "rgba(59,130,246,0.16)",
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
                          boxShadow: "0 8px 18px rgba(15,23,42,0.15)",
                        }}
                      />
                    </IconButton>
                  </>
                ) : (
                  <Box display="flex" gap={1.5} ml={2}>
                    <Button
                      onClick={() => setLoginOpen(true)}
                      sx={{
                        color: palette.primary,
                        borderColor: "rgba(59,130,246,0.4)",
                        fontWeight: 700,
                        borderRadius: 999,
                        px: 3,
                        py: 1,
                        textTransform: "none",
                        border: "2px solid rgba(59,130,246,0.4)",
                        background: "rgba(59,130,246,0.08)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          background: "rgba(59,130,246,0.15)",
                          borderColor: palette.primary,
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      Đăng nhập
                    </Button>
                    <Button
                      onClick={() => setRegisterOpen(true)}
                      sx={{
                        background: "linear-gradient(120deg, #1d4ed8 0%, #38bdf8 100%)",
                        color: "#fff",
                        fontWeight: 800,
                        borderRadius: 999,
                        px: 3,
                        py: 1,
                        textTransform: "none",
                        boxShadow: "0 12px 24px rgba(30,64,175,0.25)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 16px 28px rgba(30,64,175,0.35)",
                        },
                      }}
                    >
                      Đăng ký
                    </Button>
                  </Box>
                )}

                {/* Favorites icon */}
                <IconButton
                  onClick={handleFavoritesClick}
                  title="Yêu thích"
                  sx={{
                    ml: 1.5,
                    background: iconAccents.favorites.light,
                    border: `1px solid ${iconAccents.favorites.border}`,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      background: "rgba(236,72,153,0.22)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Badge
                    badgeContent={favoriteCount}
                    overlap="circular"
                    invisible={favoriteCount === 0}
                    sx={{
                      "& .MuiBadge-badge": {
                        background: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
                        color: "#fff",
                        fontWeight: 800,
                        border: "2px solid #fff",
                        minWidth: 20,
                        height: 20,
                      },
                    }}
                  >
                    <FavoriteIcon sx={{ color: iconAccents.favorites.main, fontSize: 26 }} />
                  </Badge>
                </IconButton>

                {/* AI Chat Button */}
                <IconButton
                  component={Link}
                  to="/ai-chat"
                  title="Chat với AI hỗ trợ"
                  sx={{
                    ml: 1.5,
                    background: iconAccents.ai.light,
                    border: `1px solid ${iconAccents.ai.border}`,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      background: "rgba(168,85,247,0.22)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <SmartToyIcon sx={{ color: iconAccents.ai.main, fontSize: 26 }} />
                </IconButton>

                {/* Giỏ hàng với hiệu ứng */}
                <IconButton
                  component={Link}
                  to="/cart"
                  sx={{
                    ml: 2,
                    background: iconAccents.cart.light,
                    border: `1px solid ${iconAccents.cart.border}`,
                    transition: "all 0.3s ease",
                    animation: animate ? "cart-shake 0.6s ease" : "none",
                    "&:hover": {
                      background: "rgba(14,165,233,0.22)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Badge
                    badgeContent={cartCount}
                    sx={{
                      "& .MuiBadge-badge": {
                        background: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
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
                    <ShoppingCartIcon sx={{ color: iconAccents.cart.main, fontSize: 28 }} />
                  </Badge>
                </IconButton>
              </Box>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton
                  onClick={handleFavoritesClick}
                  sx={{
                    background: iconAccents.favorites.light,
                    border: `1px solid ${iconAccents.favorites.border}`,
                  }}
                >
                  <Badge
                    badgeContent={favoriteCount}
                    sx={{
                      "& .MuiBadge-badge": {
                        background: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
                        color: "#fff",
                        fontWeight: 800,
                        border: "2px solid #fff",
                      },
                    }}
                    overlap="circular"
                    invisible={favoriteCount === 0}
                  >
                    <FavoriteIcon sx={{ color: iconAccents.favorites.main }} />
                  </Badge>
                </IconButton>
                <IconButton
                  component={Link}
                  to="/cart"
                  sx={{
                    background: iconAccents.cart.light,
                    border: `1px solid ${iconAccents.cart.border}`,
                    animation: animate ? "cart-shake 0.6s ease" : "none",
                  }}
                >
                  <Badge
                    badgeContent={cartCount}
                    sx={{
                      "& .MuiBadge-badge": {
                        background: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
                        color: "#fff",
                        fontWeight: 800,
                        border: "2px solid #fff",
                      },
                    }}
                  >
                    <ShoppingCartIcon sx={{ color: iconAccents.cart.main }} />
                  </Badge>
                </IconButton>
                <IconButton
                  onClick={() => setDrawerOpen(true)}
                  sx={{
                    color: palette.primary,
                    background: "rgba(59,130,246,0.14)",
                    border: "1px solid rgba(59,130,246,0.25)",
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
            background: "linear-gradient(180deg, #f8fafc 0%, #e0f2ff 100%)",
            color: palette.text,
            borderLeft: "1px solid rgba(148,163,184,0.3)",
            boxShadow: "-8px 0 30px rgba(15,23,42,0.1)",
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={800} mb={3} color={palette.primary}>
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
                        ? "rgba(59,130,246,0.12)"
                        : "transparent",
                    "&:hover": {
                      background: "rgba(59,130,246,0.18)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: palette.primary, minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: 700 }}
                  />
                </ListItemButton>
              </ListItem>
            ))}

            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component={Link}
                to="/favorites"
                onClick={() => setDrawerOpen(false)}
                sx={{
                  borderRadius: 2,
                  background:
                    location.pathname === "/favorites"
                      ? iconAccents.favorites.light
                      : "transparent",
                  "&:hover": {
                    background: "rgba(236,72,153,0.18)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: iconAccents.favorites.main, minWidth: 40 }}>
                  <FavoriteIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Yêu thích"
                  primaryTypographyProps={{ fontWeight: 700 }}
                />
              </ListItemButton>
            </ListItem>

            {/* AI Chat Button - Mobile */}
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component={Link}
                to="/ai-chat"
                onClick={() => setDrawerOpen(false)}
                sx={{
                  borderRadius: 2,
                  background: iconAccents.ai.light,
                  "&:hover": {
                    background: "rgba(168,85,247,0.18)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: iconAccents.ai.main, minWidth: 40 }}>
                  <SmartToyIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Chat AI"
                  primaryTypographyProps={{ fontWeight: 700 }}
                />
              </ListItemButton>
            </ListItem>

            {user ? (
              <>
                <ListItem disablePadding sx={{ mt: 3 }}>
                  <ListItemButton
                    component={Link}
                    to="/profile"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      borderRadius: 2,
                      background: "rgba(59,130,246,0.08)",
                      "&:hover": {
                        background: "rgba(59,130,246,0.18)",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: palette.primary, minWidth: 40 }}>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Tài khoản"
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding sx={{ mt: 1 }}>
                  <ListItemButton
                    onClick={() => {
                      // open notifications popover in desktop; for mobile navigate to notifications page
                      setDrawerOpen(false);
                      navigate("/notifications");
                    }}
                    sx={{
                      borderRadius: 2,
                      background: iconAccents.notifications.light,
                      "&:hover": {
                        background: "rgba(249,115,22,0.18)",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: iconAccents.notifications.main, minWidth: 40 }}>
                      <NotificationsIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Thông báo"
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding sx={{ mt: 1 }}>
                  <ListItemButton
                    component={Link}
                    to="/order-history"
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      borderRadius: 2,
                      background: "rgba(59,130,246,0.08)",
                      "&:hover": {
                        background: "rgba(59,130,246,0.18)",
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: palette.primary, minWidth: 40 }}>
                      📜
                    </ListItemIcon>
                    <ListItemText
                      primary="Lịch sử mua hàng"
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                  </ListItemButton>
                </ListItem>
              </>
            ) : (
              <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Button
                  fullWidth
                  onClick={() => {
                    setLoginOpen(true);
                    setDrawerOpen(false);
                  }}
                  sx={{
                    background: "rgba(59,130,246,0.08)",
                    color: palette.primary,
                    fontWeight: 700,
                    borderRadius: 999,
                    py: 1.2,
                    border: "2px solid rgba(59,130,246,0.3)",
                    "&:hover": {
                      background: "rgba(59,130,246,0.16)",
                      borderColor: palette.primary,
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
                    background: "linear-gradient(120deg, #1d4ed8 0%, #38bdf8 100%)",
                    color: "#fff",
                    fontWeight: 800,
                    borderRadius: 999,
                    py: 1.2,
                    boxShadow: "0 14px 28px rgba(30,64,175,0.25)",
                    "&:hover": {
                      boxShadow: "0 18px 32px rgba(30,64,175,0.35)",
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

      <Menu
        anchorEl={notifAnchorEl}
        open={Boolean(notifAnchorEl)}
        onClose={handleNotifClose}
        PaperProps={{
          sx: {
            width: 360,
            maxWidth: "90vw",
            borderRadius: 3,
            border: "1px solid rgba(226,232,240,0.9)",
            boxShadow: "0 18px 38px rgba(15,23,42,0.18)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" fontWeight={800} color={palette.primary}>
            Thông báo
          </Typography>
        </Box>
        <Divider />
          {notifLoading ? (
          <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={20} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Không có thông báo
            </Typography>
          </Box>
          ) : (
            notifications.slice(0, 8).map((n) => (
              <MenuItem
                key={n._id}
                onClick={async () => {
                  await openDetail(n);
                }}
                sx={{ alignItems: "flex-start" }}
              >
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {n.title}
                  </Typography>
                  {n.message && (
                    <Typography variant="caption" color="text.secondary">
                      {n.message}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        <Divider />
        <MenuItem
          onClick={() => {
            handleNotifClose();
            navigate("/notifications");
          }}
        >
          <ListItemText primary="Xem tất cả" />
        </MenuItem>
      </Menu>

      <NotificationDetail open={detailOpen} notification={selectedNotif} onClose={closeDetail} />

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