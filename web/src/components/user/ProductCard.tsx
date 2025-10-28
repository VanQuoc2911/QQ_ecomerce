import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  ImageList,
  ImageListItem,
  Rating,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import type { ProductCard } from "../types/ProductCard";

export default function ProductCard({ product }: { product: ProductCard }) {
  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: 3,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-6px)",
          boxShadow: 6,
        },
      }}
    >
      {/* Hình ảnh sản phẩm */}
      <Box sx={{ position: "relative" }}>
        {product.images.length > 0 ? (
          <ImageList
            sx={{
              width: "100%",
              height: 220,
              m: 0,
            }}
            cols={product.images.length > 1 ? 2 : 1}
            rowHeight={220}
          >
            {product.images.filter(img => img && img.trim() !== '').slice(0, 4).map((img, index) => (
              <ImageListItem key={index}>
                <img
                  src={img}
                  alt={`${product.name}-${index}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </ImageListItem>
            ))}
          </ImageList>
        ) : (
          <Box
            sx={{
              width: "100%",
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
              color: "#999",
            }}
          >
            <Typography variant="body2">Không có hình ảnh</Typography>
          </Box>
        )}
        {product.images.length > 4 && (
          <Box
            sx={{
              position: "absolute",
              bottom: 8,
              right: 12,
              bgcolor: "rgba(0,0,0,0.6)",
              color: "#fff",
              px: 1.2,
              py: 0.4,
              borderRadius: "8px",
              fontSize: 12,
            }}
          >
            +{product.images.length - 4} ảnh
          </Box>
        )}
      </Box>

      {/* Thông tin sản phẩm */}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 0.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {product.name}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, fontWeight: 500 }}
        >
          {product.price.toLocaleString()}₫
        </Typography>
        <Rating value={product.rating} precision={0.5} readOnly />
      </CardContent>

      {/* Hành động */}
      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
        <Button
          component={Link}
          to={`/products/${product.id}`}
          size="small"
          variant="outlined"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 500,
          }}
        >
          Chi tiết
        </Button>
        <Button
          size="small"
          variant="contained"
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 500,
            background:
              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "&:hover": {
              background:
                "linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)",
            },
          }}
        >
          Thêm vào giỏ
        </Button>
      </CardActions>
    </Card>
  );
}
