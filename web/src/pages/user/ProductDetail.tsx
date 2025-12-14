import CachedIcon from "@mui/icons-material/Cached";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaymentsIcon from "@mui/icons-material/Payments";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import SellIcon from "@mui/icons-material/Sell";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StorefrontIcon from "@mui/icons-material/Storefront";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import {
    Alert,
    Avatar,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
    Fade,
    IconButton,
    Link,
    Rating,
    Skeleton,
    Stack,
    TextField,
    Tooltip,
    Typography,
    Zoom,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import type { Settings } from "react-slick";
import Slider from "react-slick";
import { toast } from "react-toastify";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import api from "../../api/axios";
import { cartService, type CartResponse } from "../../api/cartService";
import { favoriteService } from "../../api/favoriteService";
import { productService, type ApiProduct } from "../../api/productService";
import ProductReviews from "../../components/ProductReviews";
import { useAuth } from "../../context/AuthContext";

interface MediaSlide {
  type: "image" | "video";
  src: string;
}

const sliderSettings: Settings = {
  dots: true,
  infinite: true,
  speed: 500,
  slidesToShow: 1,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 3000,
  arrows: false,
};

const FALLBACK_RECOMMENDATION_IMAGE = "https://via.placeholder.com/400x300?text=Product";

const formatCurrency = (value: number): string =>
  value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const isShopInfo = (
  value: ApiProduct["shopId"],
): value is { _id: string; shopName: string; logo?: string; province?: string; address?: string } =>
  typeof value === "object" && value !== null && typeof (value as { shopName?: unknown }).shopName === "string";

interface SectionCardProps {
  title: string;
  children: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}

interface AiSuggestionProduct {
  _id: string;
  title: string;
  price: number;
  image?: string | null;
  categories?: string[];
  buyUrl?: string;
  verified?: boolean;
  badge?: string;
}

interface AiChatSuggestionResponse {
  content: string;
  suggestions?: {
    products?: AiSuggestionProduct[];
  };
}

const SectionCard = ({ title, subtitle, action, children }: SectionCardProps) => (
  <Box
    sx={{
      background: "#fff",
      borderRadius: 4,
      boxShadow: "0 18px 48px rgba(15,23,42,0.08)",
      p: 3,
      mb: { xs: 3, lg: 4 },
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} mb={2}>
      <Box>
        <Typography fontWeight={800} fontSize={18} color="#0f172a">
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
    {children}
  </Box>
);

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, setUser, role } = useAuth();

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [flyAnim, setFlyAnim] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestionProduct[]>([]);
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  const [aiSuggestionError, setAiSuggestionError] = useState<string | null>(null);

  const sliderRef = useRef<Slider | null>(null);
  const productImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await productService.getProductById(id);
        if (!mounted) return;
        setProduct(data);

        // Record view in background and update local product views if returned
        void (async () => {
          try {
            const res = await productService.recordView(id);
            if (!mounted) return;
            if (res?.views != null) {
              setProduct((prev) => (prev ? { ...prev, views: res.views } : prev));
            }
          } catch (e) {
            // non-fatal
            console.warn("Failed to record product view:", e);
          }
        })();

      } catch (err) {
        console.error("❌ Lỗi tải chi tiết sản phẩm:", err);
        setError("Không thể tải chi tiết sản phẩm. Vui lòng thử lại sau.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchDetail();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!product) return;
    setIsFavorite(user?.favorites?.includes(product._id) ?? false);
  }, [user?.favorites, product?._id, product]);

  // Ask the AI service for similar products once product info is available.
  useEffect(() => {
    if (!product) return;
    let ignore = false;
    const fetchAiRecommendations = async () => {
      setAiSuggestionLoading(true);
      setAiSuggestionError(null);
      try {
        const categorySummary = product.categories?.slice(0, 3).join(", ") || "sản phẩm tương tự";
        const descSnippet = product.description?.slice(0, 220) || "";
        const message = `Hãy gợi ý tối đa 4 sản phẩm tương tự với "${product.title}" thuộc nhóm ${categorySummary}. Giá hiện tại khoảng ${formatCurrency(product.price ?? 0)}. Ưu tiên sản phẩm cùng danh mục, mức giá chênh lệch không quá 20% và đang bán trên QQ. Trả lời theo định dạng suggestions.
        Thông tin bổ sung: ${descSnippet}`;
        const { data } = await api.post<AiChatSuggestionResponse>("/api/ai-chat", {
          message,
          context: "user_support",
        });
        if (ignore) return;
        const aiProducts = data?.suggestions?.products ?? [];
        const normalized = aiProducts
          .filter((item) => item?._id && item._id !== product._id)
          .slice(0, 3)
          .map((item) => ({
            ...item,
            badge: item.verified ? "AI xác thực" : "AI đề xuất",
          }));
        setAiSuggestions(normalized);
      } catch (err) {
        console.error("AI suggestion error:", err);
        if (!ignore) {
          setAiSuggestionError("Chưa thể tải gợi ý bằng AI, đang dùng gợi ý mặc định.");
          setAiSuggestions([]);
        }
      } finally {
        if (!ignore) setAiSuggestionLoading(false);
      }
    };
    void fetchAiRecommendations();
    return () => {
      ignore = true;
    };
  }, [product]);

  const syncCartQuantity = useCallback(async () => {
    if (!user || !product) return 0;
    try {
      const cart: CartResponse = await cartService.getCart();
      const matched = cart.items.find((item) => item.productId._id === product._id);
      const qty = matched?.quantity ?? 0;
      setCartQuantity(qty);
      return qty;
    } catch (err) {
      console.warn("Không thể đồng bộ giỏ hàng:", err);
      setCartQuantity(0);
      return 0;
    }
  }, [product, user]);

  useEffect(() => {
    void syncCartQuantity();
  }, [syncCartQuantity]);

  const mediaSlides: MediaSlide[] = useMemo(() => {
    if (!product) return [];
    const videoSlides = (product.videos ?? []).filter(Boolean).map((src) => ({ type: "video" as const, src }));
    const imageSlides = (product.images ?? []).filter(Boolean).map((src) => ({ type: "image" as const, src }));
    return [...videoSlides, ...imageSlides];
  }, [product]);

  const slidesToRender = mediaSlides.length
    ? mediaSlides
    : [{ type: "image" as const, src: "https://via.placeholder.com/600x400?text=No+Media" }];

  const curatedRelated = useMemo<AiSuggestionProduct[]>(() => {
    if (!product) return [];
    return Array.from({ length: 3 }, (_, idx) => ({
      _id: `${product._id}-rel-${idx}`,
      title: `${product.title} phiên bản ${idx + 1}`,
      price: Math.max(product.price - idx * 50000, 0),
      image: product.images?.[idx] || product.images?.[0] || FALLBACK_RECOMMENDATION_IMAGE,
      badge: idx === 0 ? "Bán chạy" : idx === 1 ? "Gợi ý" : "Mới",
      categories: product.categories?.slice(0, 2) ?? [],
    }));
  }, [product]);

  const aiHasSuggestions = aiSuggestions.length > 0;
  const displayedRecommendations = aiHasSuggestions && aiSuggestions.length ? aiSuggestions : curatedRelated;

  const handleThumbClick = (index: number) => {
    sliderRef.current?.slickGoTo(index);
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      if (!product) return prev;
      const next = Math.min(Math.max(1, prev + delta), Math.max(1, product.stock));
      return next;
    });
  };

  const handleQuantityInput = (value: string) => {
    if (!product) return;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setQuantity(() => Math.min(Math.max(1, parsed), Math.max(1, product.stock)));
  };

  const requireLogin = () => {
    window.dispatchEvent(new Event("openLogin"));
  };

  const handleToggleFavorite = async () => {
    if (!product) return;
    if (!user) {
      requireLogin();
      return;
    }
    if (favoriteLoading) return;

    const nextState = !isFavorite;
    setFavoriteLoading(true);
    try {
      const response = nextState
        ? await favoriteService.addFavorite(product._id)
        : await favoriteService.removeFavorite(product._id);
      setIsFavorite(nextState);
      setUser((prev) => (prev ? { ...prev, favorites: response.favorites } : prev));
      toast.success(nextState ? "❤️ Đã thêm vào danh sách yêu thích" : "🗑️ Đã bỏ khỏi danh sách yêu thích", {
        autoClose: 2200,
      });
    } catch (err) {
      console.error("❌ Lỗi thao tác yêu thích:", err);
      toast.error("Không thể cập nhật danh sách yêu thích");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const triggerSuccessBanner = () => {
    setShowSuccess(true);
    setFlyAnim(true);
    setTimeout(() => setFlyAnim(false), 900);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      requireLogin();
      return;
    }
    // Sellers cannot purchase
    if (role === "seller") {
      toast.error("Tài khoản seller không được phép mua hàng.");
      return;
    }
    if (product.stock === 0) {
      toast.warning("Sản phẩm đã tạm hết hàng");
      return;
    }

    setAddingToCart(true);
    try {
      const existingQty = cartQuantity || (await syncCartQuantity());
      if (existingQty + quantity > product.stock) {
        const available = Math.max(product.stock - existingQty, 0);
        toast.warning(available > 0 ? `Chỉ còn ${available} sản phẩm trong kho.` : "Bạn đã đạt số lượng tối đa trong kho.");
        return;
      }

      const cart = await cartService.addToCart({ productId: product._id, quantity });
      const matched = cart.items.find((item) => item.productId._id === product._id);
      setCartQuantity(matched?.quantity ?? existingQty + quantity);
      triggerSuccessBanner();
      toast.success("Đã thêm sản phẩm vào giỏ hàng", { autoClose: 2000 });
    } catch (err) {
      console.error("❌ Lỗi thêm giỏ hàng:", err);
      const message = err instanceof Error ? err.message : "Không thể thêm vào giỏ hàng";
      toast.error(message);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!user) {
      requireLogin();
      return;
    }
    // Sellers cannot purchase
    if (role === "seller") {
      toast.error("Tài khoản seller không được phép mua hàng.");
      return;
    }
    if (product.stock === 0) {
      toast.warning("Sản phẩm đã hết hàng");
      return;
    }
    if (quantity > product.stock) {
      toast.warning(`Số lượng tối đa hiện còn ${product.stock}`);
      return;
    }
    navigate(`/checkout/buy-now/${product._id}`, { state: { quantity } });
  };

  const handleViewShopDetail = () => {
    if (shopInfo?._id) {
      navigate(`/shop/${shopInfo._id}`, { state: { fromProduct: product?._id } });
    } else {
      toast.info("Đang chuyển đến danh sách gian hàng", { autoClose: 2000 });
      navigate("/products");
    }
  };

  if (loading)
    return (
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <CircularProgress size={60} sx={{ color: "#fff" }} />
        <Typography mt={3} color="#fff" fontSize={18}>
          Đang tải chi tiết sản phẩm...
        </Typography>
      </Box>
    );

  if (error)
    return (
      <Container sx={{ py: 8 }}>
        <Typography variant="h6" color="error" textAlign="center">
          {error}
        </Typography>
      </Container>
    );

  if (!product)
    return (
      <Container sx={{ py: 8 }}>
        <Typography variant="h6" color="text.secondary" textAlign="center">
          Không tìm thấy sản phẩm.
        </Typography>
      </Container>
    );

  const ratingValue = product.rating ?? product.Rating ?? 0;
  const reviewCount = product.reviewCount ?? Math.max(1, Math.floor((product.soldCount ?? 6) / 2));
  const soldCount = product.soldCount ?? 0;
  const shopInfo = isShopInfo(product.shopId) ? product.shopId : null;
  const launchDate = product.createdAt ? new Date(product.createdAt).toLocaleDateString("vi-VN") : "Đang cập nhật";
  const skuCode = product._id?.slice(-8).toUpperCase() ?? product._id;

  const basePrice = product.price ?? 0;
  const listPrice = Math.max(basePrice + 50000, Math.round((basePrice * 1.12) / 1000) * 1000);
  const discountPercentRaw = listPrice > 0 ? Math.round(((listPrice - basePrice) / listPrice) * 100) : 0;
  const discountPercent = Math.min(65, Math.max(5, discountPercentRaw));
  const coinsBack = Math.max(1000, Math.round((basePrice * 0.02) / 1000) * 1000);
  const maxPurchase = Math.max(1, product.stock || 1);

  const heroChips = [
    { title: `${ratingValue.toFixed(1)}/5 điểm`, caption: `${reviewCount} đánh giá`, color: "#fff3e0" },
    { title: `${soldCount.toLocaleString("vi-VN")} đơn`, caption: "Đã bán toàn quốc", color: "#fef9c3" },
    {
      title: product.stock === 0 ? "Tạm hết" : "Sẵn sàng giao",
      caption: product.stock === 0 ? "Liên hệ để đặt trước" : `Còn ${product.stock} sản phẩm`,
      color: "#ffe4e6",
    },
  ];

  const infoRows = [
    { label: "Xuất xứ", value: product.origin ?? "Đang cập nhật" },
    { label: "Danh mục", value: product.categories?.length ? product.categories.join(", ") : "Đang cập nhật" },
    { label: "Ngày mở bán", value: launchDate },
    { label: "Mã sản phẩm", value: skuCode },
  ];

  const voucherList = [
    { label: "Giảm 30K đơn 299K" },
    { label: "Freeship Xtra" },
    { label: "Hoàn xu 2%" },
    { label: "Giảm 100K đơn 899K" },
  ];

  const shippingMeta = [
    { label: "Vận chuyển", value: shopInfo?.province ? `Từ ${shopInfo.province}` : "Kho tổng QQ", action: "Thay đổi" },
    { label: "Phí vận chuyển", value: "Miễn phí đơn từ 500.000₫" },
    { label: "Ưu đãi", value: `Hoàn xu ${coinsBack.toLocaleString("vi-VN")}₫ khi thanh toán online` },
  ];

  const serviceBadges = [
    { icon: <VerifiedUserIcon sx={{ color: "#fb923c" }} />, title: "Chính hãng 100%", desc: "Đền bù 200% nếu phát hiện hàng giả." },
    { icon: <CachedIcon sx={{ color: "#f472b6" }} />, title: "Đổi trả 15 ngày", desc: "Miễn phí đổi trả khi sản phẩm lỗi." },
    { icon: <PaymentsIcon sx={{ color: "#0ea5e9" }} />, title: "Thanh toán an toàn", desc: "Hỗ trợ COD, PayOS, MoMo & thẻ quốc tế." },
  ];

  const guaranteeItems = [
    { icon: <VerifiedUserIcon sx={{ color: "#0ea5e9" }} />, title: "Bảo vệ thanh toán", desc: "Hoàn tiền 100% nếu phát hiện hàng giả." },
    { icon: <LocalShippingIcon sx={{ color: "#22c55e" }} />, title: "Giao nhanh toàn quốc", desc: "Xử lý đơn trong 24h và theo dõi realtime." },
    { icon: <CachedIcon sx={{ color: "#f97316" }} />, title: "Đổi trả linh hoạt", desc: "Miễn phí đổi trả trong 7 ngày." },
  ];

  const descriptionParagraphs = product.description && product.description.trim().length
    ? product.description
        .split(/\r?\n+/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : [
        "Thông tin chi tiết đang được cập nhật từ nhà bán.",
        "Liên hệ đội ngũ tư vấn để nhận thông tin mới nhất về chất liệu, kích thước và hướng dẫn sử dụng.",
      ];

  const specificationList = [
    { label: "Danh mục", value: product.categories?.length ? product.categories.join(" • ") : "Đang cập nhật" },
    { label: "Xuất xứ", value: product.origin ?? "Đang cập nhật" },
    { label: "Tình trạng", value: product.status ?? "Đang cập nhật" },
    { label: "Kho còn", value: `${product.stock} sản phẩm` },
    { label: "Ngày mở bán", value: launchDate },
    { label: "Mã SKU", value: skuCode },
  ];

  const shopDisplayName = shopInfo?.shopName ?? "QQ Seller";
  const shopInitial = shopDisplayName.charAt(0).toUpperCase();
  const shopProvince = shopInfo?.province ?? "Giao toàn quốc";
  const shopAddress = shopInfo?.address ?? "Đang cập nhật";
  const shopCode = shopInfo?._id?.slice(-6).toUpperCase() ?? "QQSHOP";

  const shopBadges = [
    shopInfo ? { label: "Đã xác thực", color: "#dcfce7", text: "#15803d" } : { label: "Gian hàng mới", color: "#fef9c3", text: "#92400e" },
    {
      label: soldCount > 100 ? "Bán chạy" : "Đang phát triển",
      color: soldCount > 100 ? "#fee2e2" : "#e0f2fe",
      text: soldCount > 100 ? "#b91c1c" : "#0369a1",
    },
  ];

  const shopHighlightStats = [
    {
      icon: <LocalMallIcon sx={{ color: "#be123c" }} />,
      label: "Đơn thành công",
      value: `${soldCount.toLocaleString("vi-VN")} đơn`,
      meta: "Theo hệ thống QQ",
    },
    {
      icon: <VerifiedUserIcon sx={{ color: "#0ea5e9" }} />,
      label: "Điểm trung bình",
      value: `${ratingValue.toFixed(1)}/5`,
      meta: `${reviewCount} đánh giá`,
    },
    {
      icon: <LocalShippingIcon sx={{ color: "#16a34a" }} />,
      label: "Kho hiện tại",
      value: product.stock === 0 ? "Hết hàng" : `${product.stock} sản phẩm`,
      meta: shopProvince,
    },
  ];

  const shopContactRows = [
    { icon: <StorefrontIcon sx={{ color: "#7c3aed" }} />, label: "Mã gian hàng", value: shopCode },
    { icon: <HomeOutlinedIcon sx={{ color: "#ea580c" }} />, label: "Địa chỉ", value: shopAddress },
    { icon: <LocalShippingIcon sx={{ color: "#0ea5e9" }} />, label: "Khu vực ưu tiên", value: shopProvince },
  ];

  const highlightCards = [
    {
      icon: <LocalMallIcon sx={{ color: "#be123c" }} />,
      title: "Doanh số thực",
      desc: `${soldCount.toLocaleString("vi-VN")} đơn hoàn tất`,
      meta: "Cập nhật liên tục",
      bg: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
    },
    {
      icon: <PaymentsIcon sx={{ color: "#155e75" }} />,
      title: "Đánh giá nổi bật",
      desc: `${ratingValue.toFixed(1)}/5 từ ${reviewCount} đánh giá`,
      meta: "Khách hàng xác thực",
      bg: "linear-gradient(135deg, #ecfeff 0%, #dbeafe 100%)",
    },
    {
      icon: <LocalShippingIcon sx={{ color: "#166534" }} />,
      title: product.stock === 0 ? "Tạm hết hàng" : "Tồn kho",
      desc: product.stock === 0 ? "Nhận thông báo khi có lại" : `${product.stock} sản phẩm sẵn kho`,
      meta: "Giao nhanh toàn quốc",
      bg: "linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)",
    },
  ];

  const shippingOptions = [
    { title: "Giao hoả tốc 2h", desc: "Áp dụng tại Hà Nội & TP.HCM cho đơn trước 17h.", badge: "Mới" },
    { title: "Giao tiêu chuẩn", desc: "Miễn phí với đơn từ 500.000₫, theo dõi realtime.", badge: "Phổ biến" },
    { title: "Nhận tại cửa hàng", desc: "Đặt trước và lấy hàng tại showroom gần bạn.", badge: "Hot" },
  ];

  const paymentPerks = [
    { title: "Trả góp 0%", desc: "Kỳ hạn 3-12 tháng qua thẻ tín dụng đối tác." },
    { title: "Hoàn tiền PayOS", desc: "Hoàn đến 150.000₫ cho giao dịch đầu tiên." },
    { title: "Bảo hiểm đơn hàng", desc: "Đền bù 200% nếu đơn bị thất lạc." },
  ];

  const supportChannels = [
    { icon: <HeadsetMicIcon sx={{ color: "#f472b6" }} />, label: "Chat với stylist", detail: "Tư vấn size & phối đồ trong 5 phút." },
    { icon: <PhoneInTalkIcon sx={{ color: "#38bdf8" }} />, label: "Hotline 1900 6868", detail: "Tổng đài 08:00 - 22:00 hàng ngày." },
    {
      icon: <StorefrontIcon sx={{ color: "#a78bfa" }} />,
      label: "Hệ thống showroom",
      detail: shopInfo?.province ? `Ưu tiên khách tại ${shopInfo.province}` : "Đang mở rộng toàn quốc",
    },
  ];

  return (
    <Box sx={{ background: "linear-gradient(to bottom, #fff7f3 0%, #ffffff 80%)", minHeight: "100vh" }}>
      <Container sx={{ py: 6, position: "relative" }}>
        <Zoom in={showSuccess}>
          <Box
            sx={{
              position: "fixed",
              top: 90,
              right: 30,
              zIndex: 10000,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              px: 3,
              py: 2,
              borderRadius: 3,
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <CheckCircleIcon />
            <Typography fontWeight={600}>Đã thêm vào giỏ hàng!</Typography>
          </Box>
        </Zoom>

        <Breadcrumbs separator="›" sx={{ fontSize: 14, color: "text.secondary" }}>
          <Link
            component={RouterLink}
            to="/home"
            underline="hover"
            color="inherit"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
          >
            <HomeOutlinedIcon fontSize="small" /> Trang chủ
          </Link>
          <Link component={RouterLink} to="/products" underline="hover" color="inherit">
            {product.categories?.[0] ?? "Danh mục"}
          </Link>
          <Typography color="text.primary" fontWeight={700}>
            {product.title}
          </Typography>
        </Breadcrumbs>

        <Box sx={{ mt: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label="Mall chính hãng" size="small" sx={{ background: "#ffefe3", color: "#b45309", fontWeight: 700 }} />
                <Chip label="Hoàn xu 2%" size="small" sx={{ background: "#fdf4ff", color: "#a21caf", fontWeight: 700 }} />
              </Stack>
              <Typography variant="h4" fontWeight={800} mt={1} sx={{ color: "#0f172a", lineHeight: 1.3 }}>
                {product.title}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" mt={1.5}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography fontWeight={800} color="#ee4d2d">
                    {ratingValue.toFixed(1)}
                  </Typography>
                  <Rating value={ratingValue || 4.5} readOnly precision={0.5} size="small" />
                  <Typography variant="body2" color="text.secondary">
                    ({reviewCount} đánh giá)
                  </Typography>
                </Stack>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
                <Typography variant="body2" color="text.secondary">
                  Đã bán {soldCount.toLocaleString("vi-VN")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Kho: {product.stock === 0 ? "Hết hàng" : `${product.stock} sản phẩm`}
                </Typography>
              </Stack>
            </Box>
            <Tooltip title={favoriteLoading ? "Đang xử lý" : isFavorite ? "Bỏ yêu thích" : "Thêm yêu thích"}>
              <IconButton
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                sx={{
                  border: "2px solid #ffe4d6",
                  backgroundColor: "#fff",
                  boxShadow: "0 6px 20px rgba(238,77,45,0.18)",
                  width: 56,
                  height: 56,
                  alignSelf: "flex-start",
                  "&:hover": { backgroundColor: "#fffaf6" },
                }}
              >
                {isFavorite ? <FavoriteIcon sx={{ color: "#f43f5e" }} /> : <FavoriteBorderIcon sx={{ color: "#ee4d2d" }} />}
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" mt={2}>
            {heroChips.map((chip) => (
              <Box
                key={chip.title}
                sx={{
                  background: chip.color,
                  borderRadius: 999,
                  px: 2,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  border: "1px dashed rgba(238,77,45,0.3)",
                }}
              >
                <Typography fontSize={14} fontWeight={700} color="#0f172a">
                  {chip.title}
                </Typography>
                <Typography fontSize={13} color="text.secondary">
                  {chip.caption}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Fade in timeout={700}>
          <Grid container spacing={4} mt={0.5}>
            <Grid item xs={12} md={6} lg={7}>
              <Box sx={{ position: "relative", borderRadius: 4, overflow: "hidden", boxShadow: "0 20px 60px rgba(15,23,42,0.1)" }}>
                <Slider
                  {...sliderSettings}
                  ref={(instance) => {
                    if (instance) sliderRef.current = instance;
                  }}
                  afterChange={(index) => setActiveSlide(index)}
                >
                  {slidesToRender.map((slide, idx) => (
                    <Box key={`${slide.type}-${idx}`} sx={{ position: "relative" }}>
                      {slide.type === "image" ? (
                        <Box
                          component="img"
                          ref={idx === 0 ? productImgRef : null}
                          src={slide.src}
                          alt={product.title}
                          sx={{ width: "100%", height: { xs: 320, md: 420 }, objectFit: "cover" }}
                        />
                      ) : (
                        <Box component="video" src={slide.src} controls sx={{ width: "100%", height: { xs: 320, md: 420 }, objectFit: "cover" }} />
                      )}
                    </Box>
                  ))}
                </Slider>
                {flyAnim && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 24,
                      right: 24,
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      border: "2px solid rgba(238,77,45,0.4)",
                      animation: "cartPulse 0.8s ease",
                      pointerEvents: "none",
                      "@keyframes cartPulse": {
                        from: { transform: "scale(0.8)", opacity: 0.6 },
                        to: { transform: "scale(1.4)", opacity: 0 },
                      },
                    }}
                  />
                )}
              </Box>

              <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                {slidesToRender.map((slide, idx) => (
                  <Box
                    key={`thumb-${idx}`}
                    onClick={() => handleThumbClick(idx)}
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 2,
                      border: idx === activeSlide ? "2px solid #ee4d2d" : "1px solid #e2e8f0",
                      overflow: "hidden",
                      cursor: "pointer",
                      opacity: idx === activeSlide ? 1 : 0.7,
                      transition: "all 0.2s",
                    }}
                  >
                    {slide.type === "image" ? (
                      <Box component="img" src={slide.src} alt="thumb" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Box component="video" src={slide.src} muted sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </Box>
                ))}
              </Stack>

              <Box mt={3} p={3} sx={{ background: "#fff", borderRadius: 4, boxShadow: "0 12px 30px rgba(15,23,42,0.06)" }}>
                <Typography fontWeight={700} mb={2}>
                  Thông tin nổi bật
                </Typography>
                <Grid container spacing={2}>
                  {infoRows.map((row) => (
                    <Grid item xs={6} key={row.label}>
                      <Typography variant="body2" color="text.secondary">
                        {row.label}
                      </Typography>
                      <Typography fontWeight={600}>{row.value}</Typography>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography fontWeight={700} mb={1}>
                  Ưu đãi độc quyền
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {voucherList.map((voucher) => (
                    <Chip
                      key={voucher.label}
                      icon={<SellIcon fontSize="small" />}
                      label={voucher.label}
                      sx={{
                        background: "linear-gradient(135deg, #fff1f2, #ffe4e6)",
                        color: "#be123c",
                        fontWeight: 600,
                      }}
                    />
                  ))}
                </Stack>

                <Divider sx={{ my: 3 }} />

                <Stack spacing={2}>
                  {shippingMeta.map((meta) => (
                    <Stack key={meta.label} direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography fontSize={14} color="text.secondary">
                          {meta.label}
                        </Typography>
                        <Typography fontWeight={600}>{meta.value}</Typography>
                      </Box>
                      {meta.action && (
                        <Button size="small" variant="text" color="primary">
                          {meta.action}
                        </Button>
                      )}
                    </Stack>
                  ))}
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3} flexWrap="wrap">
                  {serviceBadges.map((badge) => (
                    <Stack
                      key={badge.title}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{
                        flex: 1,
                        background: "#f8fafc",
                        borderRadius: 3,
                        px: 2,
                        py: 1.5,
                      }}
                    >
                      {badge.icon}
                      <Box>
                        <Typography fontWeight={700} fontSize={14}>
                          {badge.title}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary">
                          {badge.desc}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={6} lg={5}>
              <Box
                sx={{
                  background: "#fff",
                  borderRadius: 4,
                  boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
                  p: 3,
                  position: "sticky",
                  top: 90,
                }}
              >
                <Typography color="text.secondary" sx={{ textDecoration: "line-through" }}>
                  {formatCurrency(listPrice)}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center" mt={1}>
                  <Typography variant="h3" fontWeight={800} color="#ee4d2d">
                    {formatCurrency(basePrice)}
                  </Typography>
                  <Chip label={`-${discountPercent}%`} sx={{ background: "#ffeee6", color: "#c2410c", fontWeight: 700 }} />
                </Stack>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Hoàn xu {coinsBack.toLocaleString("vi-VN")}₫ khi thanh toán online
                </Typography>

                <Box mt={3}>
                  <Typography fontWeight={600} mb={1}>
                    Số lượng
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button variant="outlined" disabled={quantity <= 1 || product.stock === 0} onClick={() => handleQuantityChange(-1)}>
                      -
                    </Button>
                    <TextField
                      size="small"
                      type="number"
                      value={quantity}
                      onChange={(event) => handleQuantityInput(event.target.value)}
                      inputProps={{ min: 1, max: maxPurchase, style: { textAlign: "center", width: 60 } }}
                    />
                    <Button variant="outlined" disabled={product.stock === 0 || quantity >= maxPurchase} onClick={() => handleQuantityChange(1)}>
                      +
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {product.stock === 0 ? "Hết hàng" : `${product.stock} sẵn kho`}
                    </Typography>
                  </Stack>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ShoppingCartIcon sx={{ transition: "transform 0.3s", transform: flyAnim ? "scale(1.2)" : "scale(1)" }} />}
                    disabled={addingToCart || product.stock === 0}
                    onClick={handleAddToCart}
                  >
                    {addingToCart ? "Đang thêm..." : "Thêm vào giỏ"}
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    onClick={handleBuyNow}
                    disabled={product.stock === 0}
                    sx={{ boxShadow: "0 14px 24px rgba(238,77,45,0.35)" }}
                  >
                    Mua ngay
                  </Button>
                </Stack>

                {cartQuantity > 0 && (
                  <Typography mt={2} fontSize={14} color="text.secondary">
                    Bạn đang có {cartQuantity} sản phẩm này trong giỏ.
                  </Typography>
                )}

                <Divider sx={{ my: 3 }} />

                <Stack spacing={2}>
                  {guaranteeItems.map((item) => (
                    <Stack key={item.title} direction="row" spacing={1.5} alignItems="flex-start">
                      {item.icon}
                      <Box>
                        <Typography fontWeight={700}>{item.title}</Typography>
                        <Typography fontSize={13} color="text.secondary">
                          {item.desc}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>

              </Box>
            </Grid>
          </Grid>
        </Fade>

        <Grid container spacing={3} mt={5}>
          <Grid item xs={12} lg={8}>
            <SectionCard title="Mô tả & Điểm nổi bật" subtitle="Thông tin được cập nhật trực tiếp từ nhà bán">
              <Grid container spacing={2} mb={3}>
                {highlightCards.map((card) => (
                  <Grid item xs={12} sm={6} md={4} key={card.title}>
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 4,
                        background: card.bg,
                        display: "flex",
                        gap: 2,
                        alignItems: "flex-start",
                        minHeight: 120,
                      }}
                    >
                      {card.icon}
                      <Box>
                        <Typography fontWeight={700}>{card.title}</Typography>
                        <Typography fontSize={14}>{card.desc}</Typography>
                        <Typography fontSize={13} color="text.secondary">
                          {card.meta}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ mb: 3 }} />
              <Stack spacing={1.5}>
                {descriptionParagraphs.map((paragraph, index) => (
                  <Typography key={`desc-${index}`} color="text.secondary">
                    {paragraph}
                  </Typography>
                ))}
              </Stack>
            </SectionCard>

            <SectionCard title="Thông số sản phẩm" subtitle="Tổng hợp thông tin kỹ thuật và chứng từ">
              <Grid container spacing={2}>
                {specificationList.map((spec) => (
                  <Grid item xs={12} sm={6} key={spec.label}>
                    <Typography variant="body2" color="text.secondary">
                      {spec.label}
                    </Typography>
                    <Typography fontWeight={600}>{spec.value}</Typography>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>

            <SectionCard title="Vận chuyển & Thanh toán" subtitle="Chọn phương án phù hợp với bạn">
              <Stack spacing={2}>
                {shippingOptions.map((option) => (
                  <Box
                    key={option.title}
                    sx={{
                      border: "1px solid #f1f5f9",
                      borderRadius: 3,
                      p: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography fontWeight={700}>{option.title}</Typography>
                      <Typography fontSize={14} color="text.secondary">
                        {option.desc}
                      </Typography>
                    </Box>
                    <Chip label={option.badge} color="primary" variant="outlined" />
                  </Box>
                ))}
              </Stack>
              <Divider sx={{ my: 3 }} />
              <Stack spacing={2}>
                {paymentPerks.map((perk) => (
                  <Stack key={perk.title} direction="row" spacing={1.5} alignItems="flex-start">
                    <PaymentsIcon sx={{ color: "#0ea5e9" }} />
                    <Box>
                      <Typography fontWeight={700}>{perk.title}</Typography>
                      <Typography fontSize={14} color="text.secondary">
                        {perk.desc}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>

            <SectionCard
              title="Đánh giá từ khách hàng"
              subtitle="Theo dõi nhận xét và phản hồi của gian hàng"
              action={
                reviewCount > 0 ? <Chip label={`${reviewCount} đánh giá`} color="primary" variant="outlined" /> : null
              }
            >
              <ProductReviews
                productId={product._id}
                avgRating={ratingValue}
                reviewCount={reviewCount}
                shopName={shopInfo?.shopName ?? "QQ Seller"}
              />
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={4}>
            <SectionCard
              title="Thông tin gian hàng"
              subtitle="Minh bạch từ người bán"
              action={
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleViewShopDetail}
                >
                  Xem gian hàng
                </Button>
              }
            >
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={shopInfo?.logo} alt={shopDisplayName} sx={{ width: 56, height: 56, bgcolor: "#eef2ff", color: "#312e81" }}>
                    {shopInitial}
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>{shopDisplayName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {shopProvince} • {shopCode}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                      {shopBadges.map((badge) => (
                        <Chip
                          key={badge.label}
                          label={badge.label}
                          size="small"
                          sx={{ backgroundColor: badge.color, color: badge.text, fontWeight: 600 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Stack>

                <Grid container spacing={1.5}>
                  {shopHighlightStats.map((stat) => (
                    <Grid item xs={12} sm={6} key={stat.label}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{ border: "1px solid #f1f5f9", borderRadius: 2, p: 1.5 }}
                      >
                        {stat.icon}
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {stat.label}
                          </Typography>
                          <Typography fontWeight={700}>{stat.value}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {stat.meta}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>

                <Divider />

                <Stack spacing={1.5}>
                  {shopContactRows.map((row) => (
                    <Stack direction="row" spacing={1.5} alignItems="center" key={row.label}>
                      {row.icon}
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {row.label}
                        </Typography>
                        <Typography fontWeight={600}>{row.value}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </SectionCard>

            <SectionCard title="Kênh hỗ trợ" subtitle="Được đồng hành 24/7">
              <Stack spacing={2}>
                {supportChannels.map((support) => (
                  <Stack
                    key={support.label}
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-start"
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      border: "1px solid #f1f5f9",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    {support.icon}
                    <Box>
                      <Typography fontWeight={700}>{support.label}</Typography>
                      <Typography fontSize={14} color="text.secondary">
                        {support.detail}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>

            <SectionCard title="Cam kết bảo vệ" subtitle="Mua sắm an tâm">
              <Stack spacing={2}>
                {guaranteeItems.map((item) => (
                  <Stack key={item.title} direction="row" spacing={1.5} alignItems="flex-start">
                    {item.icon}
                    <Box>
                      <Typography fontWeight={700}>{item.title}</Typography>
                      <Typography fontSize={13} color="text.secondary">
                        {item.desc}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>

        <Box mt={6}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Gợi ý cho bạn
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {aiHasSuggestions ? "AI phân tích danh mục & tầm giá để gợi ý thêm sản phẩm phù hợp." : "Hiển thị một số lựa chọn tương tự để bạn tham khảo."}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={aiHasSuggestions ? "AI gợi ý" : "Gợi ý mặc định"}
                color={aiHasSuggestions ? "primary" : "default"}
                variant={aiHasSuggestions ? "filled" : "outlined"}
                size="small"
              />
              <Button component={RouterLink} to="/products" variant="text">
                Xem thêm
              </Button>
            </Stack>
          </Stack>

          {aiSuggestionError ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {aiSuggestionError}
            </Alert>
          ) : null}

          {aiSuggestionLoading ? (
            <Grid container spacing={3} mt={1}>
              {Array.from({ length: 3 }).map((_, idx) => (
                <Grid item xs={12} md={4} key={`rec-skeleton-${idx}`}>
                  <Box sx={{ borderRadius: 4, overflow: "hidden", background: "#fff", boxShadow: "0 12px 30px rgba(15,23,42,0.08)", p: 2 }}>
                    <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3 }} />
                    <Skeleton height={28} width="70%" sx={{ mt: 2 }} />
                    <Skeleton height={22} width="50%" />
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3} mt={1}>
              {displayedRecommendations.map((item) => {
                const href = `/products/${item._id}`;
                const label = aiHasSuggestions ? item.badge ?? "AI gợi ý" : item.badge ?? "Gợi ý";
                return (
                  <Grid item xs={12} md={4} key={item._id}>
                    <Box sx={{ borderRadius: 4, overflow: "hidden", background: "#fff", boxShadow: "0 12px 30px rgba(15,23,42,0.08)", height: "100%" }}>
                      <Box
                        component="img"
                        src={item.image ?? FALLBACK_RECOMMENDATION_IMAGE}
                        alt={item.title}
                        sx={{ width: "100%", height: 220, objectFit: "cover" }}
                      />
                      <Box p={2} display="flex" flexDirection="column" gap={1}>
                        <Chip label={label} size="small" sx={{ alignSelf: "flex-start", background: aiHasSuggestions ? "#eef2ff" : "#fef2f2", color: aiHasSuggestions ? "#312e81" : "#b91c1c" }} />
                        <Typography fontWeight={700}>{item.title}</Typography>
                        {item.categories?.length ? (
                          <Typography variant="body2" color="text.secondary">
                            {item.categories.slice(0, 2).join(" • ")}
                          </Typography>
                        ) : null}
                        <Typography color="#ee4d2d" fontWeight={800}>
                          {formatCurrency(item.price || 0)}
                        </Typography>
                        <Button
                          component={RouterLink}
                          to={href}
                          variant="outlined"
                          sx={{ mt: 1, alignSelf: "flex-start" }}
                        >
                          Xem chi tiết
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Container>
    </Box>
  );
}
