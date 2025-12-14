import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import RateReviewIcon from "@mui/icons-material/RateReview";
import ReplyIcon from "@mui/icons-material/Reply";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
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
  type SelectChangeEvent
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
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

  const reviewHighlights = useMemo(() => {
    const visibleReviews = response?.reviews ?? [];
    const pending = visibleReviews.filter((review) => !review.sellerReply).length;
    const replied = visibleReviews.length - pending;
    const average = visibleReviews.length
      ? Number((visibleReviews.reduce((sum, review) => sum + review.rating, 0) / visibleReviews.length).toFixed(1))
      : 0;
    const total = response?.total ?? visibleReviews.length;
    return { pending, replied, average, total };
  }, [response]);

  const highlightCards = [
    {
      label: "Điểm trung bình",
      value: reviewHighlights.average ? `${reviewHighlights.average}/5` : "—",
      icon: <StarRoundedIcon fontSize="small" />,
      accent: "#fde68a",
    },
    {
      label: "Đang chờ phản hồi",
      value: reviewHighlights.pending,
      icon: <PendingActionsRoundedIcon fontSize="small" />,
      accent: "#fca5a5",
    },
    {
      label: "Đã phản hồi",
      value: reviewHighlights.replied,
      icon: <ForumRoundedIcon fontSize="small" />,
      accent: "#bfdbfe",
    },
  ];

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
    <Box sx={{ minHeight: "100vh", py: 4, background: "radial-gradient(circle at 10% 20%, #172554 0%, #020617 90%)" }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 4,
              position: "relative",
              overflow: "hidden",
              color: "#f8fafc",
              background: "linear-gradient(120deg, #312e81, #1d4ed8)",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 20% 20%, rgba(244,63,94,0.35), transparent 55%)",
                opacity: 0.8,
              }}
            />
            <Stack spacing={3} position="relative" zIndex={1}>
              <Box>
                <Typography variant="overline" sx={{ letterSpacing: 2, color: "rgba(248,250,252,0.8)" }}>
                  Phản hồi khách hàng
                </Typography>
                <Typography variant="h4" fontWeight={800} mt={1}>
                  Quản lý đánh giá với một góc nhìn sáng rõ
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, maxWidth: 560, color: "rgba(248,250,252,0.85)" }}>
                  Nắm bắt cảm nhận khách hàng, ưu tiên phản hồi quan trọng và biến mỗi cuộc trò chuyện thành cơ hội xây dựng lòng tin.
                </Typography>
              </Box>
              <Chip
                label={reviewHighlights.total ? `${reviewHighlights.total} đánh giá đã ghi nhận` : "Chưa có đánh giá"}
                icon={<RateReviewIcon fontSize="small" />}
                sx={{
                  alignSelf: "flex-start",
                  px: 1,
                  fontWeight: 600,
                  background: "rgba(15,23,42,0.25)",
                  color: "#f8fafc",
                }}
              />
              <Grid container spacing={2}>
                {highlightCards.map((card) => (
                  <Grid item xs={12} sm={4} key={card.label}>
                    <Box
                      sx={{
                        borderRadius: 3,
                        border: "1px solid rgba(248,250,252,0.25)",
                        background: "rgba(15,23,42,0.25)",
                        p: 2.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          background: `${card.accent}30`,
                          color: card.accent,
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: "rgba(248,250,252,0.7)" }}>
                          {card.label}
                        </Typography>
                        <Typography variant="h5" fontWeight={700}>
                          {card.value}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              mb: 1,
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(148,163,184,0.35)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl sx={{ minWidth: 220 }} size="small">
                <InputLabel>Sản phẩm</InputLabel>
                <Select
                  value={filters.productId}
                  label="Sản phẩm"
                  onChange={handleSelectChange("productId")}
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
                <Select
                  value={filters.reply}
                  label="Trạng thái phản hồi"
                  onChange={handleSelectChange("reply")}
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
            <Box
              sx={{
                minHeight: "40vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 2,
                color: "#e2e8f0",
              }}
            >
              <CircularProgress size={56} sx={{ color: "#38bdf8" }} />
              <Typography>Đang tải danh sách đánh giá...</Typography>
            </Box>
          ) : response && response.reviews.length > 0 ? (
            <Stack spacing={3}>
              {response.reviews.map((review) => (
                <Paper
                  key={review._id}
                  elevation={0}
                  sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: 4,
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid rgba(15,23,42,0.08)",
                    background: "rgba(255,255,255,0.98)",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      background: "radial-gradient(circle at 0% 0%, rgba(14,165,233,0.1), transparent 60%)",
                    }}
                  />
                  <Stack spacing={2} position="relative" zIndex={1}>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      justifyContent="space-between"
                      alignItems={{ md: "center" }}
                    >
                      <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                        <Avatar src={review.userId?.avatar} alt={review.userId?.name} sx={{ width: 60, height: 60, fontSize: 24 }}>
                          {review.userId?.name?.charAt(0) ?? "U"}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={700} fontSize={18}>
                            {review.userId?.name || "Khách"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(review.createdAt).toLocaleString("vi-VN")}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 1,
                                py: 0.2,
                                borderRadius: 999,
                                background: "rgba(251,191,36,0.18)",
                                color: "#ca8a04",
                                fontWeight: 700,
                              }}
                            >
                              <StarRoundedIcon sx={{ fontSize: 18 }} />
                              {review.rating.toFixed(1)}
                            </Box>
                            <Rating value={review.rating} readOnly precision={0.5} size="small" />
                          </Stack>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                        <Chip
                          label={review.productId?.title || "Sản phẩm"}
                          icon={<RateReviewIcon fontSize="small" />}
                          sx={{ fontWeight: 600, borderRadius: 999 }}
                        />
                        <Chip
                          label={review.sellerReply ? "Đã phản hồi" : "Chưa phản hồi"}
                          icon={<ReplyIcon fontSize="small" />}
                          sx={{
                            fontWeight: 600,
                            borderRadius: 999,
                            background: review.sellerReply ? "rgba(34,197,94,0.15)" : "rgba(248,113,113,0.15)",
                            color: review.sellerReply ? "#15803d" : "#b91c1c",
                          }}
                        />
                      </Stack>
                    </Stack>

                    {review.title && (
                      <Typography variant="subtitle1" fontWeight={700} color="#0f172a">
                        {review.title}
                      </Typography>
                    )}

                    {review.comment && (
                      <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                        {review.comment}
                      </Typography>
                    )}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                      {review.sellerReply ? (
                        <Paper
                          elevation={0}
                          sx={{
                            flex: 1,
                            p: 2.5,
                            borderRadius: 3,
                            background: "linear-gradient(120deg, rgba(59,130,246,0.08), rgba(14,165,233,0.08))",
                            border: "1px solid rgba(59,130,246,0.15)",
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={700} color="#1d4ed8">
                            Phản hồi của shop
                          </Typography>
                          <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 0.75 }}>
                            {review.sellerReply}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {review.sellerReplyAt
                              ? `Cập nhật: ${new Date(review.sellerReplyAt).toLocaleString("vi-VN")}`
                              : ""}
                          </Typography>
                        </Paper>
                      ) : (
                        <Paper
                          elevation={0}
                          sx={{
                            flex: 1,
                            p: 2.5,
                            borderRadius: 3,
                            border: "1px dashed rgba(15,23,42,0.2)",
                            background: "rgba(148,163,184,0.1)",
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Chưa có phản hồi từ shop.
                          </Typography>
                        </Paper>
                      )}

                      <Button
                        variant="contained"
                        startIcon={<ReplyIcon />}
                        onClick={() => openReplyDialog(review)}
                        sx={{
                          minWidth: { xs: "100%", sm: 200 },
                          alignSelf: { xs: "stretch", sm: "center" },
                          textTransform: "none",
                          fontWeight: 600,
                          borderRadius: 3,
                          background: review.sellerReply
                            ? "rgba(37,99,235,0.1)"
                            : "linear-gradient(120deg, #2563eb, #0ea5e9)",
                          color: review.sellerReply ? "#1d4ed8" : "#fff",
                          border: review.sellerReply ? "1px solid rgba(37,99,235,0.3)" : "none",
                          boxShadow: review.sellerReply ? "none" : "0 18px 40px -28px rgba(37,99,235,1)",
                        }}
                      >
                        Phản hồi
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}

              {totalPages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                  <Pagination count={totalPages} color="primary" page={filters.page} onChange={handlePageChange} />
                </Box>
              )}
            </Stack>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderRadius: 4,
                border: "1px dashed rgba(148,163,184,0.5)",
                background: "rgba(15,23,42,0.6)",
                color: "#e2e8f0",
                backdropFilter: "blur(12px)",
              }}
            >
              <Typography variant="h5" fontWeight={700} mb={1}>
                Chưa có đánh giá nào phù hợp
              </Typography>
              <Typography variant="body2">
                Khi khách hàng đánh giá sản phẩm, bạn sẽ thấy mọi phản hồi tại đây.
              </Typography>
            </Paper>
          )}
        </Stack>
      </Container>

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
