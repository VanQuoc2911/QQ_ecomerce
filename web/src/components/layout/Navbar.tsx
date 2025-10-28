import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { AppBar, Avatar, Box, Button, IconButton, Toolbar, Typography } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import LoginModal from "../../components/auth/LoginModal";
import RegisterModal from "../../components/auth/RegisterModal";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  return (
    <>
      <AppBar position="sticky" color="primary" sx={{ backdropFilter: "blur(8px)" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link
              to="/"
              style={{ textDecoration: "none", color: "white", fontWeight: 700 }}
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

            <IconButton color="inherit" component={Link} to="/cart">
              <ShoppingCartIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ✅ Truyền prop `open` để đúng kiểu */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </>
  );
}
