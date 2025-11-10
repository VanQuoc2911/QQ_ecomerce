import CachedIcon from "@mui/icons-material/Cached";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Fade,
  Rating,
  Stack,
  Typography,
  Zoom,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import { cartService, type CartItem } from "../../api/cartService";
import type { ApiProduct } from "../../api/productService";
import { productService } from "../../api/productService";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [flyAnim, setFlyAnim] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const productImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!id) return;
    productService
      .getProductById(id)
      .then(setProduct)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    const item: CartItem = { productId: product._id, quantity };
    try {
      setAddingToCart(true);

      // Hiệu ứng bay vào giỏ hàng
      setFlyAnim(true);
      setTimeout(() => {
        setFlyAnim(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }, 800);

      await cartService.addToCart(item);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {
      // Không hiện thông báo
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    const item: CartItem = { productId: product._id, quantity };
    try {
      await cartService.addToCart(item);
      window.dispatchEvent(new Event("cartUpdated"));
      navigate("/checkout");
    } catch {
      // Không hiện thông báo
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

  if (!product)
    return (
      <Container sx={{ py: 8 }}>
        <Typography variant="h6" color="text.secondary" textAlign="center">
          Không tìm thấy sản phẩm.
        </Typography>
      </Container>
    );

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  return (
    <Box sx={{ background: "linear-gradient(to bottom, #f0f9ff 0%, #ffffff 100%)", minHeight: "100vh" }}>
      <Container sx={{ py: 6, position: "relative" }}>
        {/* Thông báo thêm vào giỏ hàng thành công */}
        <Zoom in={showSuccess}>
          <Box
            sx={{
              position: "fixed",
              top: 100,
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

        <Fade in={!loading} timeout={800}>
          <Grid container spacing={5}>
            {/* Cột hình ảnh */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  background: "#fff",
                  borderRadius: 4,
                  p: 3,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: "0 8px 30px rgba(102, 126, 234, 0.15)",
                    transform: "translateY(-4px)",
                  },
                }}
              >
                <Slider {...settings}>
                  {product.images?.map((img, idx) => (
                    <Box key={idx} sx={{ position: "relative", overflow: "hidden", borderRadius: 3 }}>
                      <Box
                        ref={idx === 0 ? productImgRef : null}
                        component="img"
                        src={img.startsWith("http") ? img : `https://via.placeholder.com/600x400?text=No+Image`}
                        alt={product.title}
                        sx={{
                          width: "100%",
                          height: "auto",
                          borderRadius: 3,
                          transition: "transform 0.5s ease",
                          "&:hover": { transform: "scale(1.05)" },
                        }}
                      />
                    </Box>
                  ))}
                </Slider>
              </Box>

              {/* Badges đặc điểm */}
              <Grid container spacing={2} mt={3}>
                {[
                  { icon: <LocalShippingIcon />, text: "Miễn phí vận chuyển" },
                  { icon: <VerifiedUserIcon />, text: "Bảo hành chính hãng" },
                  { icon: <CachedIcon />, text: "Đổi trả 30 ngày" },
                ].map((badge, i) => (
                  <Grid item xs={12} sm={4} key={i}>
                    <Box
                      sx={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#fff",
                        p: 2,
                        borderRadius: 3,
                        textAlign: "center",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-5px)",
                          boxShadow: "0 8px 20px rgba(102, 126, 234, 0.3)",
                        },
                      }}
                    >
                      {badge.icon}
                      <Typography fontSize={13} fontWeight={600} mt={1}>
                        {badge.text}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Cột thông tin */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  background: "#fff",
                  borderRadius: 4,
                  p: 4,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                }}
              >
                <Stack spacing={3}>
                  {/* Tiêu đề */}
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      lineHeight: 1.3,
                    }}
                  >
                    {product.title}
                  </Typography>

                  {/* Đánh giá */}
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Rating value={product.Rating || 4.5} readOnly precision={0.5} size="large" />
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      ({Math.floor(Math.random() * 100)} đánh giá)
                    </Typography>
                  </Stack>

                  {/* Giá */}
                  <Box
                    sx={{
                      background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
                      p: 3,
                      borderRadius: 3,
                      border: "2px solid #667eea30",
                    }}
                  >
                    <Typography variant="h3" fontWeight={900} color="#667eea">
                      {product.price.toLocaleString("vi-VN")}₫
                    </Typography>
                  </Box>

                  {/* Tồn kho */}
                  <Box>
                    {product.stock > 0 ? (
                      <Chip
                        label={`✓ Còn ${product.stock} sản phẩm`}
                        sx={{
                          background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 15,
                          px: 2,
                          py: 2.5,
                        }}
                      />
                    ) : (
                      <Chip
                        label="✕ Hết hàng"
                        sx={{
                          background: "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 15,
                          px: 2,
                          py: 2.5,
                        }}
                      />
                    )}
                  </Box>

                  {/* Mô tả */}
                  <Box
                    sx={{
                      background: "#f8fafc",
                      p: 3,
                      borderRadius: 3,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
                      {product.description}
                    </Typography>
                  </Box>

                  {/* Chọn số lượng */}
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} mb={1.5} color="#667eea">
                      Số lượng:
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Button
                        variant="outlined"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        sx={{
                          minWidth: 45,
                          height: 45,
                          borderRadius: 2,
                          borderColor: "#667eea",
                          color: "#667eea",
                          fontWeight: 700,
                          fontSize: 20,
                          "&:hover": { borderColor: "#764ba2", background: "#667eea10" },
                        }}
                      >
                        -
                      </Button>
                      <Typography
                        sx={{
                          width: 60,
                          textAlign: "center",
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#667eea",
                        }}
                      >
                        {quantity}
                      </Typography>
                      <Button
                        variant="outlined"
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        disabled={quantity >= product.stock}
                        sx={{
                          minWidth: 45,
                          height: 45,
                          borderRadius: 2,
                          borderColor: "#667eea",
                          color: "#667eea",
                          fontWeight: 700,
                          fontSize: 20,
                          "&:hover": { borderColor: "#764ba2", background: "#667eea10" },
                        }}
                      >
                        +
                      </Button>
                    </Stack>
                  </Box>

                  {/* Nút hành động */}
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3}>
                    <Button
                      variant="contained"
                      disabled={addingToCart || product.stock === 0}
                      onClick={handleAddToCart}
                      startIcon={<ShoppingCartIcon />}
                      sx={{
                        flex: 1,
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        borderRadius: 3,
                        px: 4,
                        py: 2,
                        fontSize: 16,
                        fontWeight: 800,
                        textTransform: "none",
                        boxShadow: "0 8px 20px rgba(102, 126, 234, 0.3)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                          transform: "translateY(-3px)",
                          boxShadow: "0 12px 28px rgba(102, 126, 234, 0.4)",
                        },
                        "&:disabled": {
                          background: "#e2e8f0",
                          color: "#94a3b8",
                        },
                      }}
                    >
                      {addingToCart ? (
                        <CircularProgress size={24} sx={{ color: "#fff" }} />
                      ) : (
                        "Thêm vào giỏ"
                      )}
                    </Button>

                    <Button
                      variant="contained"
                      disabled={product.stock === 0}
                      onClick={handleBuyNow}
                      sx={{
                        flex: 1,
                        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        borderRadius: 3,
                        px: 4,
                        py: 2,
                        fontSize: 16,
                        fontWeight: 800,
                        textTransform: "none",
                        boxShadow: "0 8px 20px rgba(245, 87, 108, 0.3)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          background: "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)",
                          transform: "translateY(-3px)",
                          boxShadow: "0 12px 28px rgba(245, 87, 108, 0.4)",
                        },
                        "&:disabled": {
                          background: "#e2e8f0",
                          color: "#94a3b8",
                        },
                      }}
                    >
                      Mua Ngay
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Fade>

        {/* Hiệu ứng bay vào giỏ hàng */}
        {flyAnim && productImgRef.current && (
          <Box
            component="img"
            src={product.images?.[0] || ""}
            alt=""
            sx={{
              position: "fixed",
              width: 100,
              height: 100,
              borderRadius: 3,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              top: productImgRef.current.getBoundingClientRect().top,
              left: productImgRef.current.getBoundingClientRect().left,
              zIndex: 9999,
              animation: "fly-to-cart 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
            }}
          />
        )}

        {/* CSS animations */}
        <style>
          {`
            @keyframes fly-to-cart {
              0% { 
                transform: translate(0, 0) scale(1) rotate(0deg); 
                opacity: 1; 
              }
              50% {
                transform: translate(calc(50vw - 50px), -100px) scale(0.5) rotate(180deg);
                opacity: 0.8;
              }
              100% { 
                transform: translate(calc(100vw - 80px), -80px) scale(0.1) rotate(360deg); 
                opacity: 0; 
              }
            }

            .slick-dots li button:before {
              color: #667eea !important;
              font-size: 10px !important;
            }

            .slick-dots li.slick-active button:before {
              color: #764ba2 !important;
            }

            .slick-prev:before, .slick-next:before {
              color: #667eea !important;
            }
          `}
        </style>
      </Container>
    </Box>
  );
}