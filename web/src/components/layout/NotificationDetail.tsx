import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "../../api/notificationService";

export default function NotificationDetail({
  open,
  notification,
  onClose,
}: {
  open: boolean;
  notification: NotificationItem | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  if (!notification) return null;

  const handleOpenLink = () => {
    if (notification.url) {
      // If url is internal, use navigate; otherwise open new tab
      try {
        const url = new URL(notification.url, window.location.origin);
        if (url.origin === window.location.origin) {
          navigate(url.pathname + url.search + url.hash);
        } else {
          window.open(notification.url, "_blank", "noopener");
        }
      } catch (e) {
        window.open(notification.url, "_blank", "noopener");
      }
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{notification.title}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {notification.message ? (
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {notification.message}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              (Không có nội dung chi tiết)
            </Typography>
          )}

          <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 2 }}>
            {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        {notification.url && (
          <Button onClick={handleOpenLink} color="primary">
            Mở
          </Button>
        )}
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
