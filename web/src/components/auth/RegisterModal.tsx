// src/components/auth/RegisterModal.tsx
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
  MenuItem,
  Modal,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../types/User";
import { getRoleRedirectPath } from "../../utils/roleRedirect";

interface Props { open: boolean; onClose: () => void; }

const RegisterModal: React.FC<Props> = ({ open, onClose }) => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const name = (form.get("name") as string) ?? "";
      const email = (form.get("email") as string) ?? "";
      const password = (form.get("password") as string) ?? "";

      if (!name || !email || !password) {
        setError("Vui lòng nhập đầy đủ thông tin");
        return;
      }
      if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự");
        return;
      }

      const newUser = await register(email, password, name, role);
      onClose();
      navigate(getRoleRedirectPath(newUser.role as Role ?? "user"));
    } catch (err) {
      setError((err as Error).message || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
        <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", bgcolor: "background.paper", p: 4, borderRadius: 2, width: 380 }}>
          <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}><Close /></IconButton>
          <Typography variant="h6" mb={3} textAlign="center">Đăng ký tài khoản</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleRegister}>
            <TextField fullWidth name="name" label="Họ và tên" margin="normal" required />
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

            <Select fullWidth value={role} onChange={(e) => setRole(e.target.value as Role)} sx={{ mt: 2 }}>
              <MenuItem value="user">Người dùng</MenuItem>
              <MenuItem value="seller">Người bán</MenuItem>
              <MenuItem value="shipper">Người giao hàng</MenuItem>
            </Select>

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Đăng ký"}
            </Button>
          </form>

          <Backdrop open={loading} sx={{ color: "#fff", zIndex: 9999 }}>
            <CircularProgress color="inherit" />
          </Backdrop>
        </Box>
      </Fade>
    </Modal>
  );
};

export default RegisterModal;
