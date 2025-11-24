import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { Box, Button, IconButton, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "../../api/notificationService";
import { notificationService } from "../../api/notificationService";
import NotificationDetail from "../../components/layout/NotificationDetail";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  // Removed unused loading state
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = async () => {
    try {
      const res = await notificationService.getNotifications();
      setItems(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const mark = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setItems((prev) => prev.map((p) => (p._id === id ? { ...p, read: true } : p)));
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setItems((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openDetail = async (n: NotificationItem) => {
    // Attempt to navigate directly if notification has a URL or references an order or admin info request
    const tryNavigate = async () => {
      if (n.url) {
        if (!n.read) {
          try {
            await notificationService.markAsRead(n._id);
            setItems((prev) => prev.map((p) => (p._id === n._id ? { ...p, read: true } : p)));
          } catch (err) {
            console.error(err);
          }
        }
        try {
          const url = new URL(n.url, window.location.origin);
          if (url.origin === window.location.origin) {
            navigate(url.pathname + url.search + url.hash);
          } else {
            window.open(n.url, "_blank", "noopener");
          }
        } catch {
          window.open(n.url, "_blank", "noopener");
        }
        return true;
      }

      if (n.type === "order") {
        const orderId = n.refId || (n.message ? (n.message.match(/[0-9a-fA-F]{24}/) || [null])[0] : null);
        if (orderId) {
          if (!n.read) {
            try {
              await notificationService.markAsRead(n._id);
              setItems((prev) => prev.map((p) => (p._id === n._id ? { ...p, read: true } : p)));
            } catch (err) {
              console.error(err);
            }
          }
          navigate(`/Order/${orderId}`);
          return true;
        }
      }

      if (n.type === "admin_request_info" && n.refId) {
        if (!n.read) {
          try {
            await notificationService.markAsRead(n._id);
            setItems((prev) => prev.map((p) => (p._id === n._id ? { ...p, read: true } : p)));
          } catch (err) {
            console.error(err);
          }
        }
        navigate(`/seller-info/${n.refId}`);
        return true;
      }

      return false;
    };

    const navigated = await tryNavigate();
    if (navigated) return;

    if (!n.read) {
      try {
        await notificationService.markAsRead(n._id);
        setItems((prev) => prev.map((p) => (p._id === n._id ? { ...p, read: true } : p)));
      } catch (err) {
        console.error(err);
      }
    }
    setSelected(n);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setSelected(null);
    setDetailOpen(false);
  };

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      setItems((prev) => prev.map((p) => ({ ...p, read: true })));
    } catch (err) {
      console.error("markAll failed", err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={800}>Thông báo</Typography>
        <Button startIcon={<MarkEmailReadIcon />} onClick={() => void markAll()}>
          Đánh dấu tất cả đã đọc
        </Button>
      </Box>

      <List>
        {items.map((n) => (
          <ListItem key={n._id} sx={{ bgcolor: n.read ? 'transparent' : 'rgba(0,0,0,0.03)', mb: 1, borderRadius: 1 }} onClick={() => void openDetail(n)}>
            <ListItemText
              primary={<Typography fontWeight={700}>{n.title}</Typography>}
              secondary={<>{n.message && <Typography variant="body2">{n.message}</Typography>}<Typography variant="caption" color="text.disabled">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</Typography></>}
            />
            <IconButton onClick={(e) => { e.stopPropagation(); void mark(n._id); }} title="Đánh dấu đã đọc">
              <MarkEmailReadIcon />
            </IconButton>
            <IconButton onClick={(e) => { e.stopPropagation(); void remove(n._id); }} title="Xóa">
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
      <NotificationDetail open={detailOpen} notification={selected} onClose={closeDetail} />
    </Box>
  );
}
