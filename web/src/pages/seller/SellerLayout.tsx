import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ReviewsOutlinedIcon from "@mui/icons-material/ReviewsOutlined";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import {
    AppBar,
    Badge,
    Box,
    Button,
    CircularProgress,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    Stack,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { NotificationItem } from "../../api/notificationService";
import { notificationService } from "../../api/notificationService";
import NotificationDetail from "../../components/layout/NotificationDetail";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/useSocket";

const SELLER_NOTIF_EVENT = "sellerNotificationsChanged" as const;

const drawerWidth = 260;

const menuItems = [
  { text: "Dashboard", path: "/seller/dashboard", icon: <SpaceDashboardRoundedIcon fontSize="small" /> },
  { text: "Sản phẩm", path: "/seller/products", icon: <Inventory2OutlinedIcon fontSize="small" /> },
  { text: "Đơn hàng", path: "/seller/orders", icon: <ReceiptLongOutlinedIcon fontSize="small" /> },
  { text: "Thông báo", path: "/seller/notifications", icon: <NotificationsNoneRoundedIcon fontSize="small" /> },
  { text: "Đánh giá", path: "/seller/reviews", icon: <ReviewsOutlinedIcon fontSize="small" /> },
  { text: "Voucher", path: "/seller/vouchers", icon: <LocalOfferOutlinedIcon fontSize="small" /> },
  { text: "Chat với khách", path: "/seller/chat", icon: <ChatBubbleOutlineRoundedIcon fontSize="small" /> },
  { text: "Thông tin Shop", path: "/seller/shop", icon: <StorefrontOutlinedIcon fontSize="small" /> },
];

export default function SellerLayout() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const broadcastChange = () => {
    window.dispatchEvent(new CustomEvent(SELLER_NOTIF_EVENT, { detail: { source: "layout" } }));
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setNotifLoading(true);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch seller notifications", err);
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string }>).detail;
      if (detail?.source === "layout") return;
      void fetchNotifications();
    };
    window.addEventListener(SELLER_NOTIF_EVENT, handler as EventListener);
    return () => window.removeEventListener(SELLER_NOTIF_EVENT, handler as EventListener);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (notif: NotificationItem) => {
      setNotifications((prev) => [notif, ...prev]);
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotifIconClick = (event: MouseEvent<HTMLElement>) => {
    setNotifAnchor(event.currentTarget);
  };

  const handleNotifMenuClose = () => setNotifAnchor(null);

  const markNotificationAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, read: true } : item)));
      broadcastChange();
    } catch (err) {
      console.error("markNotificationAsRead failed", err);
    }
  };

  const markAllNotifications = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      broadcastChange();
    } catch (err) {
      console.error("markAllNotifications failed", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
      broadcastChange();
    } catch (err) {
      console.error("deleteNotification failed", err);
    }
  };

  const extractOrderId = (notif: NotificationItem): string | undefined => {
    if (notif.refId) return notif.refId;
    if (notif.message) {
      const match = notif.message.match(/[0-9a-fA-F]{24}/);
      if (match) return match[0];
    }
    return undefined;
  };

  const tryNavigate = async (notif: NotificationItem) => {
    const markReadIfNeeded = async () => {
      if (!notif.read) {
        await markNotificationAsRead(notif._id);
      }
    };

    if (notif.url) {
      await markReadIfNeeded();
      try {
        const target = new URL(notif.url, window.location.origin);
        if (target.origin === window.location.origin) {
          navigate(target.pathname + target.search + target.hash);
        } else {
          window.open(notif.url, "_blank", "noopener");
        }
      } catch {
        window.open(notif.url, "_blank", "noopener");
      }
      return true;
    }

    if (notif.type === "order") {
      await markReadIfNeeded();
      const orderId = extractOrderId(notif);
      navigate("/seller/orders", { state: { focusOrder: orderId } });
      return true;
    }

    return false;
  };

  const openNotification = async (notif: NotificationItem) => {
    const navigated = await tryNavigate(notif);
    if (!navigated) {
      if (!notif.read) {
        await markNotificationAsRead(notif._id);
      }
      setSelectedNotif(notif);
      setDetailOpen(true);
    }
    handleNotifMenuClose();
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedNotif(null);
  };

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #dbeafe 0%, #ffffff 70%)",
        color: "#0f172a",
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Typography variant="body2" sx={{ color: "#2563eb", textTransform: "uppercase", letterSpacing: 2 }}>
          QQ Commerce
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
          Seller Center
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(15,23,42,0.7)" }}>
          Theo dõi hiệu suất shop của bạn
        </Typography>
      </Box>
      <Divider sx={{ borderColor: "rgba(37,99,235,0.2)" }} />
      <List sx={{ flex: 1, px: 1 }}>
        {menuItems.map((item) => {
          const selected = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.text}
              component={Link}
              to={item.path}
              selected={selected}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                mt: 1,
                "&.Mui-selected": {
                  background: "linear-gradient(120deg, rgba(37,99,235,0.22), rgba(14,165,233,0.25))",
                  color: "#0f172a",
                },
                "&:hover": {
                  background: "rgba(37,99,235,0.12)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primaryTypographyProps={{ fontWeight: selected ? 600 : 500 }}
                primary={item.text}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ px: 3, py: 3 }}>
        <Box
          sx={{
            borderRadius: 3,
            p: 2,
            background: "linear-gradient(135deg, rgba(96,165,250,0.28), rgba(125,211,252,0.32))",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Cần hỗ trợ?
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(15,23,42,0.8)" }}>
            Đội ngũ Seller Care sẽ phản hồi trong 24h.
          </Typography>
          <Button
            component={Link}
            to="/seller/chat"
            variant="contained"
            size="small"
            sx={{ mt: 1.5, background: "linear-gradient(120deg, #2563eb, #0ea5e9)", fontWeight: 600 }}
          >
            Liên hệ ngay
          </Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#e2e8ff" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: "blur(10px)",
          backgroundColor: "rgba(255,255,255,0.9)",
          borderBottom: "1px solid rgba(37,99,235,0.15)",
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          color: "#0f172a",
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuRoundedIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Kênh Người Bán
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Tooltip title="Thông báo" arrow>
              <IconButton color="inherit" onClick={handleNotifIconClick} sx={{ border: "1px solid rgba(15,23,42,0.1)" }}>
                <Badge color="error" badgeContent={unreadCount} invisible={unreadCount === 0}>
                  <NotificationsNoneRoundedIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Button
              component={Link}
              to="/shop"
              variant="outlined"
              sx={{
                borderColor: "rgba(37,99,235,0.5)",
                color: "#0f172a",
                textTransform: "none",
              }}
            >
              Xem cửa hàng
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }} aria-label="seller navigation">
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: "block", lg: "none" },
              "& .MuiDrawer-paper": { width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            open
            sx={{
              display: { xs: "none", lg: "block" },
              "& .MuiDrawer-paper": { width: drawerWidth, border: "none" },
            }}
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          background: "linear-gradient(180deg, #ffffff 0%, #dbeafe 80%)",
          p: { xs: 2, md: 4 },
        }}
      >
        <Toolbar sx={{ minHeight: 72 }} />
        <Box sx={{ maxWidth: "1600px", mx: "auto" }}>
          <Outlet />
        </Box>
      </Box>

      <Menu
        anchorEl={notifAnchor}
        open={Boolean(notifAnchor)}
        onClose={handleNotifMenuClose}
        PaperProps={{ sx: { width: 360, maxWidth: "90vw", borderRadius: 3, p: 1 } }}
      >
        <Box sx={{ px: 1.5, py: 0.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Thông báo
          </Typography>
          <Button size="small" onClick={() => void markAllNotifications()}>
            Đánh dấu tất cả
          </Button>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
          {notifLoading ? (
            <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Chưa có thông báo nào
              </Typography>
            </Box>
          ) : (
            <List sx={{ px: 0 }}>
              {notifications.slice(0, 6).map((notif) => (
                <ListItemButton
                  key={notif._id}
                  alignItems="flex-start"
                  onClick={() => void openNotification(notif)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    backgroundColor: notif.read ? "transparent" : "rgba(37,99,235,0.08)",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 42, color: notif.read ? "text.secondary" : "primary.main" }}>
                    <NotificationsNoneRoundedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography fontWeight={notif.read ? 500 : 700} variant="body1">
                        {notif.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        {notif.message && (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {notif.message}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.disabled">
                          {notif.createdAt ? new Date(notif.createdAt).toLocaleString("vi-VN") : ""}
                        </Typography>
                      </>
                    }
                  />
                  <Stack direction="column" alignItems="flex-end" spacing={1}>
                    {!notif.read && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markNotificationAsRead(notif._id);
                        }}
                      >
                        Đã đọc
                      </Button>
                    )}
                    <Button
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteNotification(notif._id);
                      }}
                    >
                      Xóa
                    </Button>
                  </Stack>
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
        <Divider sx={{ my: 1 }} />
        <Button
          fullWidth
          variant="outlined"
          onClick={() => {
            handleNotifMenuClose();
            navigate("/seller/notifications");
          }}
        >
          Xem tất cả
        </Button>
      </Menu>

      <NotificationDetail open={detailOpen} notification={selectedNotif} onClose={closeDetail} />
    </Box>
  );
}
