import StorefrontIcon from "@mui/icons-material/Storefront";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const REVIEWS_PAGE_SIZE = 5;

interface Review {
  _id: string;
  userId: { _id: string; name: string; avatar?: string };
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  helpful: number;
  createdAt: string;
  sellerReply?: string;
  sellerReplyAt?: string;
}

interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ProductReviewsProps {
  productId: string;
  avgRating?: number;
  reviewCount?: number;
  shopName?: string;
}

export default function ProductReviews({ productId, avgRating = 0, reviewCount = 0, shopName }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("recent");
  const [filters, setFilters] = useState<{ rating: number | null; reply: "all" | "replied" | "unreplied"; mediaOnly: boolean }>({
    rating: null,
    reply: "all",
    mediaOnly: false,
  });
  const isFiltering = filters.rating !== null || filters.reply !== "all" || filters.mediaOnly;

  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page: 1, limit: 100, sort: "recent" };
        const { data } = await api.get<ReviewsResponse>(`/api/reviews/product/${productId}`, {
          params,
        });
        setReviews(data.reviews || []);
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    loadReviews();
  }, [productId]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (filters.rating !== null && review.rating !== filters.rating) return false;
      if (filters.reply === "replied" && !review.sellerReply) return false;
      if (filters.reply === "unreplied" && review.sellerReply) return false;
      if (filters.mediaOnly && !(review.images && review.images.length)) return false;
      return true;
    });
  }, [reviews, filters]);

  const sortedReviews = useMemo(() => {
    const cloned = [...filteredReviews];
    if (sort === "helpful") {
      cloned.sort((a, b) => {
        if ((b.helpful ?? 0) === (a.helpful ?? 0)) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return (b.helpful ?? 0) - (a.helpful ?? 0);
      });
    } else if (sort === "rating-high") {
      cloned.sort((a, b) => {
        if (b.rating === a.rating) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return b.rating - a.rating;
      });
    } else {
      cloned.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return cloned;
  }, [filteredReviews, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedReviews.length / REVIEWS_PAGE_SIZE));
  const paginatedReviews = useMemo(() => {
    const start = (page - 1) * REVIEWS_PAGE_SIZE;
    return sortedReviews.slice(start, start + REVIEWS_PAGE_SIZE);
  }, [sortedReviews, page]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const ratingFilters = useMemo(
    () => [
      { label: "Tất cả", value: null },
      { label: "5 sao", value: 5 },
      { label: "4 sao", value: 4 },
      { label: "3 sao", value: 3 },
      { label: "2 sao", value: 2 },
      { label: "1 sao", value: 1 },
    ],
    [],
  );

  const replyFilters = useMemo(
    () => [
      { label: "Tất cả phản hồi", value: "all" as const },
      { label: "Đã phản hồi", value: "replied" as const },
      { label: "Chưa phản hồi", value: "unreplied" as const },
    ],
    [],
  );

  const ratingStats = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const normalized = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
      counts[normalized] += 1;
    });
    return {
      counts,
      total: reviews.length,
    };
  }, [reviews]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading && reviews.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" fontWeight={700} mb={3}>
        📝 Đánh giá sản phẩm ({reviewCount})
      </Typography>

      {/* Rating Summary */}
      {(reviewCount > 0 || ratingStats.total > 0) && (
        <Card sx={{ mb: 3, background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)" }} elevation={0}>
          <CardContent>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box sx={{ textAlign: "center", minWidth: 140 }}>
                <Typography variant="h3" fontWeight={900} color="#667eea">
                  {avgRating.toFixed(1)}
                </Typography>
                <Rating value={Math.round(avgRating * 2) / 2} readOnly precision={0.5} size="large" />
                <Typography variant="caption" color="text.secondary">
                  {(ratingStats.total || reviewCount).toLocaleString("vi-VN")} đánh giá
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Stack spacing={1}>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <Box key={star} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="caption" sx={{ minWidth: 32 }}>
                        {star} ⭐
                      </Typography>
                      <Box sx={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 1, overflow: "hidden" }}>
                        <Box
                          sx={{
                            height: "100%",
                            width: ratingStats.total ? `${((ratingStats.counts[star as 1 | 2 | 3 | 4 | 5] / ratingStats.total) * 100).toFixed(1)}%` : "0%",
                            background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 48, textAlign: "right" }}>
                        {ratingStats.counts[star as 1 | 2 | 3 | 4 | 5]}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Sort & Filters */}
      {reviews.length > 0 && (
        <Stack spacing={1.5} mb={2}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {["recent", "helpful", "rating-high"].map((option) => (
              <Chip
                key={option}
                label={option === "recent" ? "Mới nhất" : option === "helpful" ? "Hữu ích" : "Cao nhất"}
                onClick={() => {
                  setSort(option);
                }}
                variant={sort === option ? "filled" : "outlined"}
                sx={{
                  background:
                    sort === option ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                  color: sort === option ? "#fff" : "inherit",
                }}
              />
            ))}
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap">
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {ratingFilters.map((option) => (
                <Chip
                  key={option.label}
                  label={option.label}
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, rating: option.value }));
                  }}
                  variant={filters.rating === option.value ? "filled" : "outlined"}
                  sx={{
                    background:
                      filters.rating === option.value ? "linear-gradient(135deg, #fb923c 0%, #f97316 100%)" : "transparent",
                    color: filters.rating === option.value ? "#fff" : "inherit",
                  }}
                />
              ))}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {replyFilters.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, reply: option.value }));
                  }}
                  variant={filters.reply === option.value ? "filled" : "outlined"}
                  sx={{
                    background:
                      filters.reply === option.value ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" : "transparent",
                    color: filters.reply === option.value ? "#fff" : "inherit",
                  }}
                />
              ))}

              <Chip
                label="Có hình ảnh"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, mediaOnly: !prev.mediaOnly }));
                }}
                variant={filters.mediaOnly ? "filled" : "outlined"}
                sx={{
                  background: filters.mediaOnly ? "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)" : "transparent",
                  color: filters.mediaOnly ? "#fff" : "inherit",
                }}
              />
            </Stack>
          </Stack>
        </Stack>
      )}

      {/* Reviews List */}
      {sortedReviews.length > 0 ? (
        <Stack spacing={2}>
          {paginatedReviews.map((review) => (
            <Card key={review._id} elevation={0} sx={{ border: "1px solid #eee" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "start", gap: 2, mb: 2 }}>
                  <Avatar src={review.userId.avatar} alt={review.userId.name} />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {review.userId.name}
                        </Typography>
                        <Rating value={review.rating} readOnly size="small" sx={{ mt: 0.5 }} />
                      </Box>
                      <Stack spacing={0.5} alignItems="flex-end">
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(review.createdAt)}
                        </Typography>
                        <Chip
                          size="small"
                          label={review.sellerReply ? "Đã phản hồi" : "Chưa phản hồi"}
                          color={review.sellerReply ? "success" : "default"}
                          variant={review.sellerReply ? "filled" : "outlined"}
                        />
                      </Stack>
                    </Box>

                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
                        Chi tiết đánh giá
                      </Typography>
                      {review.title && (
                        <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                          {review.title}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                        {review.comment}
                      </Typography>
                    </Box>

                    {review.images && review.images.length > 0 && (
                      <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                        {review.images.map((img, idx) => (
                          <Box
                            key={idx}
                            component="img"
                            src={img}
                            alt={`review-${idx}`}
                            sx={{
                              width: 60,
                              height: 60,
                              objectFit: "cover",
                              borderRadius: 1,
                              cursor: "pointer",
                            }}
                          />
                        ))}
                      </Box>
                    )}

                    {review.helpful > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        👍 {review.helpful} người thấy hữu ích
                      </Typography>
                    )}

                    {review.sellerReply && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          borderRadius: 2,
                          border: "1px solid #bae6fd",
                          backgroundColor: "#f0f9ff",
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <StorefrontIcon sx={{ color: "#0284c7", mt: 0.5 }} />
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography fontWeight={700}>{shopName ?? "Gian hàng"}</Typography>
                              <Chip size="small" label="Phản hồi" color="primary" />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(review.sellerReplyAt || review.createdAt)}
                            </Typography>
                            <Typography variant="body2" color="text.primary" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                              {review.sellerReply}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card elevation={0} sx={{ border: "1px solid #eee" }}>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              {isFiltering ? "Không có đánh giá phù hợp với bộ lọc đang chọn." : "Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!"}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {sortedReviews.length > REVIEWS_PAGE_SIZE && (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 1 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Chip
              key={p}
              label={p}
              onClick={() => setPage(p)}
              variant={page === p ? "filled" : "outlined"}
              sx={{
                background: page === p ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                color: page === p ? "#fff" : "inherit",
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
