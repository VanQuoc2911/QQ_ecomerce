import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import LanguageIcon from "@mui/icons-material/Language";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StorefrontIcon from "@mui/icons-material/Storefront";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
    InputAdornment,
    MenuItem,
    Paper,
    Select,
    Skeleton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { productService, type ApiProduct } from "../../api/productService";
import { sellerService, type ShopInfo } from "../../api/sellerService";
import ShopChatPopup from "../../components/chat/ShopChatPopup";
import ProductCard from "../../components/user/ProductCard";
import { useAuth } from "../../context/AuthContext";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";
import { triggerReportModal } from "../../utils/reportModal";

const PAGE_SIZE = 12;
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

type ShopProductCard = ProductCardType & { categoriesAll: string[] };

export default function ShopPage() {
  const { shopId } = useParams<{ shopId?: string }>();
  const { user } = useAuth();
  const productsSectionRef = useRef<HTMLDivElement | null>(null);

  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "priceDesc" | "priceAsc" | "rating">("newest");
  const [chatOpen, setChatOpen] = useState(false);

  const handleScrollToProducts = () => {
    productsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleReportShop = () => {
    if (!user) {
      window.dispatchEvent(new Event("openLogin"));
      return;
    }
    const reporterRaw = (user as unknown as { _id?: unknown; id?: unknown })?._id ?? (user as unknown as { id?: unknown })?.id ?? null;
    const reporterId = typeof reporterRaw === "string" ? reporterRaw : typeof reporterRaw === "number" ? String(reporterRaw) : null;
    const sellerIdRaw = (shop as unknown as { ownerId?: unknown; owner?: { _id?: unknown } })?.ownerId ?? (shop as unknown as { owner?: { _id?: unknown } })?.owner?._id ?? null;
    const sellerId = typeof sellerIdRaw === "string" ? sellerIdRaw : typeof sellerIdRaw === "number" ? String(sellerIdRaw) : null;
    triggerReportModal({
      role: "seller",
      title: shop?.shopName ? `Báo cáo shop ${shop.shopName}` : "Báo cáo shop",
      category: "shop_issue",
      relatedType: "shop",
      relatedId: shopId ?? null,
      metadata: {
        shopId: shopId ?? null,
        sellerId,
        reporterId,
      },
    });
  };

  const fetchShopProfile = useCallback(async () => {
    if (!shopId) return;
    try {
      const res = await sellerService.getPublicShop(shopId);
      setShop(res.shop);
    } catch (err) {
      console.error("fetchShopProfile", err);
      setError("Không thể tải thông tin cửa hàng.");
    }
  }, [shopId]);

  const fetchShopProducts = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (!shopId) return;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const response = await productService.getProducts({ shopId, page: pageToLoad, limit: PAGE_SIZE });
        setTotalProducts(response.total ?? response.items.length ?? 0);
        setPage(response.page ?? pageToLoad);
        setProducts((prev) => {
          if (!append) return response.items;
          const existingIds = new Set(prev.map((p) => p._id));
          const merged = [...prev];
          response.items.forEach((item) => {
            if (!existingIds.has(item._id)) {
              merged.push(item);
            }
          });
          return merged;
        });
      } catch (err) {
        console.error("fetchShopProducts", err);
        setError("Không thể tải sản phẩm của cửa hàng.");
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [shopId]
  );

  useEffect(() => {
    setError(null);
    if (!shopId) return;
    fetchShopProfile();
    fetchShopProducts(1, false);
  }, [shopId, fetchShopProfile, fetchShopProducts]);

  const productCards = useMemo<ShopProductCard[]>(() => {
    return products.map((product) => {
      const shopField = product.shopId as
        | string
        | { _id?: string; shopName?: string; logo?: string };
      const resolvedShopId =
        (typeof shopField === "string" ? shopField : shopField?._id) ?? shopId ?? undefined;
      const resolvedShopName = typeof shopField === "object" ? shopField?.shopName : shop?.shopName;
      const resolvedShopLogo = typeof shopField === "object" ? shopField?.logo : shop?.logo;
      const categoriesAll = (product.categories ?? []).filter((item): item is string => Boolean(item && item.trim().length));

      return {
        id: product._id,
        name: product.title,
        price: product.price,
        images: product.images?.length ? product.images : ["https://via.placeholder.com/400x300?text=No+Image"],
        videos: product.videos,
        category: categoriesAll[0] ?? "Sản phẩm",
        description: product.description ?? product.title,
        stock: product.stock,
        rating: product.rating ?? 0,
        features: product.soldCount > 50 ? ["Hot"] : undefined,
        shopId: resolvedShopId,
        shopName: resolvedShopName ?? undefined,
        shopLogo: resolvedShopLogo ?? undefined,
        isFavorite: user?.favorites?.includes(product._id) ?? false,
        categoriesAll,
      };
    });
  }, [products, shopId, shop, user?.favorites]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((product) => {
      (product.categories ?? []).forEach((category) => {
        if (!category) return;
        map.set(category, (map.get(category) ?? 0) + 1);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    let list = productCards.filter((product) => {
      const matchKeyword = keyword
        ? product.name.toLowerCase().includes(keyword) || product.description.toLowerCase().includes(keyword)
        : true;
      const matchCategory = selectedCategory
        ? product.categoriesAll?.some((category) => category.toLowerCase() === selectedCategory.toLowerCase())
        : true;
      return matchKeyword && matchCategory;
    });

    list = [...list];
    switch (sortBy) {
      case "priceDesc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "priceAsc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "rating":
        list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      default:
        break; // newest already handled by API ordering
    }
    return list;
  }, [productCards, searchKeyword, selectedCategory, sortBy]);

  const stats = useMemo(() => {
    const total = totalProducts || products.length;
    const ratingPool = products
      .map((p) => p.rating)
      .filter((rating): rating is number => typeof rating === "number" && rating > 0);
    const avgRating = ratingPool.length
      ? ratingPool.reduce((sum, rating) => sum + rating, 0) / ratingPool.length
      : null;
    const cheapest = products.length ? Math.min(...products.map((p) => p.price)) : null;
    const newItems = products.filter((p) => {
      if (!p.createdAt) return false;
      const days = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;

    return [
      {
        label: "Sản phẩm đang bán",
        value: total.toString(),
        helper: "Đã được duyệt và hiển thị",
        icon: <StorefrontIcon fontSize="small" />,
      },
      {
        label: "Đánh giá trung bình",
        value: avgRating ? `${avgRating.toFixed(1)}/5` : "Chưa có",
        helper: ratingPool.length ? `${ratingPool.length} lượt đánh giá` : "Đang cập nhật",
        icon: <StarIcon fontSize="small" />,
      },
      {
        label: "Giá tốt nhất",
        value: cheapest ? formatCurrency(cheapest) : "Đang cập nhật",
        helper: "Sản phẩm giá thấp nhất",
        icon: <LocalShippingIcon fontSize="small" />,
      },
      {
        label: "Hàng mới 30 ngày",
        value: newItems.toString(),
        helper: "Bổ sung gần đây",
        icon: <StorefrontIcon fontSize="small" />,
      },
    ];
  }, [products, totalProducts]);

  const hasMore = products.length < totalProducts;

  const handleAskShop = () => {
    if (!user) {
      window.dispatchEvent(new Event("openLogin"));
      return;
    }
    if (!shop?.ownerId) {
      toast.info("Shop chưa sẵn sàng nhận tin nhắn.");
      return;
    }
    setChatOpen(true);
  };

  if (!shopId) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="error">Thiếu mã cửa hàng.</Alert>
      </Container>
    );
  }

  if (loading && !shop) {
    return (
      <Container sx={{ py: 6 }}>
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4 }} />
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
        </Stack>
      </Container>
    );
  }

  return (
    <Box sx={{ background: "#f5f7fb", minHeight: "100vh", py: 6 }}>
      <Container maxWidth="lg">
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: 5,
            p: { xs: 3, md: 5 },
            color: "#fff",
            background: "linear-gradient(135deg, #1e3c72 0%, #7e22ce 100%)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Box sx={{ position: "absolute", inset: 0, opacity: 0.2, backgroundImage: "radial-gradient(circle at top left, rgba(255,255,255,0.4), transparent 45%)" }} />
          <Grid container spacing={4} sx={{ position: "relative", zIndex: 1 }}>
            <Grid item xs={12} md={7}>
              <Stack direction="row" spacing={3} alignItems="center" mb={3}>
                <Avatar src={shop?.logo} sx={{ width: 96, height: 96, border: "3px solid rgba(255,255,255,0.4)" }} />
                <Box>
                  <Typography variant="h3" fontWeight={800} gutterBottom>
                    {shop?.shopName ?? "Cửa hàng"}
                  </Typography>
                  <Typography variant="body1" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <LocationOnIcon fontSize="small" /> {shop?.address ?? "Đang cập nhật địa chỉ"}
                  </Typography>
                  <Typography variant="body1" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PhoneIcon fontSize="small" /> {shop?.phone ?? "Đang cập nhật liên hệ"}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleScrollToProducts}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Xem sản phẩm
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<ChatBubbleOutlineIcon />}
                  sx={{ borderColor: "rgba(255,255,255,0.5)", color: "#fff", textTransform: "none" }}
                  onClick={handleAskShop}
                >
                  Hỏi shop
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<ReportProblemIcon />}
                  sx={{ textTransform: "none", borderColor: "rgba(253,186,116,0.7)", color: "#fed7aa" }}
                  onClick={handleReportShop}
                >
                  Báo cáo shop
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Grid container spacing={2}>
                {stats.map((stat) => (
                  <Grid item xs={6} key={stat.label}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        backgroundColor: "rgba(255,255,255,0.12)",
                        minHeight: 120,
                      }}
                    >
                      <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 1, opacity: 0.9 }}>
                        {stat.icon}
                        {stat.label}
                      </Typography>
                      <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        {stat.helper}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Thông tin liên hệ
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: "#e6e9f5", color: "#1e3c72" }}>
                    <StorefrontIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Tên cửa hàng
                    </Typography>
                    <Typography fontWeight={700}>{shop?.shopName ?? "Chưa cập nhật"}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: "#ffeceb", color: "#d93025" }}>
                    <LocationOnIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Địa chỉ
                    </Typography>
                    <Typography fontWeight={600}>{shop?.address ?? "Đang cập nhật"}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: "#e8f5e9", color: "#1b5e20" }}>
                    <PhoneIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Số điện thoại
                    </Typography>
                    <Typography fontWeight={600}>{shop?.phone ?? "Đang cập nhật"}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: "#e3f2fd", color: "#1565c0" }}>
                    <LanguageIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Website
                    </Typography>
                    {shop?.website ? (
                      <Button
                        href={shop.website}
                        target="_blank"
                        rel="noreferrer"
                        sx={{ textTransform: "none", p: 0 }}
                      >
                        {shop.website.replace(/^https?:\/\//, "")}
                      </Button>
                    ) : (
                      <Typography fontWeight={600}>Đang cập nhật</Typography>
                    )}
                  </Box>
                </Stack>
              </Stack>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Danh mục nổi bật
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {categoryStats.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Cửa hàng chưa cập nhật danh mục.
                  </Typography>
                )}
                {categoryStats.map(([category, count]) => (
                  <Chip
                    key={category}
                    label={`${category} (${count})`}
                    color={selectedCategory === category ? "primary" : "default"}
                    variant={selectedCategory === category ? "filled" : "outlined"}
                    onClick={() =>
                      setSelectedCategory((prev) => (prev === category ? null : category))
                    }
                    sx={{ borderRadius: 999 }}
                  />
                ))}
                {selectedCategory && (
                  <Button
                    size="small"
                    sx={{ textTransform: "none" }}
                    onClick={() => setSelectedCategory(null)}
                  >
                    Bỏ lọc
                  </Button>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, mb: 3 }} ref={productsSectionRef}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center" justifyContent="space-between" mb={3}>
                <TextField
                  fullWidth
                  placeholder="Tìm theo tên sản phẩm, mô tả..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  size="small"
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="newest">Mới nhất</MenuItem>
                  <MenuItem value="priceDesc">Giá cao → thấp</MenuItem>
                  <MenuItem value="priceAsc">Giá thấp → cao</MenuItem>
                  <MenuItem value="rating">Đánh giá cao</MenuItem>
                </Select>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              {loading && !products.length ? (
                <Stack spacing={2}>
                  {[...Array(3)].map((_, idx) => (
                    <Skeleton key={idx} variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
                  ))}
                </Stack>
              ) : filteredProducts.length ? (
                <>
                  <Grid container spacing={3}>
                    {filteredProducts.map((product) => (
                      <Grid item xs={12} sm={6} key={product.id}>
                        <ProductCard product={product} />
                      </Grid>
                    ))}
                  </Grid>

                  {(hasMore || loadingMore) && (
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                      <Button
                        variant="outlined"
                        onClick={() => fetchShopProducts(page + 1, true)}
                        disabled={loadingMore}
                        sx={{ minWidth: 220, textTransform: "none" }}
                      >
                        {loadingMore ? <CircularProgress size={20} /> : "Tải thêm sản phẩm"}
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="h6" gutterBottom>
                    Chưa có sản phẩm phù hợp
                  </Typography>
                  <Typography color="text.secondary">
                    Thử điều chỉnh bộ lọc hoặc tìm kiếm khác.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <ShopChatPopup open={chatOpen} onClose={() => setChatOpen(false)} shop={shop} />
    </Box>
  );
}
