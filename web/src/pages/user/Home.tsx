import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SearchIcon from "@mui/icons-material/Search";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Fade,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { motion } from "framer-motion";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import { productService } from "../../api/productService";
import ProductCard from "../../components/user/ProductCard";
import { useAuth } from "../../context/AuthContext";
import type { ProductResponse } from "../../types/Product";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [productResponse, setProductResponse] = useState<ProductResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState("");

  useEffect(() => {
    productService
      .getProducts({ page: 1, limit: 12, status: "approved" })
      .then(setProductResponse)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const products = useMemo(() => productResponse?.items ?? [], [productResponse]);

  const featuredCategories = useMemo(() => {
    const bucket = new Set<string>();
    products.forEach((product) => {
      const rawCats = Array.isArray(product.categories)
        ? product.categories
        : typeof product.categories === "string"
          ? [product.categories]
          : [];
      rawCats.filter(Boolean).forEach((cat) => bucket.add(cat));
    });
    return Array.from(bucket).slice(0, 8);
  }, [products]);

  const curatedProducts = useMemo(() => products.slice(0, 12), [products]);

  const hotProducts = useMemo(
    () =>
      products
        .filter((p) => p.stock < 8 || (p.Rating ?? 0) >= 4.5)
        .slice(0, 5),
    [products]
  );

  const trendingProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.Rating ?? 0) - (a.Rating ?? 0))
        .slice(0, 3),
    [products]
  );

  const heroStats = useMemo(
    () => [
      {
        label: "Sản phẩm chính hãng",
        value: (productResponse?.total ?? products.length).toLocaleString("vi-VN"),
      },
      { label: "Thương hiệu uy tín", value: "120+" },
      { label: "Điểm hài lòng", value: "4.9/5" },
    ],
    [productResponse?.total, products.length]
  );

  const featureHighlights = [
    {
      icon: AutoAwesomeIcon,
      title: "Giao diện tinh tế",
      description: "Trải nghiệm mua sắm sống động với chuyển động mềm mại và layout trực quan.",
    },
    {
      icon: LocalShippingIcon,
      title: "Giao hàng linh hoạt",
      description: "Kết nối mạng lưới shipper toàn quốc cùng nhiều tuỳ chọn vận chuyển.",
    },
    {
      icon: WorkspacePremiumIcon,
      title: "Đảm bảo chính hãng",
      description: "Từng sản phẩm đều được kiểm duyệt kỹ càng trước khi hiển thị.",
    },
    {
      icon: HeadsetMicIcon,
      title: "Hỗ trợ tận tâm",
      description: "Đội ngũ AI & CSKH 24/7 đồng hành trong từng đơn hàng.",
    },
  ];

  const spotlightProduct = hotProducts[0];

  const handleHeroSearch = () => {
    const keyword = heroSearch.trim();
    if (!keyword) return;
    navigate(`/products?q=${encodeURIComponent(keyword)}`);
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background particles */}
        <Box sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            animation: 'float 6s ease-in-out infinite'
          },
          '&::before': {
            top: '10%',
            left: '10%',
            animationDelay: '0s'
          },
          '&::after': {
            bottom: '10%',
            right: '10%',
            animationDelay: '3s'
          },
          '@keyframes float': {
            '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
            '50%': { transform: 'translate(30px, -30px) scale(1.1)' }
          }
        }} />
        
        <Stack alignItems="center" spacing={3} sx={{ position: 'relative', zIndex: 1 }}>
          <CircularProgress 
            size={70} 
            thickness={4}
            sx={{
              color: '#fff',
              filter: 'drop-shadow(0 4px 20px rgba(255,255,255,0.3))'
            }}
          />
          <Typography 
            variant="h6"
            sx={{ 
              color: 'white',
              fontWeight: 600,
              letterSpacing: 1
            }}
          >
            Đang tải sản phẩm...
          </Typography>
        </Stack>
      </Box>
    );
  }

  const bannerSettings = {
    dots: true,
    infinite: true,
    autoplay: true,
    speed: 800,
    autoplaySpeed: 5000,
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: true,
    pauseOnHover: true,
    appendDots: (dots: React.ReactNode) => (
      <Box sx={{ 
        bottom: 20,
        '& li button': {
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
        },
        '& li.slick-active button': {
          width: 30,
          borderRadius: 5,
          background: 'white',
        }
      }}>
        <ul style={{ margin: 0, padding: 0, display: 'flex', justifyContent: 'center', gap: '8px' }}>{dots}</ul>
      </Box>
    ),
  };

  return (
    <Box
        sx={{
          backgroundColor: "#f5f7fb",
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
        component="section"
        sx={{
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 45%, #fdf2f8 100%)",
          py: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <Chip
                  label="Giao diện mua sắm mới"
                  sx={{
                    width: "fit-content",
                    fontWeight: 600,
                    letterSpacing: 1,
                    bgcolor: "rgba(255,255,255,0.7)",
                    color: "#1e3a8a",
                    borderRadius: 999,
                    px: 2,
                  }}
                />

                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "2.2rem", md: "3.5rem" },
                    lineHeight: 1.2,
                    color: "#0f172a",
                  }}
                >
                  Chạm tới phong cách mới
                  <br /> với {productResponse?.total?.toLocaleString("vi-VN") ?? ""} sản phẩm độc đáo
                </Typography>

                <Typography sx={{ color: "rgba(15,23,42,0.7)", maxWidth: 520, fontSize: { xs: "1rem", md: "1.1rem" } }}>
                  Kho hàng thông minh kết hợp AI gợi ý, giúp bạn săn ưu đãi chỉ trong vài giây. Thiết kế mới chú trọng trải nghiệm
                  thị giác, tốc độ và cảm giác tin cậy.
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button size="large" variant="contained" onClick={() => navigate("/products")} sx={{ borderRadius: 999, px: 4 }}>
                    Khám phá ngay
                  </Button>
                  <Button
                    size="large"
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate("/favorites")}
                    sx={{ borderRadius: 999, px: 4 }}
                  >
                    Bộ sưu tập của bạn
                  </Button>
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
                  <TextField
                    value={heroSearch}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setHeroSearch(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleHeroSearch();
                      }
                    }}
                    placeholder="Tìm kiếm sản phẩm, thương hiệu, danh mục..."
                    fullWidth
                    sx={{
                      bgcolor: "white",
                      borderRadius: 3,
                      flex: 1,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 3,
                        px: 2,
                        py: 0.5,
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: "#94a3b8" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    size="large"
                    variant="contained"
                    color="secondary"
                    sx={{ minWidth: { xs: "100%", md: 180 }, borderRadius: 2 }}
                    onClick={handleHeroSearch}
                  >
                    Tìm kiếm nhanh
                  </Button>
                </Stack>

                <Grid container spacing={2}>
                  {heroStats.map((stat) => (
                    <Grid item xs={12} sm={4} key={stat.label}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          backgroundColor: "rgba(255,255,255,0.9)",
                          border: "1px solid rgba(148,163,184,0.3)",
                        }}
                      >
                        <Typography variant="h4" sx={{ fontWeight: 800, color: "#1d4ed8" }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#475569", fontWeight: 600 }}>
                          {stat.label}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    bgcolor: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(148,163,184,0.25)",
                    boxShadow: "0 25px 70px rgba(15,23,42,0.12)",
                  }}
                >
                  {spotlightProduct ? (
                    <Stack spacing={3}>
                      <Box
                        component="img"
                        src={spotlightProduct.images?.[0] || "https://via.placeholder.com/480x360?text=Product"}
                        alt={spotlightProduct.title}
                        sx={{
                          width: "100%",
                          height: { xs: 240, md: 280 },
                          objectFit: "cover",
                          borderRadius: 3,
                        }}
                      />
                      <Stack spacing={1}>
                        <Chip label="Đề xuất bởi AI" color="primary" sx={{ width: "fit-content" }} />
                        <Typography variant="h5" sx={{ fontWeight: 700, color: "#0f172a" }}>
                          {spotlightProduct.title}
                        </Typography>
                        <Typography sx={{ color: "#64748b" }}>
                          {spotlightProduct.description?.slice(0, 90)}...
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: "#1d4ed8" }}>
                          {spotlightProduct.price.toLocaleString("vi-VN")}₫
                        </Typography>
                      </Stack>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <Chip label={`Còn ${spotlightProduct.stock} sản phẩm`} color="secondary" sx={{ fontWeight: 600 }} />
                        <Button fullWidth variant="contained" onClick={() => navigate(`/products/${spotlightProduct._id}`)}>
                          Xem chi tiết
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack spacing={2} alignItems="center" textAlign="center">
                      <Typography variant="h5" fontWeight={700}>
                        Khởi động hành trình mua sắm
                      </Typography>
                      <Typography color="text.secondary">
                        Cập nhật sản phẩm nổi bật ngay khi bạn khám phá danh mục.
                      </Typography>
                      <Button variant="contained" onClick={() => navigate("/products")}>Khám phá ngay</Button>
                    </Stack>
                  )}
                </Paper>
              </motion.div>
            </Grid>
          </Grid>
        </Container>

        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.2), transparent 45%)",
            opacity: 0.8,
          }}
        />
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 5, md: 8 } }}>
        <Grid container spacing={3}>
          {featureHighlights.map((feature) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  height: "100%",
                  bgcolor: "white",
                  border: "1px solid rgba(226,232,240,0.8)",
                  boxShadow: "0 15px 40px rgba(15,23,42,0.08)",
                }}
              >
                <Avatar sx={{ bgcolor: "#e0f2fe", color: "#0369a1", mb: 2 }}>
                  <feature.icon />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {feature.title}
                </Typography>
                <Typography sx={{ color: "text.secondary", lineHeight: 1.6 }}>{feature.description}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {featuredCategories.length > 0 && (
        <Container maxWidth="xl" sx={{ pb: { xs: 5, md: 7 } }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              background: "linear-gradient(120deg, rgba(255,255,255,0.95), rgba(219,234,254,0.9))",
              border: "1px solid rgba(148,163,184,0.3)",
            }}
          >
            <Stack spacing={2}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Danh mục được yêu thích
              </Typography>
              <Typography color="text.secondary">
                Chạm nhanh vào danh mục bạn quan tâm để xem toàn bộ sản phẩm liên quan.
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {featuredCategories.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    onClick={() => navigate(`/products?category=${encodeURIComponent(cat)}`)}
                    sx={{
                      borderRadius: 999,
                      px: 2,
                      fontWeight: 600,
                      bgcolor: "white",
                      border: "1px solid rgba(148,163,184,0.4)",
                    }}
                  />
                ))}
              </Box>
            </Stack>
          </Paper>
        </Container>
      )}

      {trendingProducts.length > 0 && (
        <Container maxWidth="xl" sx={{ pb: { xs: 5, md: 7 } }}>
          <Stack spacing={3}>
            <Box textAlign="center">
              <Typography variant="overline" sx={{ letterSpacing: 4, color: "#6366f1", fontWeight: 700 }}>
                Xu hướng tuần này
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                Được tìm kiếm nhiều nhất
              </Typography>
            </Box>
            <Grid container spacing={3}>
              {trendingProducts.map((product) => (
                <Grid item xs={12} md={4} key={product._id}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      height: "100%",
                      bgcolor: "white",
                      border: "1px solid rgba(226,232,240,0.9)",
                      boxShadow: "0 20px 40px rgba(15,23,42,0.1)",
                    }}
                  >
                    <Stack spacing={2}>
                      <Box
                        component="img"
                        src={product.images?.[0] || "https://via.placeholder.com/400x240?text=Product"}
                        alt={product.title}
                        sx={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 2 }}
                      />
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {product.title}
                      </Typography>
                      <Typography color="text.secondary" sx={{ minHeight: 48 }}>
                        {product.description?.slice(0, 100)}...
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
                          {product.price.toLocaleString("vi-VN")}₫
                        </Typography>
                        <Button variant="text" onClick={() => navigate(`/products/${product._id}`)}>
                          Khám phá
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      )}

      {hotProducts.length > 0 && (
        <Container maxWidth="xl" sx={{ pb: { xs: 6, md: 8 } }}>
          <Stack spacing={2} alignItems="center" textAlign="center" sx={{ mb: 3 }}>
            <Typography variant="overline" sx={{ letterSpacing: 4, color: "#f97316", fontWeight: 700 }}>
              Spotlight
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Sản phẩm đang cháy hàng
            </Typography>
            <Typography color="text.secondary" maxWidth={620}>
              Bộ sưu tập được chọn bằng thuật toán bán chạy & lượt xem thực tế, cập nhật liên tục.
            </Typography>
          </Stack>
          <Box sx={{ borderRadius: 4, overflow: "hidden", boxShadow: "0 30px 60px rgba(15,23,42,0.15)" }}>
            <Slider {...bannerSettings}>
              {hotProducts.map((product) => (
                <Box key={product._id}>
                  <Box
                    sx={{
                      height: { xs: 320, sm: 380, md: 420 },
                      position: "relative",
                      background: `linear-gradient(135deg, rgba(15,23,42,0.75), rgba(30,64,175,0.85)), url(${product.images?.[0] || "https://via.placeholder.com/1920x600"}) center/cover`,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Container maxWidth="lg">
                      <Grid container alignItems="center">
                        <Grid item xs={12} md={8}>
                          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                            <Stack spacing={2.5}>
                              <Chip
                                label="🔥 Đang được săn đón"
                                sx={{
                                  bgcolor: "rgba(255,255,255,0.25)",
                                  color: "white",
                                  fontWeight: 700,
                                  width: "fit-content",
                                  backdropFilter: "blur(6px)",
                                }}
                              />
                              <Typography variant="h3" sx={{ color: "white", fontWeight: 800, lineHeight: 1.1 }}>
                                {product.title}
                              </Typography>
                              <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: { xs: "0.95rem", md: "1.05rem" }, maxWidth: 640 }}>
                                {product.description?.slice(0, 110)}...
                              </Typography>
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                                <Paper sx={{ px: 3, py: 1.5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)" }}>
                                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", letterSpacing: 1 }}>
                                    GIÁ HIỆN TẠI
                                  </Typography>
                                  <Typography variant="h4" sx={{ color: "white", fontWeight: 800 }}>
                                    {product.price.toLocaleString("vi-VN")}₫
                                  </Typography>
                                </Paper>
                                {product.stock < 10 && (
                                  <Chip
                                    label={`Chỉ còn ${product.stock} sản phẩm`}
                                    sx={{ bgcolor: "rgba(251,191,36,0.9)", fontWeight: 700 }}
                                  />
                                )}
                                <Button variant="contained" color="secondary" onClick={() => navigate(`/products/${product._id}`)}>
                                  Mua ngay
                                </Button>
                              </Stack>
                            </Stack>
                          </motion.div>
                        </Grid>
                      </Grid>
                    </Container>
                  </Box>
                </Box>
              ))}
            </Slider>
          </Box>
        </Container>
      )}

      <Container maxWidth="xl" sx={{ pb: { xs: 8, md: 10 } }}>
        <Fade in timeout={600}>
          <Box>
            <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ mb: { xs: 4, md: 6 } }}>
              <Typography variant="overline" sx={{ letterSpacing: 4, color: "#818cf8", fontWeight: 700 }}>
                Bộ sưu tập nổi bật
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>
                Được chọn riêng cho bạn
              </Typography>
              <Typography color="text.secondary" maxWidth={620}>
                Tối ưu bằng dữ liệu thực tế: tồn kho, đánh giá và mức độ yêu thích của cộng đồng.
              </Typography>
              <Button variant="outlined" onClick={() => navigate("/products")} sx={{ borderRadius: 999 }}>
                Xem tất cả sản phẩm →
              </Button>
            </Stack>

            {curatedProducts.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  textAlign: "center",
                  py: 10,
                  background: "white",
                  borderRadius: 3,
                  border: "2px dashed #e0e7ff",
                }}
              >
                <Typography variant="h6" sx={{ color: "text.secondary" }}>
                  Không có sản phẩm nào
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
                {curatedProducts.map((product, index) => {
                  const productCard: ProductCardType = {
                    id: String(product._id),
                    name: product.title,
                    price: product.price,
                    images: product.images,
                    videos: product.videos,
                    category: Array.isArray(product.categories)
                      ? product.categories.join(", ")
                      : product.categories ?? "",
                    description: product.description,
                    stock: product.stock,
                    rating: product.Rating ?? 0,
                    features: product.stock < 5 ? ["Hot"] : [],
                    isFavorite: user?.favorites?.includes(String(product._id)) ?? false,
                  };

                  return (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        whileHover={{ y: -8, transition: { duration: 0.2 } }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            height: "100%",
                            background: "white",
                            borderRadius: 3,
                            overflow: "hidden",
                            boxShadow: "0 2px 12px rgba(102, 126, 234, 0.08)",
                            border: "1px solid rgba(102, 126, 234, 0.08)",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              boxShadow: "0 12px 40px rgba(102, 126, 234, 0.15)",
                              borderColor: "rgba(102, 126, 234, 0.2)",
                            },
                          }}
                        >
                          <ProductCard product={productCard} />
                        </Paper>
                      </motion.div>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}