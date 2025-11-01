import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { ProductCard as ProductCardType } from "../../types/ProductCard";

interface Props {
  product: ProductCardType;
}

export default function ProductCard({ product }: Props) {
  const navigate = useNavigate();

  const handleViewDetail = () => {
    navigate(`/products/${product.id}`);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card
        elevation={4}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: "background.paper",
          "&:hover": {
            boxShadow: 8,
          },
        }}
      >
        <CardActionArea onClick={handleViewDetail}>
          <CardMedia
            component="img"
            height="200"
            image={
              product.images && product.images.length > 0
                ? product.images[0]
                : "/no-image.png"
            }
            alt={product.name}
            sx={{
              objectFit: "cover",
              transition: "transform 0.3s ease",
              "&:hover": { transform: "scale(1.05)" },
            }}
          />

          <CardContent>
            <Typography
              variant="h6"
              fontWeight={600}
              noWrap
              sx={{
                mb: 0.5,
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {product.name}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ height: 40, overflow: "hidden" }}
            >
              {product.description}
            </Typography>

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 1 }}
            >
              <Typography variant="h6" color="primary.main" fontWeight={700}>
                {product.price.toLocaleString("vi-VN")}₫
              </Typography>
              <Rating
                value={product.rating}
                precision={0.5}
                readOnly
                size="small"
              />
            </Stack>

            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Button
                variant="contained"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation(); // tránh trùng sự kiện với CardActionArea
                  handleViewDetail();
                }}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  background:
                    "linear-gradient(90deg, #007BFF 0%, #00C6FF 100%)",
                  fontWeight: 600,
                  "&:hover": {
                    background:
                      "linear-gradient(90deg, #0062E6 0%, #33AEFF 100%)",
                  },
                }}
              >
                Xem chi tiết
              </Button>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </motion.div>
  );
}
