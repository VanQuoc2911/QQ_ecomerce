import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { productService, type ApiProduct, type ProductResponse } from "../../api/productService";
import ProductCard from "../../components/user/ProductCard";
import { useApi } from "../../hooks/useApi";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

export default function ProductList() {
  const { data: productResponse, loading, error } = useApi<ProductResponse>(
    () => productService.getProducts({ page: 1, limit: 20 }),
    []
  );

  if (loading) {
    return (
      <Container sx={{ py: 4, display: "flex", justifyContent: "center" }}>
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

  const products: ApiProduct[] = productResponse?.items ?? [];

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Danh sách sản phẩm
      </Typography>

      {products.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Không có sản phẩm nào
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {products.map((product) => {
            const productCard: ProductCardType = {
              id: product._id,
              name: product.title,
              price: product.price,
              images: product.images,
              category: product.categories.join(", "),
              description: product.description,
              stock: product.stock,
              rating: 0,
            };

            return (
              <Grid item xs={12} sm={6} md={3} key={product._id}>
                <ProductCard product={productCard} />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
