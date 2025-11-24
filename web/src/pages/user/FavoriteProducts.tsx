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
        p: 4,
        textAlign: "center",
        borderRadius: 4,
        background: "rgba(255,255,255,0.9)",
        boxShadow: "0 18px 40px rgba(102,126,234,0.2)",
      }}
    >
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Đăng nhập để xem danh sách yêu thích
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Bạn có thể lưu lại các sản phẩm yêu thích và truy cập nhanh tại đây.
      </Typography>
      <Button
        variant="contained"
        startIcon={<FavoriteIcon />}
        onClick={() => window.dispatchEvent(new Event("openLogin"))}
        sx={{
          px: 4,
          py: 1.5,
          borderRadius: 3,
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          fontWeight: 700,
          textTransform: "none",
        }}
      >
        Đăng nhập ngay
      </Button>
    </Paper>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7ff 0%, #fff 100%)",
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        <Stack direction="row" alignItems="center" spacing={2} mb={4}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(240,147,251,0.35)",
            }}
          >
            <FavoriteIcon sx={{ color: "#fff", fontSize: 30 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800} color="#1f2a44">
              Sản phẩm yêu thích
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Nơi lưu giữ tất cả sản phẩm khiến bạn ấn tượng
            </Typography>
          </Box>
        </Stack>

        {!user && renderGuestState()}

        {user && (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : favorites.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 6,
                  textAlign: "center",
                  borderRadius: 4,
                  border: "1px dashed rgba(102,126,234,0.4)",
                  background: "rgba(255,255,255,0.9)",
                }}
              >
                <SentimentDissatisfiedIcon sx={{ fontSize: 72, color: "#c4c4c4", mb: 2 }} />
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  Chưa có sản phẩm yêu thích
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Hãy khám phá cửa hàng và nhấn ❤️ để lưu lại sản phẩm bạn thích nhé!
                </Typography>
                <Button
                  component={Link}
                  to="/products"
                  variant="contained"
                  sx={{
                    px: 4,
                    py: 1.5,
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  }}
                >
                  Khám phá sản phẩm
                </Button>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {favorites.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <ProductCard product={product} onFavoriteToggle={handleFavoriteToggle} />
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
