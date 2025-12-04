import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "../../api/notificationService";
import { notificationService } from "../../api/notificationService";
import NotificationDetail from "../../components/layout/NotificationDetail";
import { useSocket } from "../../context/useSocket";

const EVENT_NAME = "sellerNotificationsChanged" as const;
type FilterValue = "all" | "unread" | "order" | "system";

const FILTERS: Array<{ label: string; value: FilterValue }> = [
  { label: "Tất cả", value: "all" },
  { label: "Chưa đọc", value: "unread" },
  { label: "Đơn hàng", value: "order" },
  { label: "Hệ thống", value: "system" },
];

const extractOrderId = (notif: NotificationItem): string | undefined => {
  if (notif.refId) return notif.refId;
  if (notif.message) {
    const match = notif.message.match(/[0-9a-fA-F]{24}/);
    if (match) return match[0];
  }
  return undefined;
};

export default function SellerNotifications() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const broadcastChange = (source: "page" | "layout" = "page") => {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { source } }));
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications();
      setItems(res || []);
    } catch (err) {
      console.error("Failed to load seller notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onNew = (notif: NotificationItem) => {
      setItems((prev) => [notif, ...prev]);
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: string }>).detail;
      if (detail?.source === "page") return;
      void load();
    };
    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      switch (filter) {
        case "unread":
          return !item.read;
        case "order":
          return item.type === "order";
        case "system":
          return item.type && item.type !== "order";
        default:
          return true;
      }
    });
  }, [filter, items]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setItems((prev) => prev.map((item) => (item._id === id ? { ...item, read: true } : item)));
      broadcastChange("page");
    } catch (err) {
      console.error("markNotificationAsRead failed", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
      broadcastChange("page");
    } catch (err) {
      console.error("deleteNotification failed", err);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      broadcastChange("page");
    } catch (err) {
      console.error("markAllRead failed", err);
    }
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
        const url = new URL(notif.url, window.location.origin);
        if (url.origin === window.location.origin) {
          navigate(url.pathname + url.search + url.hash);
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

  const openDetail = async (notif: NotificationItem) => {
    const navigated = await tryNavigate(notif);
    if (navigated) return;

    if (!notif.read) {
      await markNotificationAsRead(notif._id);
    }
    setSelected(notif);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelected(null);
  };

  const formatDate = (value?: string) => {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString("vi-VN", { hour12: false });
    } catch {
      return value;
    }
  };

  return (
    <Box sx={{ py: 4 }}>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} spacing={2} justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Trung tâm thông báo
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Theo dõi các cập nhật quan trọng từ hệ thống, khách hàng và đội ngũ vận hành.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshRoundedIcon />} variant="outlined" onClick={() => void load()}>
            Làm mới
          </Button>
          <Button startIcon={<MarkEmailReadRoundedIcon />} variant="contained" onClick={() => void markAllRead()}>
            Đánh dấu tất cả
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%" }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary">
              Tổng thông báo
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
              {items.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bao gồm tất cả thông báo hệ thống, đơn hàng và yêu cầu đặc biệt.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%", background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary">
              Chưa đọc
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
              {unreadCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ưu tiên xử lý các thông báo chưa đọc để tránh bỏ sót đơn hàng.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: "100%", background: "linear-gradient(135deg, #dbeafe, #bfdbfe)" }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary">
              Đơn hàng gần đây
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ mt: 1 }}>
              {items.filter((item) => item.type === "order").length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tự động ghi nhận thông báo khi khách đặt hàng hoặc cập nhật trạng thái.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
        {FILTERS.map((entry) => (
          <Chip
            key={entry.value}
            label={entry.label}
            color={filter === entry.value ? "primary" : "default"}
            variant={filter === entry.value ? "filled" : "outlined"}
            onClick={() => setFilter(entry.value)}
          />
        ))}
      </Stack>

      <Paper sx={{ borderRadius: 3, p: 2, minHeight: 320 }}>
        {loading ? (
          <Box sx={{ py: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <NotificationsActiveRoundedIcon sx={{ fontSize: 48, color: "primary.main", opacity: 0.8 }} />
            <Typography variant="body1" color="text.secondary">
              Đang tải thông báo...
            </Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <NotificationsActiveRoundedIcon sx={{ fontSize: 56, color: "text.disabled" }} />
            <Typography variant="h6" mt={2}>
              {filter === "unread" ? "Không còn thông báo mới" : "Chưa có thông báo phù hợp"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hệ thống sẽ gửi thông báo khi có cập nhật quan trọng.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {filtered.map((notif) => (
              <Paper
                key={notif._id}
                elevation={0}
                onClick={() => void openDetail(notif)}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  cursor: "pointer",
                  border: notif.read ? "1px solid rgba(15,23,42,0.08)" : "1px solid rgba(37,99,235,0.25)",
                  background: notif.read ? "white" : "linear-gradient(120deg, rgba(219,234,254,0.5), #fff)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "rgba(37,99,235,0.6)",
                    boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                  },
                }}
              >
                <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} spacing={2} justifyContent="space-between">
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      {!notif.read && <Chip label="Mới" color="primary" size="small" />}
                      {notif.type && notif.type !== "order" && (
                        <Chip label={notif.type} size="small" variant="outlined" />
                      )}
                    </Stack>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      {notif.title}
                    </Typography>
                    {notif.message && (
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                        {notif.message}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled" display="block" mt={1}>
                      {formatDate(notif.createdAt)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                    <Tooltip title="Đánh dấu đã đọc">
                      <span>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            void markNotificationAsRead(notif._id);
                          }}
                          disabled={notif.read}
                        >
                          <MarkEmailReadRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Xóa thông báo">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteNotification(notif._id);
                        }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <NotificationDetail open={detailOpen} notification={selected} onClose={closeDetail} />
    </Box>
  );
}
