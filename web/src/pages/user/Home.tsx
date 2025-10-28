import { Alert, Box, CircularProgress, Container, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { productService } from "../../api/productService";
import ProductCard from "../../components/user/ProductCard";
import { useApi } from "../../hooks/useApi";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

export default function Home() {
  const { data: productResponse, loading, error } = useApi(
    () => productService.getProducts({ 
      page: 1, 
      limit: 8,
      status: 'approved' // Chỉ hiển thị sản phẩm đã duyệt
    }),
    []
  );

  if (loading) {
    return (
      <Container sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  const products = productResponse?.products || [];

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Sản phẩm nổi bật
      </Typography>
      {products.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Không có sản phẩm nào
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {products.map((product) => {
            const productCard: ProductCardType = {
              id: String(product.id),
              name: product.title,
              price: product.price,
              images: product.image && product.image.trim() !== '' ? [product.image] : [],
              category: "",
              description: product.description,
              stock: product.stock,
              rating: 0,
            };
            return (
              <Grid item xs={12} sm={6} md={3} key={product.id}>
                <ProductCard product={productCard} />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
