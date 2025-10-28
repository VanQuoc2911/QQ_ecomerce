import { Alert, Box, Button, CircularProgress, Container, Rating, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { productService } from "../../api/productService";
import { useCart } from "../../context/CartContext";
import { useApi } from "../../hooks/useApi";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState<string>("");

  const { data: backendProduct, loading, error } = useApi(
    () => productService.getProductById(id!),
    [id]
  );

  if (loading) {
    return (
      <Container sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !backendProduct) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">
          {error || "Không tìm thấy sản phẩm"}
        </Alert>
      </Container>
    );
  }

  const product: ProductCardType = {
    id: String(backendProduct.id),
    name: backendProduct.title,
    price: backendProduct.price,
    images: backendProduct.image && backendProduct.image.trim() !== '' ? [backendProduct.image] : [],
    category: "",
    description: backendProduct.description,
    stock: backendProduct.stock,
    rating: 0,
  };

  if (!selectedImage && product.images.length > 0) {
    setSelectedImage(product.images[0]);
  }

  return (
    <Container sx={{ py: 6 }}>
      <Grid container spacing={6}>
        {/* Ảnh sản phẩm */}
        <Grid item xs={12} md={6}>
          <Box className="flex flex-col items-center">
            {product.images.length > 0 ? (
              <>
                <Box sx={{ borderRadius: 3, overflow: "hidden", boxShadow: 3, mb: 2 }}>
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className="w-full object-cover rounded-xl transition-transform duration-300 hover:scale-105"
                  />
                </Box>

                {/* Gallery */}
                <Box className="flex gap-2 justify-center flex-wrap">
                  {product.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      className={`w-20 h-20 object-cover rounded-md cursor-pointer border-2 transition-all duration-200 ${
                        selectedImage === img
                          ? "border-blue-500"
                          : "border-transparent hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedImage(img)}
                    />
                  ))}
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  width: "100%",
                  height: 400,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f5f5f5",
                  color: "#999",
                  borderRadius: 3,
                }}
              >
                <Typography variant="h6">Không có hình ảnh</Typography>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Thông tin sản phẩm */}
        <Grid item xs={12} md={6}>
          <Typography variant="h4" fontWeight="bold">
            {product.name}
          </Typography>

          <Rating value={product.rating} precision={0.5} readOnly sx={{ mt: 1 }} />
          <Typography variant="h5" color="primary" fontWeight="bold" sx={{ mt: 2 }}>
            {product.price.toLocaleString()}₫
          </Typography>

          <Typography variant="body1" sx={{ mt: 2, color: "text.secondary" }}>
            {product.description}
          </Typography>

          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              color="primary"
              sx={{ mr: 2, textTransform: "none", fontWeight: "bold", px: 3, py: 1 }}
              onClick={() => addToCart(product)}
            >
              Thêm vào giỏ
            </Button>
            <Button variant="outlined" sx={{ textTransform: "none", fontWeight: "bold" }}>
              Mua ngay
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
