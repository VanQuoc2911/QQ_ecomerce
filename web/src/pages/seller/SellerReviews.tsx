import RateReviewIcon from "@mui/icons-material/RateReview";
import ReplyIcon from "@mui/icons-material/Reply";
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Rating,
    Select,
    Stack,
    TextField,
    Typography,
    type SelectChangeEvent,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { sellerService, type SellerReview, type SellerReviewProduct, type SellerReviewResponse } from "../../api/sellerService";

interface Filters {
  productId: string;
  reply: "all" | "have" | "none";
  page: number;
}

const INITIAL_FILTERS: Filters = {
  productId: "all",
  reply: "all",
  page: 1,
};

const PAGE_LIMIT = 6;

export default function SellerReviews() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [response, setResponse] = useState<SellerReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; reviewId: string; content: string }>({ open: false, reviewId: "", content: "" });
  const [submittingReply, setSubmittingReply] = useState(false);

  const productOptions = useMemo(() => {
    const list: SellerReviewProduct[] = response?.products || [];
    return list;
  }, [response?.products]);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page: filters.page, limit: PAGE_LIMIT };
        if (filters.productId !== "all") params.productId = filters.productId;
        if (filters.reply === "have") params.hasReply = "true";
        else if (filters.reply === "none") params.hasReply = "false";

        const data = await sellerService.getReviews(params);
        setResponse(data);
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải danh sách đánh giá.");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [filters]);

  const handleSelectChange = (field: keyof Filters) => (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, [field]: value, page: 1 }));
  };

  const handlePageChange = (_: unknown, page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const openReplyDialog = (review: SellerReview) => {
    setReplyDialog({ open: true, reviewId: review._id, content: review.sellerReply || "" });
  };

  const closeReplyDialog = () => {
    if (submittingReply) return;
    setReplyDialog({ open: false, reviewId: "", content: "" });
  };

  const handleSubmitReply = async () => {
    if (!replyDialog.reviewId || !replyDialog.content.trim()) {
      toast.warning("Vui lòng nhập nội dung phản hồi");
      return;
    }
    setSubmittingReply(true);
    try {
      const updated = await sellerService.replyReview(replyDialog.reviewId, replyDialog.content.trim());
      setResponse((prev) =>
        prev
          ? {
              ...prev,
              reviews: prev.reviews.map((review) => (review._id === updated._id ? updated : review)),
            }
          : prev
      );
      toast.success("Đã phản hồi đánh giá");
      closeReplyDialog();
    } catch (err) {
      console.error(err);
      toast.error("Phản hồi thất bại. Vui lòng thử lại");
    } finally {
      setSubmittingReply(false);
    }
  };

  const totalPages = response ? Math.max(1, Math.ceil(response.total / response.limit)) : 1;

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Đánh giá sản phẩm
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Theo dõi phản hồi của khách hàng và trả lời ngay khi cần.
      </Typography>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 4 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <FormControl sx={{ minWidth: 220 }} size="small">
            <InputLabel>Sản phẩm</InputLabel>
            <Select value={filters.productId} label="Sản phẩm" onChange={handleSelectChange("productId")}
              MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
            >
              <MenuItem value="all">Tất cả sản phẩm</MenuItem>
              {productOptions.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Trạng thái phản hồi</InputLabel>
            <Select value={filters.reply} label="Trạng thái phản hồi" onChange={handleSelectChange("reply")}
              MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
            >
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="none">Chưa phản hồi</MenuItem>
              <MenuItem value="have">Đã phản hồi</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress size={50} />
        </Box>
      ) : response && response.reviews.length > 0 ? (
        <Stack spacing={3}>
          {response.reviews.map((review) => (
            <Paper key={review._id} sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                <Stack direction="row" spacing={2} flex={1}>
                  <Avatar src={review.userId?.avatar} alt={review.userId?.name} sx={{ width: 56, height: 56 }}>
                    {review.userId?.name?.charAt(0) ?? "U"}
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>{review.userId?.name || "Khách"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(review.createdAt).toLocaleString("vi-VN")}
                    </Typography>
                    <Rating value={review.rating} readOnly precision={0.5} size="small" sx={{ mt: 0.5 }} />
                  </Box>
                </Stack>

                <Chip
                  label={review.productId?.title || "Sản phẩm"}
                  icon={<RateReviewIcon fontSize="small" />}
                  sx={{ fontWeight: 600 }}
                />
              </Stack>

              {review.title && (
                <Typography variant="subtitle1" fontWeight={700} mt={2}>
                  {review.title}
                </Typography>
              )}

              {review.comment && (
                <Typography variant="body1" color="text.secondary" mt={1} sx={{ whiteSpace: "pre-line" }}>
                  {review.comment}
                </Typography>
              )}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3} alignItems="flex-start">
                {review.sellerReply ? (
                  <Paper sx={{ p: 2, borderLeft: "4px solid #667eea", flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="primary">
                      Phản hồi của shop
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 0.5 }}>
                      {review.sellerReply}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {review.sellerReplyAt ? `Cập nhật: ${new Date(review.sellerReplyAt).toLocaleString("vi-VN")}` : ""}
                    </Typography>
                  </Paper>
                ) : (
                  <Paper sx={{ p: 2, flex: 1, border: "1px dashed #9ca3af" }}>
                    <Typography variant="body2" color="text.secondary">
                      Chưa có phản hồi từ shop.
                    </Typography>
                  </Paper>
                )}

                <Button
                  variant={review.sellerReply ? "outlined" : "contained"}
                  startIcon={<ReplyIcon />}
                  onClick={() => openReplyDialog(review)}
                  sx={{ minWidth: 180, alignSelf: { xs: "stretch", sm: "center" } }}
                >
                  {review.sellerReply ? "Cập nhật phản hồi" : "Phản hồi"}
                </Button>
              </Stack>
            </Paper>
          ))}

          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Pagination count={totalPages} color="primary" page={filters.page} onChange={handlePageChange} />
            </Box>
          )}
        </Stack>
      ) : (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Chưa có đánh giá nào phù hợp.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Khi khách hàng đánh giá sản phẩm, bạn sẽ thấy chúng tại đây.
          </Typography>
        </Paper>
      )}

      <Dialog open={replyDialog.open} onClose={closeReplyDialog} fullWidth maxWidth="sm">
        <DialogTitle>Phản hồi đánh giá</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            minRows={4}
            fullWidth
            autoFocus
            placeholder="Nhập phản hồi cho khách hàng..."
            value={replyDialog.content}
            onChange={(e) => setReplyDialog((prev) => ({ ...prev, content: e.target.value }))}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReplyDialog} disabled={submittingReply}>
            Hủy
          </Button>
          <Button variant="contained" onClick={handleSubmitReply} disabled={submittingReply}>
            {submittingReply ? "Đang gửi..." : "Gửi phản hồi"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
