import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Rating,
    TextField,
    Typography,
} from "@mui/material";
import { useState } from "react";
import { toast } from "react-toastify";
import api from "../api/axios";

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  orderId: string;
  productTitle?: string;
  onSuccess?: () => void;
}

export default function ReviewModal({
  open,
  onClose,
  productId,
  orderId,
  productTitle = "Sản phẩm",
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number | null>(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!rating || rating === 0) {
      setError("Vui lòng chọn số sao");
      return;
    }

    if (!comment.trim()) {
      setError("Vui lòng nhập bình luận");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/api/reviews", {
        productId,
        orderId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });

      toast.success("✅ Cảm ơn bạn đã đánh giá sản phẩm!", {
        position: "top-center",
        autoClose: 2000,
      });

      setRating(0);
      setTitle("");
      setComment("");
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đánh giá thất bại";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setTitle("");
    setComment("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          fontWeight: 700,
        }}
      >
        Đánh giá "{productTitle}"
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Rating */}
        <Typography variant="subtitle2" fontWeight={700} mb={1}>
          Xếp hạng:
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Rating
            value={rating}
            onChange={(_, value) => {
              setRating(value);
              setError("");
            }}
            size="large"
            sx={{
              "& .MuiRating-iconFilled": {
                color: "#ffc107",
              },
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {rating ? `${rating} / 5 sao` : "Chưa chọn"}
          </Typography>
        </Box>

        {/* Title */}
        <TextField
          fullWidth
          label="Tiêu đề đánh giá (tùy chọn)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          variant="outlined"
          size="small"
          placeholder="vd: Sản phẩm tốt, giao hàng nhanh"
          sx={{ mb: 2 }}
        />

        {/* Comment */}
        <TextField
          fullWidth
          label="Bình luận"
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setError("");
          }}
          variant="outlined"
          multiline
          rows={4}
          placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
          required
        />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          {comment.length} / 500 ký tự
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined">
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !rating || rating === 0 || !comment.trim()}
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            minWidth: 120,
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Gửi đánh giá"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
