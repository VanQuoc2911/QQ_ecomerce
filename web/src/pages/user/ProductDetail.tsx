import {
  Box,
  Button,
  CircularProgress,
  Container,
  Rating,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { ApiProduct } from "../../api/productService";
import { productService } from "../../api/productService";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  if (id) {
    productService
      .getProductById(id)
      .then(setProduct)
      .catch((err) => {
        console.error("❌ Lỗi khi tải sản phẩm:", err);
      })
      .finally(() => setLoading(false));
  }
}, [id]);

  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
        <Typography mt={2}>Đang tải chi tiết sản phẩm...</Typography>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container sx={{ py: 8 }}>
        <Typography variant="h6" color="text.secondary" textAlign="center">
          Không tìm thấy sản phẩm.
        </Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 6 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
        <Box
          component="img"
          src={
            product.images?.[0]?.startsWith("http")
              ? product.images[0]
              : `https://via.placeholder.com/${product.images?.[0] || "600x400?text=No+Image"}`
          }
          alt={product.title}
          sx={{
            width: "100%",
            borderRadius: 2,
            objectFit: "cover",
            boxShadow: 4,
          }}
        />

        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {product.title}
          </Typography>

          <Rating
            value={product.Rating || 4.5}
            readOnly
            precision={0.5}
            sx={{ mb: 2 }}
          />

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 3, whiteSpace: "pre-line" }}
          >
            {product.description}
          </Typography>

          <Typography
            variant="h5"
            color="primary.main"
            fontWeight={700}
            sx={{ mb: 3 }}
          >
            {product.price.toLocaleString("vi-VN")}₫
          </Typography>

          <Button
            variant="contained"
            sx={{
              background: "linear-gradient(90deg, #007BFF 0%, #00C6FF 100%)",
              borderRadius: 2,
              px: 4,
              py: 1.5,
              fontWeight: 600,
              "&:hover": {
                background: "linear-gradient(90deg, #0062E6 0%, #33AEFF 100%)",
              },
            }}
          >
            Thêm vào giỏ hàng
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}
