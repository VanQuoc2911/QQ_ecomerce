import FavoriteIcon from "@mui/icons-material/Favorite";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { favoriteService } from "../../api/favoriteService";
import type { ApiProduct } from "../../api/productService";
import ProductCard from "../../components/user/ProductCard";
import { useAuth } from "../../context/AuthContext";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

const mapApiProductToCard = (product: ApiProduct): ProductCardType => {
  const maybeShop = product.shopId as unknown as string | { _id?: string; shopName?: string; logo?: string } | undefined;
  const shopId = typeof maybeShop === "string" ? maybeShop : maybeShop?._id;
  const shopName = typeof maybeShop === "object" ? maybeShop?.shopName : undefined;
  const shopLogo = typeof maybeShop === "object" ? maybeShop?.logo : undefined;

  return {
    id: product._id,
    name: product.title,
    price: product.price,
    images: product.images,
    videos: product.videos,
    category: Array.isArray(product.categories) ? product.categories.join(", ") : "",
    description: product.description,
    stock: product.stock,
    rating: product.rating ?? product.Rating ?? 0,
    shopId,
    shopName,
    shopLogo,
    isFavorite: true,
  };
};

export default function FavoriteProducts() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<ProductCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!user) {
        setFavorites([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await favoriteService.getFavorites();
        setFavorites(data.map(mapApiProductToCard));
      } catch (err) {
        console.error("Failed to fetch favorites", err);
        setError("Không thể tải danh sách yêu thích. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [user]);

  const handleFavoriteToggle = (productId: string, isFavorite: boolean) => {
    if (!isFavorite) {
      setFavorites((prev) => prev.filter((p) => p.id !== productId));
    }
  };

  const renderGuestState = () => (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 4, md: 6 },
        borderRadius: 5,
        background: "linear-gradient(145deg, rgba(13,24,72,0.95), rgba(33,146,255,0.9))",
        color: "#fff",
        boxShadow: "0 35px 80px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "center",
        justifyContent: "space-between",
        gap: 5,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box sx={{ flex: 1, zIndex: 1 }}>
        <Typography variant="overline" sx={{ letterSpacing: 3, color: "rgba(255,255,255,0.7)" }}>
          FAVORITE HUB
        </Typography>
        <Typography variant="h3" fontWeight={800} sx={{ mb: 2, lineHeight: 1.1 }}>
          Đăng nhập để đồng bộ danh sách yêu thích của bạn
        </Typography>
        <Typography sx={{ mb: 4, color: "rgba(255,255,255,0.75)", maxWidth: 420 }}>
          Săn deal nhanh hơn, theo dõi cửa hàng yêu thích và nhận gợi ý cá nhân hóa chỉ với một cú nhấp.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="contained"
            size="large"
            onClick={() => window.dispatchEvent(new Event("openLogin"))}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              background: "#fff",
              color: "#0d1848",
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "0 12px 30px rgba(255,255,255,0.25)",
            }}
          >
            Đăng nhập ngay
          </Button>
          <Button
            component={Link}
            to="/products"
            variant="outlined"
            size="large"
            sx={{
              px: 4,
              borderRadius: 3,
              borderColor: "rgba(255,255,255,0.4)",
              color: "#fff",
              textTransform: "none",
            }}
          >
            Khám phá sản phẩm
          </Button>
        </Stack>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 260,
          borderRadius: 4,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 2,
          p: 3,
          zIndex: 1,
        }}
      >
        {["Nhanh chóng", "Cá nhân hóa", "Nhắc nhở", "Đồng bộ"].map((item) => (
          <Box
            key={item}
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.35)",
              py: 3,
              px: 2,
              textAlign: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            <FavoriteIcon sx={{ color: "#ffb5ff", mb: 1 }} />
            <Typography fontWeight={700}>{item}</Typography>
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at top right, rgba(255,255,255,0.4), transparent 45%)",
        }}
      />
    </Paper>
  );
  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 15% 20%, #fde7ff 0%, #eef3ff 45%, #f8fbff 100%)",
        py: { xs: 4, md: 8 },
        px: { xs: 2, md: 0 },
      }}
    >
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
            gap: { xs: 4, md: 6 },
            mb: 8,
            background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(247,250,255,0.88))",
            borderRadius: 5,
            p: { xs: 4, md: 6 },
            border: "1px solid rgba(226,232,255,0.9)",
            boxShadow: "0 35px 80px rgba(109,118,255,0.15)",
          }}
        >
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 6, color: "#94a3b8" }}>
              CURATED PICKS
            </Typography>
            <Typography variant="h3" fontWeight={900} sx={{ lineHeight: 1.1, mb: 2, color: "#0f172a" }}>
              Giữ cảm hứng mua sắm mỗi ngày
            </Typography>
            <Typography sx={{ color: "#475569", mb: 4, maxWidth: 480 }}>
              Tất cả sản phẩm bạn đã "thả tim" được gom về một nơi để tiện theo dõi giá, xem lại hình ảnh và quay lại mua khi cần.
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mb: 4 }}>
              {["Lifestyle", "Local brand", "Handmade", "Flash deal"].map((tag) => (
                <Box
                  key={tag}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: 999,
                    background: "rgba(99,102,241,0.08)",
                    color: "#4c1d95",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                  }}
                >
                  {tag}
                </Box>
              ))}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
              {[{ label: "Sản phẩm đã lưu", value: favorites.length || 0 }, { label: "Cửa hàng theo dõi", value: "+12" }].map((item) => (
                <Box key={item.label}>
                  <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>{item.label}</Typography>
                  <Typography variant="h4" fontWeight={800} color="#0f172a">
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
          <Box
            sx={{
              background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(189,206,255,0.65))",
              borderRadius: 4,
              border: "1px solid rgba(190,205,255,0.8)",
              p: 4,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 3,
            }}
          >
            {[
              { title: "Theo dõi giá", desc: "Nhận nhắc nhở khi shop ưu đãi" },
              { title: "Đồng bộ đa thiết bị", desc: "Ghim từ web tới mobile" },
              { title: "Gợi ý thông minh", desc: "Sản phẩm tương tự hợp gu" },
              { title: "Ưu tiên flash sale", desc: "Truy cập nhanh khi sale diễn ra" },
            ].map((feature) => (
              <Box
                key={feature.title}
                sx={{
                  borderRadius: 3,
                  border: "1px solid rgba(15,23,42,0.08)",
                  background: "rgba(255,255,255,0.85)",
                  p: 3,
                  boxShadow: "0 15px 30px rgba(148,163,184,0.25)",
                }}
              >
                <FavoriteIcon sx={{ color: "#fb7185", mb: 1 }} />
                <Typography fontWeight={700} color="#0f172a">
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "#475569" }}>
                  {feature.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {!user && renderGuestState()}

        {user && (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "40vh" }}>
                <CircularProgress size={60} thickness={4} sx={{ color: "#e35d5b" }} />
              </Box>
            ) : favorites.length === 0 ? (
              <Box sx={{ maxWidth: 900, mx: "auto", mt: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 5,
                    p: { xs: 4, md: 6 },
                    background: "linear-gradient(120deg, rgba(255,255,255,0.95), rgba(229,245,255,0.9))",
                    border: "1px solid rgba(209,224,255,0.8)",
                    boxShadow: "0 30px 70px rgba(148,163,184,0.35)",
                  }}
                >
                  <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems="center">
                    <Box sx={{ textAlign: "center" }}>
                      <Box
                        sx={{
                          width: 120,
                          height: 120,
                          borderRadius: "50%",
                          background: "rgba(79,70,229,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mx: "auto",
                          mb: 3,
                        }}
                      >
                        <SentimentDissatisfiedIcon sx={{ fontSize: 54, color: "#6366f1" }} />
                      </Box>
                      <Typography variant="h5" fontWeight={800} color="#0f172a">
                        Chưa có món nào trong danh sách
                      </Typography>
                      <Typography sx={{ color: "#475569", mt: 1 }}>
                        Lưu lại sản phẩm bất cứ khi nào bạn thấy “ưng cái bụng”.
                      </Typography>
                    </Box>
                    <Stack spacing={3} sx={{ flex: 1 }}>
                      {[
                        "Nhấn biểu tượng ♥️ tại trang chi tiết sản phẩm",
                        "Theo dõi cửa hàng để nhận thông báo ưu đãi",
                        "Quay lại mục yêu thích để so sánh nhanh",
                      ].map((step, idx) => (
                        <Box
                          key={step}
                          sx={{
                            display: "flex",
                            gap: 2,
                            alignItems: "center",
                            background: "rgba(255,255,255,0.9)",
                            borderRadius: 4,
                            p: 2.5,
                            border: "1px solid rgba(226,232,255,0.7)",
                          }}
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "#1d4ed8",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                            }}
                          >
                            {idx + 1}
                          </Box>
                          <Typography fontWeight={600} color="#0f172a">
                            {step}
                          </Typography>
                        </Box>
                      ))}
                      <Button
                        component={Link}
                        to="/products"
                        variant="contained"
                        size="large"
                        sx={{
                          alignSelf: { xs: "stretch", md: "flex-start" },
                          px: 4,
                          py: 1.5,
                          borderRadius: 3,
                          textTransform: "none",
                          fontWeight: 700,
                          background: "linear-gradient(120deg, #4338ca, #a855f7)",
                          boxShadow: "0 18px 40px rgba(79,70,229,0.35)",
                        }}
                      >
                        Bắt đầu khám phá
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {favorites.map((product) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                    <Box
                      sx={{
                        height: "100%",
                        transition: "transform 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-8px)",
                        },
                      }}
                    >
                      <ProductCard product={product} onFavoriteToggle={handleFavoriteToggle} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
