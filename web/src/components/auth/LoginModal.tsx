// src/components/auth/LoginModal.tsx
import { Close, Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  CircularProgress,
  Fade,
  IconButton,
  InputAdornment,
  Link,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types/User";
import { getRoleRedirectPath } from "../../utils/roleRedirect";
import ForgotPasswordModal from "./ForgotPasswordModal";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const email = (form.get("email") as string) ?? "";
      const password = (form.get("password") as string) ?? "";

      if (!email || !password) {
        setError("Vui lòng nhập đầy đủ email và mật khẩu");
        return;
      }
      if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự");
        return;
      }

      const user = await login(email, password); // returns User
      onClose();
      navigate(getRoleRedirectPath(user.role as Role ?? "user"));
    } catch (err) {
      setError((err as Error).message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} closeAfterTransition>
        <Fade in={open}>
          <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", bgcolor: "background.paper", p: 4, borderRadius: 2, width: 450 }}>
            <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
              <Close />
            </IconButton>

            <Typography variant="h6" mb={3} textAlign="center">Đăng nhập</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <form onSubmit={handleLogin}>
              <TextField fullWidth name="email" label="Email" margin="normal" required type="email" />
              <TextField
                fullWidth
                name="password"
                label="Mật khẩu"
                margin="normal"
                required
                type={showPassword ? "text" : "password"}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => !s)}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ textAlign: "right", mt: 1 }}>
                <Link component="button" variant="body2" onClick={() => setForgotPasswordOpen(true)}>Quên mật khẩu?</Link>
              </Box>

              <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={loading}>
                {loading ? <CircularProgress size={24} color="inherit" /> : "Đăng nhập"}
              </Button>
            </form>

            <Backdrop open={loading} sx={{ color: "#fff", zIndex: 9999 }}>
              <CircularProgress color="inherit" />
            </Backdrop>
          </Box>
        </Fade>
      </Modal>

      <ForgotPasswordModal open={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} />
    </>
  );
};

export default LoginModal;
