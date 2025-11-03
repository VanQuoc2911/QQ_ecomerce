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
import { cartService, type CartItem, type CartResponse } from "../../api/cartService";
import type { ApiProduct } from "../../api/productService";
import { productService } from "../../api/productService";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!id) return;
    productService
      .getProductById(id)
      .then(setProduct)
      .catch((err) => console.error("❌ Lỗi khi tải sản phẩm:", err))
      .finally(() => setLoading(false));
  }, [id]);

  const animateFlyToCart = () => {
    const productImg = document.querySelector(".product-image") as HTMLImageElement;
    const cartIcon = document.querySelector(".cart-icon") as HTMLElement;
    if (!productImg || !cartIcon) return;

    const imgRect = productImg.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    const flyingImg = productImg.cloneNode(true) as HTMLImageElement;
    flyingImg.style.position = "fixed";
    flyingImg.style.left = imgRect.left + "px";
    flyingImg.style.top = imgRect.top + "px";
    flyingImg.style.width = imgRect.width + "px";
    flyingImg.style.height = imgRect.height + "px";
    flyingImg.style.borderRadius = "10px";
    flyingImg.style.zIndex = "9999";
    flyingImg.style.transition =
      "all 0.8s cubic-bezier(0.25, 1, 0.5, 1)";
    document.body.appendChild(flyingImg);

    requestAnimationFrame(() => {
      flyingImg.style.left = cartRect.left + "px";
      flyingImg.style.top = cartRect.top + "px";
      flyingImg.style.width = "40px";
      flyingImg.style.height = "40px";
      flyingImg.style.opacity = "0.5";
      flyingImg.style.transform = "rotate(360deg)";
    });

    setTimeout(() => {
      flyingImg.remove();
      // 🔔 Làm icon rung nhẹ
      const cart = document.querySelector(".cart-icon") as HTMLElement;
      if (cart) {
        cart.classList.add("cart-shake");
        setTimeout(() => cart.classList.remove("cart-shake"), 500);
      }
    }, 800);
  };

  const handleAddToCart = async () => {
    if (!product) return;

    const item: CartItem = {
      productId: product._id,
      quantity: 1,
    };

    try {
      setAddingToCart(true);
      const updatedCart: CartResponse = await cartService.addToCart(item);
      console.log("🛒 Cart updated:", updatedCart);

      // 🔥 Cập nhật Navbar
      window.dispatchEvent(new Event("cartUpdated"));

      // ✨ Gọi hiệu ứng bay
      animateFlyToCart();

    } catch (err) {
      console.error("❌ Lỗi khi thêm giỏ hàng:", err);
      alert("❌ Thêm vào giỏ hàng thất bại. Vui lòng đăng nhập!");
    } finally {
      setAddingToCart(false);
    }
  };

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
            className="product-image"
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
            disabled={addingToCart}
            onClick={handleAddToCart}
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
            {addingToCart ? "Đang thêm..." : "Thêm vào giỏ hàng"}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}
