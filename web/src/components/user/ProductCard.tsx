import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    IconButton,
    Rating,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import { toast } from "react-toastify";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import type { CartResponse } from "../../api/cartService";
import { cartService } from "../../api/cartService";
import { favoriteService } from "../../api/favoriteService";
import { useAuth } from "../../context/AuthContext";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

interface Props {
  product: ProductCardType;
  onFavoriteToggle?: (productId: string, isFavorite: boolean) => void;
}

export default function ProductCard({ product, onFavoriteToggle }: Props) {
  const navigate = useNavigate();
  const { user, setUser, role } = useAuth();
  const mediaRef = useRef<HTMLDivElement>(null);
  const [fly, setFly] = useState(false);
  const [flyPos, setFlyPos] = useState({ x: 0, y: 0 });
  const derivedFavorite = product.isFavorite ?? (user?.favorites?.includes(product.id) ?? false);
  const [isFavorite, setIsFavorite] = useState(derivedFavorite);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const videoSlides = (product.videos ?? []).filter(Boolean).map((src) => ({ type: "video" as const, src }));
  const imageSlides = (product.images ?? []).filter(Boolean).map((src) => ({ type: "image" as const, src }));
  const mediaSlides = [...videoSlides, ...imageSlides];
  const sliderItems = mediaSlides.length
    ? mediaSlides
    : [{ type: "image" as const, src: "https://via.placeholder.com/400x300?text=No+Media" }];
  const flyThumbnail = product.images?.[0] || "https://via.placeholder.com/200?text=Product";
  const sliderSettings = {
    dots: sliderItems.length > 1,
    arrows: false,
    infinite: sliderItems.length > 1,
    autoplay: true,
    autoplaySpeed: 3000,
    slidesToShow: 1,
    slidesToScroll: 1,
    pauseOnHover: true,
  };

  // Xem chi tiết
  const handleViewDetail = () => {
    navigate(`/products/${product.id}`);
  };

  // Thêm vào giỏ
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaRef.current) return;

    // Sellers are not allowed to purchase
    if (role === "seller") {
      toast.error("Tài khoản seller không được phép mua hàng.", { position: "top-right", autoClose: 3000 });
      return;
    }

    // Nếu chưa đăng nhập -> mở modal đăng nhập
    if (!user) {
      window.dispatchEvent(new Event("openLogin"));
      return;
    }

    const rect = mediaRef.current.getBoundingClientRect();
    setFlyPos({ x: rect.left, y: rect.top });
    setFly(true);

    try {
      // Lấy giỏ hiện tại để kiểm tra số lượng đã có trong giỏ
      let existingQty = 0;
      try {
        const cart: CartResponse = await cartService.getCart();
        const found = cart.items.find((it) => it.productId._id === product.id);
        if (found) existingQty = found.quantity;
      } catch (err) {
        // Nếu không lấy được giỏ thì vẫn tiếp tục — server sẽ kiểm tra tồn kho khi addToCart
        console.warn("Không thể lấy giỏ hàng để kiểm tra số lượng:", err);
      }

      if (existingQty + 1 > product.stock) {
        setFly(false);
        const available = Math.max(0, product.stock - existingQty);
        if (available <= 0) {
          toast.error(`⚠️ Không thể thêm sản phẩm. Trong giỏ đã có ${existingQty} / tồn ${product.stock}.`, {
            position: "top-right",
            autoClose: 3000,
          });
        } else {
          toast.warning(`📦 Chỉ còn ${available} sản phẩm. Vui lòng điều chỉnh số lượng.`, {
            position: "top-right",
            autoClose: 3000,
          });
        }
        return;
      }

      await cartService.addToCart({ productId: product.id, quantity: 1 });
      // cartService đã dispatch event cartUpdated với detail, không cần dispatch lại
      toast.success(`✅ Đã thêm "${product.name}" vào giỏ!`, {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err: unknown) {
      console.error("❌ Lỗi thêm sản phẩm vào giỏ hàng:", err);
      // Nếu server trả lỗi về tồn kho, hiển thị thông báo rõ ràng
      const message = err instanceof Error ? err.message : String(err) || "Thêm giỏ hàng thất bại!";
      toast.error(`❌ ${message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Mua ngay - đồng bộ với số lượng trong giỏ hàng nếu đã có
  const handleBuyNow = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Sellers are not allowed to purchase
    if (role === "seller") {
      toast.error("Tài khoản seller không được phép mua hàng.", { position: "top-right", autoClose: 3000 });
      return;
    }

    // Nếu chưa đăng nhập -> mở modal đăng nhập
    if (!user) {
      window.dispatchEvent(new Event("openLogin"));
      return;
    }

    try {
      // Kiểm tra nếu đã có trong giỏ thì ưu tiên dùng số lượng đang có
      let desiredQty = 1;
      try {
        const cart: CartResponse = await cartService.getCart();
        const found = cart.items.find((it) => it.productId._id === product.id);
        if (found) desiredQty = found.quantity;
      } catch (err) {
        console.warn("Không thể lấy giỏ hàng khi Mua ngay:", err);
      }

      if (desiredQty > product.stock) {
        toast.error(`⚠️ Sản phẩm chỉ còn ${product.stock}. Vui lòng điều chỉnh số lượng trong giỏ.`, {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      navigate(`/checkout/buy-now/${product.id}`, { state: { quantity: desiredQty } });
    } catch (err) {
      console.error("❌ Lỗi mua ngay:", err);
      toast.error("❌ Mua ngay thất bại!", {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  useEffect(() => {
    setIsFavorite(derivedFavorite);
  }, [derivedFavorite, product.id]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      window.dispatchEvent(new Event("openLogin"));
      return;
    }

    if (favoriteLoading) return;

    const nextState = !isFavorite;
    setFavoriteLoading(true);
    try {
      const response = nextState
        ? await favoriteService.addFavorite(product.id)
        : await favoriteService.removeFavorite(product.id);

      setIsFavorite(nextState);
      setUser((prev) => (prev ? { ...prev, favorites: response.favorites } : prev));
      onFavoriteToggle?.(product.id, nextState);

      toast.success(
        nextState
          ? `❤️ Đã thêm "${product.name}" vào danh sách yêu thích!`
          : `🗑️ Đã bỏ "${product.name}" khỏi yêu thích`,
        {
          position: "top-right",
          autoClose: 2000,
        }
      );
    } catch (err) {
      console.error("❌ Lỗi thao tác yêu thích:", err);
      const message = err instanceof Error ? err.message : "Thao tác yêu thích thất bại";
      toast.error(`❌ ${message}`, {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <>
      {/* Flying Animation */}
      <AnimatePresence>
        {fly && (
          <motion.img
            src={flyThumbnail}
            style={{
              position: "fixed",
              width: 100,
              height: 100,
              borderRadius: 12,
              zIndex: 9999,
              pointerEvents: "none",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            }}
            initial={{ x: flyPos.x, y: flyPos.y, scale: 1, opacity: 1 }}
            animate={{
              x: window.innerWidth - 80,
              y: 20,
              scale: 0.3,
              opacity: 0,
              rotate: 360,
            }}
            transition={{ duration: 1, ease: [0.6, 0.01, 0.05, 0.95] }}
            onAnimationComplete={() => setFly(false)}
          />
        )}
      </AnimatePresence>

      <Card
        onClick={handleViewDetail}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        elevation={0}
        sx={{
          height: "100%",
          borderRadius: 4,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.95)",
          cursor: "pointer",
          position: "relative",
          border: "1px solid",
          borderColor: "rgba(30, 60, 114, 0.08)",
          transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          backdropFilter: "blur(10px)",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #1e3c72, #7e22ce)",
            opacity: 0,
            transition: "opacity 0.3s",
          },
          "&:hover": {
            borderColor: "rgba(126, 34, 206, 0.2)",
            transform: "translateY(-8px)",
            boxShadow: "0 20px 60px rgba(30, 60, 114, 0.18)",
            "&::before": { opacity: 1 },
          },
        }}
      >
        {/* Image Section */}
        <Box
          ref={mediaRef}
          sx={{
            position: "relative",
            overflow: "hidden",
            backgroundColor: "#f8f9ff",
            height: 240,
            "& .slick-dots": {
              bottom: 8,
            },
            "& .slick-dots li button:before": {
              fontSize: 8,
              color: "#fff",
              opacity: 0.7,
            },
            "& .slick-dots li.slick-active button:before": {
              color: "#7e22ce",
              opacity: 1,
            },
          }}
        >
          <Slider {...sliderSettings}>
            {sliderItems.map((slide, index) => (
              <Box key={`${slide.src}-${index}`} sx={{ height: 240 }}>
                {slide.type === "image" ? (
                  <Box
                    component="img"
                    src={slide.src}
                    alt={product.name}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                      transform: isHovered ? "scale(1.08)" : "scale(1)",
                    }}
                  />
                ) : (
                  <Box
                    component="video"
                    src={slide.src}
                    muted
                    loop
                    playsInline
                    autoPlay
                    controls={false}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      backgroundColor: "#000",
                    }}
                  />
                )}
              </Box>
            ))}
          </Slider>
          {/* Badges */}
          <Stack direction="row" spacing={1} sx={{ position: "absolute", top: 12, left: 12, zIndex: 10 }}>
            {product.features?.includes("Hot") && (
              <Chip
                icon={<FlashOnIcon sx={{ fontSize: 16 }} />}
                label="HOT"
                size="small"
                sx={{
                  height: 28,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  color: "#fff",
                  background: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)",
                  boxShadow: "0 4px 15px rgba(255, 65, 108, 0.4)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  "& .MuiChip-icon": { color: "#fff" },
                }}
              />
            )}
            {product.stock < 10 && (
              <Chip
                label={`${product.stock} left`}
                size="small"
                sx={{
                  height: 28,
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  color: "#1e3c72",
                  background: "rgba(255, 204, 0, 0.95)",
                  backdropFilter: "blur(10px)",
                  border: "2px solid rgba(255,255,255,0.3)",
                }}
              />
            )}
          </Stack>

          {/* Favorite Button */}
          <Tooltip title={favoriteLoading ? "Đang xử lý..." : isFavorite ? "Bỏ yêu thích" : "Yêu thích"}>
            <IconButton
              onClick={handleToggleFavorite}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                bgcolor: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(10px)",
                width: 40,
                height: 40,
                transition: "all 0.3s",
                "&:hover": { bgcolor: "rgba(255,255,255,1)", transform: "scale(1.1)" },
                opacity: favoriteLoading ? 0.6 : 1,
              }}
              disabled={favoriteLoading}
            >
              {isFavorite ? (
                <FavoriteIcon sx={{ color: "#FF416C", fontSize: 20 }} />
              ) : (
                <FavoriteBorderIcon sx={{ color: "#1e3c72", fontSize: 20 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Hover Overlay */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: isHovered ? "100%" : "0%",
              background: "linear-gradient(to top, rgba(30, 60, 114, 0.9), transparent)",
              transition: "height 0.4s ease",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              pb: 2,
              opacity: isHovered ? 1 : 0,
            }}
          >
            <Button
              variant="contained"
              onClick={handleViewDetail}
              sx={{
                bgcolor: "white",
                color: "#1e3c72",
                fontWeight: 700,
                px: 4,
                py: 1.2,
                borderRadius: 3,
                textTransform: "none",
                fontSize: "0.95rem",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                "&:hover": { bgcolor: "white", transform: "scale(1.05)" },
              }}
            >
              Xem chi tiết
            </Button>
          </Box>
        </Box>

        {/* Content Section */}
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="caption"
            sx={{
              color: "#7e22ce",
              fontWeight: 700,
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              mb: 1,
              display: "block",
            }}
          >
            {product.category || "Sản phẩm"}
          </Typography>

          {/* Shop info */}
          {product.shopId && (
            <Typography variant="caption" sx={{ display: "block", mb: 1.5, color: "text.secondary", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); navigate(`/shop/${product.shopId}`); }}>
              📦 {product.shopName ?? "Xem shop"}
            </Typography>
          )}

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: "1.1rem",
              mb: 1,
              height: 48,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.4,
              color: "#1e3c72",
            }}
          >
            {product.name}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontSize: "0.85rem",
              height: 40,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.5,
              mb: 2,
            }}
          >
            {product.description}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Rating
              value={product.rating || 0}
              precision={0.5}
              readOnly
              size="small"
              sx={{ "& .MuiRating-iconFilled": { color: "#FFC107" } }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              ({product.rating?.toFixed(1) || "0.0"})
            </Typography>
          </Stack>

          <Box sx={{ bgcolor: "rgba(30, 60, 114, 0.05)", borderRadius: 2, p: 2, mb: 2, border: "1px solid rgba(30, 60, 114, 0.1)" }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: 1,
                display: "block",
                mb: 0.5,
              }}
            >
              Giá bán
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                background: "linear-gradient(135deg, #1e3c72 0%, #7e22ce 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: "1.6rem",
              }}
            >
              {product.price.toLocaleString("vi-VN")}₫
            </Typography>
          </Box>

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleAddToCart}
              startIcon={<ShoppingCartIcon />}
              sx={{
                height: 44,
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
                boxShadow: "0 4px 15px rgba(30, 60, 114, 0.3)",
                transition: "all 0.3s",
                "&:hover": { background: "linear-gradient(135deg, #2a5298 0%, #1e3c72 100%)", boxShadow: "0 6px 25px rgba(30, 60, 114, 0.4)", transform: "translateY(-2px)" },
              }}
            >
              Thêm vào giỏ
            </Button>

            <Button
              variant="contained"
              fullWidth
              onClick={handleBuyNow}
              startIcon={<FlashOnIcon />}
              sx={{
                height: 44,
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.95rem",
                background: "linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)",
                boxShadow: "0 4px 15px rgba(126, 34, 206, 0.3)",
                transition: "all 0.3s",
                "&:hover": { background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)", boxShadow: "0 6px 25px rgba(126, 34, 206, 0.4)", transform: "translateY(-2px)" },
              }}
            >
              Mua ngay
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
