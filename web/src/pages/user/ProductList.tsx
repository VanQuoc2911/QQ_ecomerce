import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BoltIcon from "@mui/icons-material/Bolt";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  InputAdornment,
  LinearProgress,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { productService, type ApiProduct, type ProductResponse } from "../../api/productService";
import ProductCard from "../../components/user/ProductCard";
import { useAuth } from "../../context/AuthContext";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

type InsightTab = "overview" | "inventory" | "engagement";
type CollectionPreset = "all" | "fashion-premium" | "tech-pro" | "budget-friendly";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    Math.max(0, value),
  );

const formatNumber = (value: number): string => new Intl.NumberFormat("vi-VN").format(Math.max(0, value));

const quickFilterLabel = (id: string): string => {
  switch (id) {
    case "under500":
      return "Giá < 500K";
    case "fashion":
      return "Thời trang hot";
    case "rating4":
      return "Đánh giá 4⭐+";
    case "priceAsc":
      return "Giá tăng dần";
    default:
      return "Bộ lọc nhanh";
  }
};

const FALLBACK_IMAGE = "https://via.placeholder.com/600x600?text=Product";

export default function ProductList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [productResponse, setProductResponse] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [insightTab, setInsightTab] = useState<InsightTab>("overview");
  const [activeCollection, setActiveCollection] = useState<CollectionPreset>("all");

  const [pendingSearch, setPendingSearch] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState<number | null>(null);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState<number | null>(null);

  const [provinces, setProvinces] = useState<string[]>([]);
  const [origins, setOrigins] = useState<string[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingOrigins, setLoadingOrigins] = useState(true);

  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});

  const categories = ["Điện tử", "Thời trang", "Sách", "Đồ gia dụng", "Khác"];
  const collectionLabels = useMemo<Record<CollectionPreset, string>>(
    () => ({
      all: "Mặc định",
      "fashion-premium": "Thời trang",
      "tech-pro": "Công nghệ",
      "budget-friendly": "Giá tốt",
    }),
    [],
  );

  const products: ApiProduct[] = useMemo(() => productResponse?.items ?? [], [productResponse?.items]);
  const totalProducts = productResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalProducts / 12));
  const highRatedCount = useMemo(() => products.filter((item) => (item.rating ?? 0) >= 4).length, [products]);
  const inventoryReadyCount = useMemo(() => products.filter((item) => item.stock > 0).length, [products]);
  const limitedStockCount = useMemo(() => products.filter((item) => item.stock > 0 && item.stock <= 5).length, [products]);
  const soldOutCount = useMemo(() => products.filter((item) => item.stock === 0).length, [products]);
  const averagePrice = useMemo(() => {
    if (!products.length) return 0;
    const total = products.reduce((sum, item) => sum + (item.price ?? 0), 0);
    return total / products.length;
  }, [products]);

  const heroStats = useMemo(
    () => [
      { icon: <TrendingUpIcon />, label: "Sản phẩm đang có", value: formatNumber(totalProducts), caption: "toàn hệ thống" },
      { icon: <StorefrontIcon />, label: "Đang hiển thị", value: formatNumber(products.length), caption: "trong trang này" },
      { icon: <StarIcon />, label: "Đánh giá 4⭐+", value: `${formatNumber(highRatedCount)}+`, caption: "nổi bật tuần này" },
    ],
    [highRatedCount, products.length, totalProducts],
  );

  const activeQuickFilterLabel = activeQuickFilter ? quickFilterLabel(activeQuickFilter) : "Không dùng";

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string }> = [];
    if (searchKeyword) chips.push({ key: "search", label: `Từ khóa: "${searchKeyword}"` });
    if (selectedCategory) chips.push({ key: "category", label: `Danh mục: ${selectedCategory}` });
    if (selectedProvince) chips.push({ key: "province", label: `Khu vực: ${selectedProvince}` });
    if (selectedOrigin) chips.push({ key: "origin", label: `Xuất xứ: ${selectedOrigin}` });
    if (selectedRating) chips.push({ key: "rating", label: `Đánh giá từ ${selectedRating}⭐` });
    if (appliedMinPrice !== null || appliedMaxPrice !== null) {
      const fromLabel = appliedMinPrice !== null ? formatCurrency(appliedMinPrice) : "0₫";
      const toLabel = appliedMaxPrice !== null ? formatCurrency(appliedMaxPrice) : "Không giới hạn";
      chips.push({ key: "price", label: `Giá ${fromLabel} - ${toLabel}` });
    }
    return chips;
  }, [appliedMaxPrice, appliedMinPrice, searchKeyword, selectedCategory, selectedOrigin, selectedProvince, selectedRating]);

  const quickFilterOptions = useMemo(
    () => [
      {
        id: "under500",
        label: "Giá < 500K",
        action: () => {
          setMinPriceInput("0");
          setMaxPriceInput("500000");
          setAppliedMinPrice(0);
          setAppliedMaxPrice(500000);
          setCurrentPage(1);
        },
      },
      {
        id: "fashion",
        label: "Thời trang hot",
        action: () => {
          setSelectedCategory("Thời trang");
          setCurrentPage(1);
        },
      },
      {
        id: "rating4",
        label: "Đánh giá 4⭐+",
        action: () => {
          setSelectedRating(4);
          setCurrentPage(1);
        },
      },
      {
        id: "priceAsc",
        label: "Giá tăng dần",
        action: () => {
          setSortBy("price-asc");
          setCurrentPage(1);
        },
      },
    ],
    [],
  );

  const collectionPresets = useMemo(
    () => [
      {
        id: "all" as CollectionPreset,
        title: "Khám phá đầy đủ",
        subtitle: "Giữ nguyên bộ lọc hiện có",
        icon: <AutoAwesomeIcon />,
        gradient: "linear-gradient(135deg, #e0f2fe 0%, #ede9fe 100%)",
      },
      {
        id: "fashion-premium" as CollectionPreset,
        title: "Thời trang nâng cấp",
        subtitle: "Sản phẩm ưa chuộng từ 300K",
        icon: <LocalOfferIcon />,
        gradient: "linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%)",
      },
      {
        id: "tech-pro" as CollectionPreset,
        title: "Gian hàng công nghệ",
        subtitle: "Điện tử rating 4⭐+",
        icon: <BoltIcon />,
        gradient: "linear-gradient(135deg, #cffafe 0%, #dbeafe 100%)",
      },
      {
        id: "budget-friendly" as CollectionPreset,
        title: "Giá tốt mỗi ngày",
        subtitle: "Giới hạn 300K, giao nhanh",
        icon: <NewReleasesIcon />,
        gradient: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
      },
    ],
    [],
  );

  const insightConfigs = useMemo(() => {
    const avgPriceLabel = averagePrice ? formatCurrency(Math.round(averagePrice)) : "Đang cập nhật";
    const displayedPercent = totalProducts ? Math.min(100, (products.length / totalProducts) * 100) : 0;
    const readyPercent = products.length ? Math.min(100, (inventoryReadyCount / products.length) * 100) : 0;
    const engagementPercent = products.length ? Math.min(100, (highRatedCount / products.length) * 100) : 0;
    return {
      overview: {
        title: "Tổng quan hiển thị",
        subtitle: "Theo dõi realtime lượng sản phẩm và chất lượng đánh giá.",
        progress: displayedPercent,
        progressLabel: `${formatNumber(products.length)} / ${formatNumber(totalProducts)} sản phẩm khả dụng`,
        metrics: [
          { label: "Đang hiển thị", value: formatNumber(products.length) },
          { label: "Đánh giá 4⭐+", value: formatNumber(highRatedCount) },
          { label: "Giá trung bình", value: avgPriceLabel },
        ],
      },
      inventory: {
        title: "Tình trạng tồn kho",
        subtitle: "Ưu tiên sản phẩm còn hàng và cảnh báo sắp hết.",
        progress: readyPercent,
        progressLabel: `${formatNumber(inventoryReadyCount)} sản phẩm sẵn kho`,
        metrics: [
          { label: "Sắp hết hàng", value: formatNumber(limitedStockCount) },
          { label: "Đã hết", value: formatNumber(soldOutCount) },
          { label: "Preset đang chọn", value: collectionLabels[activeCollection] },
        ],
      },
      engagement: {
        title: "Độ hấp dẫn",
        subtitle: "Bộ lọc gợi ý AI và sản phẩm nổi bật.",
        progress: engagementPercent,
        progressLabel: `${formatNumber(highRatedCount)} sản phẩm được yêu thích`,
        metrics: [
          { label: "Preset", value: collectionLabels[activeCollection] },
          { label: "Quick filter", value: activeQuickFilterLabel },
          { label: "Giá trung bình", value: avgPriceLabel },
        ],
      },
    } satisfies Record<InsightTab, { title: string; subtitle: string; progress: number; progressLabel: string; metrics: Array<{ label: string; value: string }> }>;
  }, [activeCollection, activeQuickFilterLabel, averagePrice, collectionLabels, highRatedCount, inventoryReadyCount, limitedStockCount, products.length, soldOutCount, totalProducts]);

  const activeInsight = insightConfigs[insightTab];

  const fetchProvinces = useCallback(async () => {
    try {
      const response = await productService.getProducts({ limit: 1000 });
      const unique = new Set<string>();
      response.items?.forEach((product) => {
        const shop = product.shopId as unknown as { province?: string };
        if (shop?.province) unique.add(shop.province);
      });
      setProvinces(Array.from(unique).sort());
    } catch (err) {
      console.error("Error fetching provinces:", err);
    } finally {
      setLoadingProvinces(false);
    }
  }, []);

  const fetchOrigins = useCallback(async () => {
    try {
      const response = await productService.getProducts({ limit: 1000 });
      const unique = new Set<string>();
      response.items?.forEach((product) => {
        if (product.origin) unique.add(product.origin);
      });
      setOrigins(Array.from(unique).sort());
    } catch (err) {
      console.error("Error fetching origins:", err);
    } finally {
      setLoadingOrigins(false);
    }
  }, []);

  useEffect(() => {
    void fetchProvinces();
    void fetchOrigins();
  }, [fetchOrigins, fetchProvinces]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get("q")?.trim() ?? "";
    setPendingSearch(qParam);
    setSearchKeyword(qParam);
    setCurrentPage(1);
  }, [location.search]);

  const syncSearchParam = useCallback(
    (value: string) => {
      const params = new URLSearchParams(location.search);
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
    },
    [location.pathname, location.search, navigate],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          page: currentPage,
          limit: 12,
          status: "approved",
        };
        if (selectedCategory) params.category = selectedCategory;
        if (selectedProvince) params.province = selectedProvince;
        if (selectedOrigin) params.origin = selectedOrigin;
        if (selectedRating) params.minRating = selectedRating;
        if (appliedMinPrice !== null) params.minPrice = appliedMinPrice;
        if (appliedMaxPrice !== null) params.maxPrice = appliedMaxPrice;
        if (searchKeyword.trim()) params.q = searchKeyword.trim();

        const response = await productService.getProducts(params);
        let items = response.items ?? [];
        if (sortBy === "price-asc") items = [...items].sort((a, b) => a.price - b.price);
        else if (sortBy === "price-desc") items = [...items].sort((a, b) => b.price - a.price);

        if (!cancelled) setProductResponse({ ...response, items });
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Lỗi khi tải sản phẩm");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [appliedMaxPrice, appliedMinPrice, currentPage, searchKeyword, selectedCategory, selectedOrigin, selectedProvince, selectedRating, sortBy]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = pendingSearch.trim();
    setSearchKeyword(trimmed);
    setCurrentPage(1);
    syncSearchParam(trimmed);
  };

  const handleQuickFilterClick = (id: string) => {
    const option = quickFilterOptions.find((filter) => filter.id === id);
    if (!option) return;
    option.action();
    setActiveQuickFilter(id);
    setActiveCollection("all");
  };

  const handlePricePreset = (min: number | null, max: number | null) => {
    setMinPriceInput(min?.toString() ?? "");
    setMaxPriceInput(max?.toString() ?? "");
    setAppliedMinPrice(min);
    setAppliedMaxPrice(max);
    setCurrentPage(1);
  };

  const parsePriceValue = (value: string): number | null => {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleApplyPrice = () => {
    setAppliedMinPrice(parsePriceValue(minPriceInput));
    setAppliedMaxPrice(parsePriceValue(maxPriceInput));
    setCurrentPage(1);
  };

  const handleResetPrice = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    setAppliedMinPrice(null);
    setAppliedMaxPrice(null);
    setCurrentPage(1);
  };

  const handleFavoriteToggle = (productId: string, isFavorite: boolean) => {
    setFavoriteOverrides((prev) => ({ ...prev, [productId]: isFavorite }));
  };

  const handleCollectionPreset = (preset: CollectionPreset) => {
    setActiveCollection(preset);
    setCurrentPage(1);
    setActiveQuickFilter(null);
    switch (preset) {
      case "fashion-premium":
        setSelectedCategory("Thời trang");
        setSelectedRating(4);
        handlePricePreset(300000, null);
        break;
      case "tech-pro":
        setSelectedCategory("Điện tử");
        setSelectedRating(4);
        handlePricePreset(500000, null);
        break;
      case "budget-friendly":
        setSelectedCategory(null);
        setSelectedRating(null);
        handlePricePreset(null, 300000);
        break;
      default:
        setSelectedCategory(null);
        setSelectedRating(null);
        handlePricePreset(null, null);
        break;
    }
  };

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    setSortBy(event.target.value as "newest" | "price-asc" | "price-desc");
  };

  const handleViewModeChange = (
    _event: MouseEvent<HTMLElement>,
    nextView: "grid" | "list" | null,
  ) => {
    if (nextView) setViewMode(nextView);
  };

  const handleRatingChange = (_event: MouseEvent<HTMLElement>, value: number | null) => {
    // use 0 to represent "Tất cả" in the ToggleButton values; convert back to null for state
    setSelectedRating(value === 0 ? null : value);
    setCurrentPage(1);
  };

  const handleFilterChipDelete = (key: string) => {
    switch (key) {
      case "search":
        setSearchKeyword("");
        setPendingSearch("");
        syncSearchParam("");
        break;
      case "category":
        setSelectedCategory(null);
        break;
      case "province":
        setSelectedProvince(null);
        break;
      case "origin":
        setSelectedOrigin(null);
        break;
      case "rating":
        setSelectedRating(null);
        break;
      case "price":
        handleResetPrice();
        break;
      default:
        break;
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedProvince(null);
    setSelectedOrigin(null);
    setSelectedRating(null);
    handlePricePreset(null, null);
    setActiveQuickFilter(null);
    setActiveCollection("all");
    setSearchKeyword("");
    setPendingSearch("");
    syncSearchParam("");
    setCurrentPage(1);
  };

  const priceShortcuts = [
    { label: "≤ 300K", min: null, max: 300000 },
    { label: "300K - 1M", min: 300000, max: 1000000 },
    { label: "1M - 3M", min: 1000000, max: 3000000 },
  ];

  const handlePriceInputChange = (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = event.target.value.replace(/[^0-9]/g, "");
    setter(digitsOnly);
  };

  const mapApiProductToCard = useCallback(
    (product: ApiProduct): ProductCardType => {
      const shop = (typeof product.shopId === "object" ? product.shopId : undefined) as
        | { _id?: string; shopName?: string; logo?: string }
        | undefined;
      const derivedFavorite = favoriteOverrides[product._id] ?? (user?.favorites?.includes(product._id) ?? false);
      return {
        id: product._id,
        name: product.title,
        price: product.price,
        category: product.categories?.[0] ?? "Khác",
        description: product.description ?? "",
        rating: product.rating,
        stock: product.stock,
        images: product.images?.length ? product.images : [FALLBACK_IMAGE],
        videos: product.videos,
        shopId: shop?._id ?? (typeof product.shopId === "string" ? product.shopId : undefined),
        shopName: shop?.shopName,
        shopLogo: shop?.logo,
        isFavorite: derivedFavorite,
      };
    },
    [favoriteOverrides, user?.favorites],
  );

  const productCards = useMemo(() => products.map(mapApiProductToCard), [mapApiProductToCard, products]);

  const ratingOptions = [5, 4, 3];

  const renderActiveFilters = () => {
    if (!activeFilters.length && !activeQuickFilter) return null;
    return (
      <Paper sx={{ p: 2, borderRadius: 3 }} elevation={0}>
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          {activeFilters.map((chip) => (
            <Chip key={chip.key} label={chip.label} onDelete={() => handleFilterChipDelete(chip.key)} />
          ))}
          {activeQuickFilter && (
            <Chip
              color="secondary"
              variant="outlined"
              icon={<BoltIcon fontSize="small" />}
              label={`Nhanh: ${quickFilterLabel(activeQuickFilter)}`}
              onDelete={() => setActiveQuickFilter(null)}
            />
          )}
          <Button size="small" onClick={handleClearFilters} sx={{ ml: "auto" }}>
            Xóa tất cả
          </Button>
        </Stack>
      </Paper>
    );
  };

  const renderProductsContent = () => {
    if (loading) {
      return (
        <Grid container spacing={3}>
          {Array.from({ length: viewMode === "grid" ? 6 : 3 }).map((_, index) => (
            <Grid item xs={12} sm={viewMode === "grid" ? 6 : 12} md={viewMode === "grid" ? 4 : 12} key={`skeleton-${index}`}>
              <Skeleton variant="rounded" height={360} sx={{ borderRadius: 4 }} />
            </Grid>
          ))}
        </Grid>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          {error}
        </Alert>
      );
    }

    if (!productCards.length) {
      return (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 4 }} elevation={0}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Chưa có sản phẩm phù hợp
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Hãy điều chỉnh bộ lọc hoặc thử lại với từ khóa khác.
          </Typography>
          <Button variant="contained" onClick={handleClearFilters} startIcon={<FilterAltIcon />}>
            Làm mới bộ lọc
          </Button>
        </Paper>
      );
    }

    return (
      <Grid container spacing={3}>
        {productCards.map((product) => (
          <Grid
            item
            xs={12}
            sm={viewMode === "grid" ? 6 : 12}
            md={viewMode === "grid" ? 4 : 12}
            key={product.id}
          >
            <ProductCard product={product} onFavoriteToggle={handleFavoriteToggle} />
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderPagination = () => {
    if (loading || totalPages <= 1) return null;
    return (
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
        <Button variant="outlined" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
          Trang trước
        </Button>
        <Typography variant="body2" fontWeight={600}>
          Trang {currentPage} / {totalPages}
        </Typography>
        <Button variant="outlined" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
          Trang sau
        </Button>
      </Stack>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, pb: 8 }}>
      <Stack spacing={4}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 5,
            background: "linear-gradient(135deg, rgba(30,60,114,0.9) 0%, rgba(126,34,206,0.9) 100%)",
            color: "white",
          }}
        >
          <Stack spacing={3}>
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="overline" sx={{ letterSpacing: 2, opacity: 0.8 }}>
                  Command Center
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                  Bộ điều phối sản phẩm
                </Typography>
                <Typography sx={{ opacity: 0.85, mt: 1 }}>
                  Đồng bộ bộ lọc, insight và hiển thị sản phẩm trong một giao diện duy nhất.
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesomeIcon />}
                  sx={{ borderColor: "rgba(255,255,255,0.5)", color: "white" }}
                >
                  Gợi ý AI
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<FilterAltIcon />}
                  sx={{ color: "#1e1b4b" }}
                  onClick={() => document.getElementById("filter-panel")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Điều chỉnh bộ lọc
                </Button>
              </Stack>
            </Stack>

            <Grid container spacing={2}>
              {heroStats.map((stat) => (
                <Grid item xs={12} sm={4} key={stat.label}>
                  <Stack
                    spacing={0.5}
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", width: 36, height: 36 }}>{stat.icon}</Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          {stat.label}
                        </Typography>
                        <Typography variant="h5" fontWeight={800}>
                          {stat.value}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {stat.caption}
                    </Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>

            <Box component="form" onSubmit={handleSearchSubmit}>
              <OutlinedInput
                fullWidth
                value={pendingSearch}
                onChange={(event) => setPendingSearch(event.target.value)}
                placeholder="Tìm sản phẩm, danh mục, shop..."
                startAdornment={<InputAdornment position="start"><SearchIcon /></InputAdornment>}
                sx={{
                  borderRadius: 999,
                  backgroundColor: "white",
                  mt: 2,
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                }}
                endAdornment={
                  <InputAdornment position="end">
                    <Button type="submit" variant="contained" color="secondary" sx={{ borderRadius: 999 }}>
                      Tìm kiếm
                    </Button>
                  </InputAdornment>
                }
              />
            </Box>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            <Typography variant="subtitle2" color="text.secondary">
              Bộ lọc nhanh:
            </Typography>
            {quickFilterOptions.map((filter) => (
              <Chip
                key={filter.id}
                label={filter.label}
                clickable
                color={activeQuickFilter === filter.id ? "primary" : "default"}
                variant={activeQuickFilter === filter.id ? "filled" : "outlined"}
                onClick={() => handleQuickFilterClick(filter.id)}
              />
            ))}
            <Chip
              label="Bỏ chọn"
              variant="outlined"
              onClick={() => setActiveQuickFilter(null)}
              sx={{ ml: "auto" }}
            />
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Stack spacing={3} id="filter-panel">
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Bộ sưu tập gợi ý
                  </Typography>
                  <Stack spacing={2}>
                    {collectionPresets.map((preset) => (
                      <Paper
                        key={preset.id}
                        elevation={0}
                        onClick={() => handleCollectionPreset(preset.id)}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          cursor: "pointer",
                          background: preset.gradient,
                          border: preset.id === activeCollection ? "2px solid rgba(30,60,114,0.4)" : "1px solid rgba(255,255,255,0.4)",
                          transition: "transform 0.25s",
                          transform: preset.id === activeCollection ? "translateY(-2px)" : "none",
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar sx={{ bgcolor: "rgba(255,255,255,0.4)", color: "#1e1b4b" }}>{preset.icon}</Avatar>
                          <Box>
                            <Typography fontWeight={700}>{preset.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {preset.subtitle}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
                <Stack spacing={3}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Danh mục
                    </Typography>
                    <Select
                      value={selectedCategory ?? ""}
                      displayEmpty
                      onChange={(event) => {
                        const value = event.target.value || null;
                        setSelectedCategory(value as string | null);
                        setCurrentPage(1);
                      }}
                    >
                      <MenuItem value="">Tất cả danh mục</MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </Stack>

                  <Stack spacing={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Khu vực
                    </Typography>
                    {loadingProvinces ? (
                      <Skeleton variant="rounded" height={56} />
                    ) : (
                      <Select
                        value={selectedProvince ?? ""}
                        displayEmpty
                        onChange={(event) => {
                          const value = event.target.value || null;
                          setSelectedProvince(value as string | null);
                          setCurrentPage(1);
                        }}
                      >
                        <MenuItem value="">Toàn quốc</MenuItem>
                        {provinces.map((province) => (
                          <MenuItem key={province} value={province}>
                            {province}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </Stack>

                  <Stack spacing={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Xuất xứ
                    </Typography>
                    {loadingOrigins ? (
                      <Skeleton variant="rounded" height={56} />
                    ) : (
                      <Select
                        value={selectedOrigin ?? ""}
                        displayEmpty
                        onChange={(event) => {
                          const value = event.target.value || null;
                          setSelectedOrigin(value as string | null);
                          setCurrentPage(1);
                        }}
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        {origins.map((origin) => (
                          <MenuItem key={origin} value={origin}>
                            {origin}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </Stack>

                  <Stack spacing={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Đánh giá
                    </Typography>
                    <ToggleButtonGroup
                      value={selectedRating ?? 0}
                      exclusive
                      onChange={handleRatingChange}
                      size="small"
                    >
                      {ratingOptions.map((rating) => (
                        <ToggleButton key={rating} value={rating}>
                          {rating}⭐+
                        </ToggleButton>
                      ))}
                      <ToggleButton value={0}>Tất cả</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>

                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Khoảng giá
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <OutlinedInput
                        value={minPriceInput}
                        onChange={handlePriceInputChange(setMinPriceInput)}
                        placeholder="Từ"
                        startAdornment={<InputAdornment position="start">₫</InputAdornment>}
                        fullWidth
                      />
                      <OutlinedInput
                        value={maxPriceInput}
                        onChange={handlePriceInputChange(setMaxPriceInput)}
                        placeholder="Đến"
                        startAdornment={<InputAdornment position="start">₫</InputAdornment>}
                        fullWidth
                      />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" size="small" onClick={handleApplyPrice}>
                        Áp dụng
                      </Button>
                      <Button variant="text" size="small" onClick={handleResetPrice}>
                        Đặt lại
                      </Button>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {priceShortcuts.map((preset) => (
                        <Chip
                          key={preset.label}
                          label={preset.label}
                          size="small"
                          onClick={() => handlePricePreset(preset.min, preset.max)}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                  <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange} size="small">
                    <ToggleButton value="grid">
                      <ViewModuleIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="list">
                      <ViewListIcon fontSize="small" />
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />
                  <Typography color="text.secondary">Sắp xếp:</Typography>
                  <Select value={sortBy} size="small" onChange={handleSortChange}>
                    <MenuItem value="newest">Mới nhất</MenuItem>
                    <MenuItem value="price-asc">Giá tăng dần</MenuItem>
                    <MenuItem value="price-desc">Giá giảm dần</MenuItem>
                  </Select>
                  <Box sx={{ ml: "auto", textAlign: "right" }}>
                    <Typography variant="caption" color="text.secondary">
                      Đang hiển thị
                    </Typography>
                    <Typography fontWeight={700}>{formatNumber(products.length)} sản phẩm</Typography>
                  </Box>
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Insight theo thời gian thực
                      </Typography>
                      <Typography variant="h6" fontWeight={700}>
                        {activeInsight.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activeInsight.subtitle}
                      </Typography>
                    </Box>
                    <Tabs
                      value={insightTab}
                      onChange={(_event, value) => setInsightTab(value as InsightTab)}
                      sx={{ ml: { sm: "auto" } }}
                    >
                      <Tab label="Tổng quan" value="overview" />
                      <Tab label="Tồn kho" value="inventory" />
                      <Tab label="Hấp dẫn" value="engagement" />
                    </Tabs>
                  </Stack>
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={activeInsight.progress}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "rgba(30,60,114,0.1)",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 5,
                          background: "linear-gradient(90deg, #1e3c72, #7e22ce)",
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      {activeInsight.progressLabel}
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    {activeInsight.metrics.map((metric) => (
                      <Paper key={metric.label} elevation={0} sx={{ flex: 1, p: 2, borderRadius: 3, backgroundColor: "rgba(30,60,114,0.03)" }}>
                        <Typography variant="caption" color="text.secondary">
                          {metric.label}
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          {metric.value}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              </Paper>

              {renderActiveFilters()}
              {renderProductsContent()}
              {renderPagination()}
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
