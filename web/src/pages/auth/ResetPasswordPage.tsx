import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
    Alert,
    Box,
    Button,
    Container,
    IconButton,
    InputAdornment,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../api/axios";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const tokenMissing = !token;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (tokenMissing) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ");
      return;
    }
    if (!password.trim() || !confirmPassword.trim()) {
      setError("Vui lòng nhập đầy đủ mật khẩu");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess("Mật khẩu đã được đặt lại, bạn có thể đăng nhập bằng mật khẩu mới.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "Không thể đặt lại mật khẩu, vui lòng thử lại.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.dispatchEvent(new Event("openLogin"));
    navigate("/home");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #dbeafe 0%, #f8fafc 45%, #e0f2fe 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            p: { xs: 4, md: 6 },
            boxShadow: "0 30px 80px rgba(59,130,246,0.18)",
            border: "1px solid rgba(148,163,184,0.2)",
            background: "rgba(255,255,255,0.95)",
          }}
        >
          <Box textAlign="center" mb={4}>
            <Typography variant="h4" fontWeight={800} color="#0f172a">
              Đặt lại mật khẩu
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>
              Nhập mật khẩu mới của bạn để tiếp tục sử dụng QQ Store
            </Typography>
          </Box>

          {tokenMissing && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              margin="normal"
              label="Mật khẩu mới"
              type={showPassword ? "text" : "password"}
              value={password}
              disabled={tokenMissing || loading}
              onChange={(event) => setPassword(event.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              margin="normal"
              label="Xác nhận mật khẩu"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              disabled={tokenMissing || loading}
              onChange={(event) => setConfirmPassword(event.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirmPassword((prev) => !prev)} edge="end">
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, py: 1.5, fontWeight: 700 }}
              disabled={tokenMissing || loading}
            >
              {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
            </Button>
          </Box>

          <Button
            onClick={handleBackToLogin}
            variant="text"
            fullWidth
            sx={{ mt: 2, fontWeight: 600 }}
          >
            Quay lại đăng nhập
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
