import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Fade,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { motion } from "framer-motion";
import { productService } from "../../api/productService";
import ProductCard from "../../components/user/ProductCard";
import { useApi } from "../../hooks/useApi";
import type { ProductResponse } from "../../types/Product";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

export default function Home() {
  const {
    data: productResponse,
    loading,
    error,
  } = useApi<ProductResponse>(
    () =>
      productService.getProducts({
        page: 1,
        limit: 8,
        status: "approved",
      }),
    []
  );

  if (loading) {
    return (
      <Container
        sx={{
          py: 6,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "70vh",
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={50} thickness={4} />
          <Typography color="text.secondary">Đang tải sản phẩm...</Typography>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Đã xảy ra lỗi khi tải dữ liệu: {error}
        </Alert>
      </Container>
    );
  }

  const products = productResponse?.items || [];

  return (
    <Container sx={{ py: 6 }}>
      <Fade in timeout={700}>
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            gutterBottom
            sx={{
              background: "linear-gradient(90deg, #007BFF 0%, #00C6FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 4,
            }}
          >
            ✨ Sản phẩm nổi bật
          </Typography>

          {products.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="h6" color="text.secondary">
                Không có sản phẩm nào được duyệt hiển thị.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {products.map((product, index) => {
                const productCard: ProductCardType = {
                  id: String(product._id),
                  name: product.title,
                  price: product.price,
                  images: product.images,
                  // fix chỗ này: nếu categories là mảng → join lại
                  category: Array.isArray(product.categories)
                    ? product.categories.join(", ")
                    : product.categories ?? "",
                  description: product.description,
                  stock: product.stock,
                  rating: product.Rating ?? 0,
                };

                return (
                  <Grid item xs={12} sm={6} md={3} key={product._id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.1,
                      }}
                    >
                      <ProductCard product={productCard} />
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Fade>
    </Container>
  );
}
