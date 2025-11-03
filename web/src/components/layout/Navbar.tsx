import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cartService } from "../../api/cartService";
import LoginModal from "../../components/auth/LoginModal";
import RegisterModal from "../../components/auth/RegisterModal";
import { useAuth } from "../../context/AuthContext";

interface ProductInCart {
  _id: string;
  title: string;
  price: number;
  images?: string[];
}

interface CartItem {
  productId: ProductInCart;
  quantity: number;
  price: number;
}

interface CartResponse {
  items: CartItem[];
}

export default function Navbar() {
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [animate, setAnimate] = useState(false);

  const fetchCartCount = async (): Promise<void> => {
    try {
      if (!user) {
        setCartCount(0);
        return;
      }

      const data: CartResponse = await cartService.getCart();
      const totalItems = data.items.reduce(
        (acc: number, item: CartItem) => acc + item.quantity,
        0
      );

      setCartCount(totalItems);
      setAnimate(true);
      setTimeout(() => setAnimate(false), 400);
    } catch (error) {
      console.error("Fetch cart count failed:", error);
      setCartCount(0);
    }
  };

  useEffect(() => {
    fetchCartCount();
  }, [user]);

  useEffect(() => {
    const handleCartChange = () => fetchCartCount();
    window.addEventListener("cartUpdated", handleCartChange);
    return () => window.removeEventListener("cartUpdated", handleCartChange);
  }, []);

  return (
    <>
      <AppBar
        position="sticky"
        color="primary"
        sx={{
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(25,118,210,0.9)",
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link
              to="/"
              style={{
                textDecoration: "none",
                color: "white",
                fontWeight: 700,
              }}
            >
              QQ Store
            </Link>
          </Typography>

          <Box display="flex" alignItems="center" gap={1}>
            <Button color="inherit" component={Link} to="/products">
              Sản phẩm
            </Button>

            {user ? (
              <IconButton component={Link} to="/profile" sx={{ p: 0 }}>
                <Avatar
                  src={
                    user?.avatar ||
                    "https://cdn-icons-png.flaticon.com/512/219/219983.png"
                  }
                />
              </IconButton>
            ) : (
              <>
                <Button color="inherit" onClick={() => setLoginOpen(true)}>
                  Đăng nhập
                </Button>
                <Button color="inherit" onClick={() => setRegisterOpen(true)}>
                  Đăng ký
                </Button>
              </>
            )}

            {/* 🛒 Giỏ hàng có hiệu ứng rung khi cập nhật */}
            <IconButton
              color="inherit"
              component={Link}
              to="/cart"
              className="cart-icon"
              sx={{
                transform: animate ? "scale(1.3)" : "scale(1)",
                transition: "transform 0.3s ease",
              }}
            >
              <Badge
                badgeContent={cartCount}
                color="error"
                overlap="circular"
                invisible={cartCount === 0}
              >
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </>
  );
}
