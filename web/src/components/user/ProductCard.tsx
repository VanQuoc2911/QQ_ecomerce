import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Rating,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cartService } from "../../api/cartService";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

interface Props {
  product: ProductCardType;
}

export default function ProductCard({ product }: Props) {
  const navigate = useNavigate();
  const imgRef = useRef<HTMLImageElement>(null);
  const [fly, setFly] = useState(false);
  const [flyPos, setFlyPos] = useState({ x: 0, y: 0 });
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleViewDetail = () => {
    navigate(`/products/${product.id}`);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!imgRef.current) return;

    const rect = imgRef.current.getBoundingClientRect();
    setFlyPos({ x: rect.left, y: rect.top });
    setFly(true);

    try {
      await cartService.addToCart({ productId: product.id, quantity: 1 });
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("❌ Lỗi thêm sản phẩm vào giỏ hàng:", err);
      alert("Thêm giỏ hàng thất bại!");
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(
      "buyNow",
      JSON.stringify([{ productId: product.id, quantity: 1 }])
    );
    navigate("/checkout");
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <>
      {/* Flying Animation */}
      <AnimatePresence>
        {fly && (
          <motion.img
            src={product.images?.[0] || ""}
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
              rotate: 360 
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
            "&::before": {
              opacity: 1,
            },
          },
        }}
      >
        {/* Image Section */}
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            backgroundColor: "#f8f9ff",
            height: 240,
          }}
        >
          {/* Badges */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 10,
            }}
          >
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
                  "& .MuiChip-icon": {
                    color: "#fff",
                  },
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
          <Tooltip title={isFavorite ? "Bỏ yêu thích" : "Yêu thích"}>
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
                "&:hover": {
                  bgcolor: "rgba(255,255,255,1)",
                  transform: "scale(1.1)",
                },
              }}
            >
              {isFavorite ? (
                <FavoriteIcon sx={{ color: "#FF416C", fontSize: 20 }} />
              ) : (
                <FavoriteBorderIcon sx={{ color: "#1e3c72", fontSize: 20 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Product Image */}
          <CardMedia
            ref={imgRef}
            component="img"
            height="240"
            image={product.images?.[0] || "web/src/assets/logo.jpg"}
            alt={product.name}
            sx={{
              objectFit: "cover",
              transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              transform: isHovered ? "scale(1.1)" : "scale(1)",
            }}
          />

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
                "&:hover": {
                  bgcolor: "white",
                  transform: "scale(1.05)",
                },
              }}
            >
              Xem chi tiết
            </Button>
          </Box>
        </Box>

        {/* Content Section */}
        <CardContent sx={{ p: 3 }}>
          {/* Category */}
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

          {/* Product Name */}
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

          {/* Description */}
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

          {/* Rating */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Rating
              value={product.rating || 0}
              precision={0.5}
              readOnly
              size="small"
              sx={{
                "& .MuiRating-iconFilled": {
                  color: "#FFC107",
                },
              }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              ({product.rating?.toFixed(1) || "0.0"})
            </Typography>
          </Stack>

          {/* Price */}
          <Box
            sx={{
              bgcolor: "rgba(30, 60, 114, 0.05)",
              borderRadius: 2,
              p: 2,
              mb: 2,
              border: "1px solid rgba(30, 60, 114, 0.1)",
            }}
          >
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

          {/* Action Buttons */}
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
                "&:hover": {
                  background: "linear-gradient(135deg, #2a5298 0%, #1e3c72 100%)",
                  boxShadow: "0 6px 25px rgba(30, 60, 114, 0.4)",
                  transform: "translateY(-2px)",
                },
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
                "&:hover": {
                  background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                  boxShadow: "0 6px 25px rgba(126, 34, 206, 0.4)",
                  transform: "translateY(-2px)",
                },
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