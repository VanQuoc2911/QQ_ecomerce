import { CheckCircleOutline, Close, PersonAdd, Visibility, VisibilityOff } from "@mui/icons-material";
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

interface Props { 
  open: boolean; 
  onClose: () => void; 
}

const RegisterModal: React.FC<Props> = ({ open, onClose }) => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role,] = useState<Role>("user");
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
    <Modal 
      open={open} 
      onClose={onClose} 
      closeAfterTransition
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 102, 204, 0.15)',
            backdropFilter: 'blur(8px)',
          }
        }
      }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            bgcolor: "background.paper",
            borderRadius: 4,
            width: 480,
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0, 102, 204, 0.2)',
            overflow: 'hidden',
            animation: 'slideIn 0.3s ease-out',
            '@keyframes slideIn': {
              from: {
                opacity: 0,
                transform: 'translate(-50%, -45%)',
              },
              to: {
                opacity: 1,
                transform: 'translate(-50%, -50%)',
              },
            },
          }}
        >
          {/* Header với gradient */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #0066CC 0%, #0099FF 100%)',
              p: 4,
              pb: 5,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '-50%',
                right: '-10%',
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                animation: 'float 6s ease-in-out infinite',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: '-30%',
                left: '-5%',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                animation: 'float 8s ease-in-out infinite reverse',
              },
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                '50%': { transform: 'translateY(-20px) rotate(5deg)' },
              },
            }}
          >
            <IconButton
              onClick={onClose}
              sx={{ 
                position: "absolute", 
                right: 12, 
                top: 12,
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  transform: 'rotate(90deg)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              <Close />
            </IconButton>

            <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <Box
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  mb: 2,
                  backdropFilter: 'blur(10px)',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  animation: 'pulse 2s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.05)' },
                  },
                }}
              >
                <PersonAdd sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Typography 
                variant="h4" 
                fontWeight={700}
                color="white"
                sx={{
                  textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  letterSpacing: '0.5px',
                }}
              >
                Tạo tài khoản mới
              </Typography>
              <Typography 
                variant="body2" 
                color="rgba(255,255,255,0.9)"
                sx={{ mt: 1 }}
              >
                Bắt đầu trải nghiệm mua sắm tuyệt vời
              </Typography>
            </Box>
          </Box>

          {/* Form content */}
          <Box sx={{ p: 4, pt: 3 }}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  animation: 'shake 0.5s',
                  '@keyframes shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(-5px)' },
                    '75%': { transform: 'translateX(5px)' },
                  },
                }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleRegister}>
              <TextField
                fullWidth
                name="name"
                label="Họ và tên"
                margin="normal"
                required
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0, 102, 204, 0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(0, 102, 204, 0.15)',
                    },
                  },
                }}
              />
              
              <TextField
                fullWidth
                name="email"
                label="Email"
                margin="normal"
                required
                type="email"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0, 102, 204, 0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(0, 102, 204, 0.15)',
                    },
                  },
                }}
              />
              
              <TextField
                fullWidth
                name="password"
                label="Mật khẩu (tối thiểu 6 ký tự)"
                margin="normal"
                required
                type={showPassword ? "text" : "password"}
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0, 102, 204, 0.1)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(0, 102, 204, 0.15)',
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        onClick={() => setShowPassword((s) => !s)}
                        sx={{
                          transition: 'transform 0.2s ease',
                          '&:hover': { transform: 'scale(1.1)' },
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Password requirements hint */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  mb: 3,
                  mt: 1,
                  color: 'text.secondary',
                }}
              >
                <CheckCircleOutline sx={{ fontSize: 16, color: '#0066CC' }} />
                <Typography variant="caption">
                  Mật khẩu mạnh giúp bảo vệ tài khoản của bạn
                </Typography>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  py: 1.8,
                  fontWeight: 600,
                  fontSize: '1rem',
                  borderRadius: 2,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #0066CC 0%, #0099FF 100%)',
                  boxShadow: '0 4px 15px rgba(0, 102, 204, 0.3)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    transition: 'left 0.5s ease',
                  },
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(0, 102, 204, 0.4)',
                    '&::before': {
                      left: '100%',
                    },
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  '&:disabled': {
                    background: '#ccc',
                  },
                }}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonAdd sx={{ fontSize: 20 }} />
                    <span>Đăng ký ngay</span>
                  </Box>
                )}
              </Button>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Đã có tài khoản?{' '}
                <Link
                  component="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new Event('openLogin'));
                  }}
                  sx={{
                    color: '#0066CC',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: '#0099FF',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Đăng nhập
                </Link>
              </Typography>
            </Box>

            {/* Terms and conditions */}
            <Box 
              sx={{ 
                mt: 3, 
                p: 2, 
                bgcolor: '#F0F7FF', 
                borderRadius: 2,
                border: '1px solid rgba(0, 102, 204, 0.1)',
              }}
            >
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center' }}
              >
                Bằng cách đăng ký, bạn đồng ý với{' '}
                <Link 
                  href="#" 
                  sx={{ 
                    color: '#0066CC',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Điều khoản dịch vụ
                </Link>
                {' '}và{' '}
                <Link 
                  href="#" 
                  sx={{ 
                    color: '#0066CC',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Chính sách bảo mật
                </Link>
                {' '}của chúng tôi
              </Typography>
            </Box>
          </Box>

          <Backdrop 
            open={loading} 
            sx={{ 
              color: "#fff", 
              zIndex: 9999,
              backgroundColor: 'rgba(0, 102, 204, 0.1)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress 
                size={60} 
                thickness={4}
                sx={{
                  color: '#0066CC',
                }}
              />
              <Typography variant="body1" sx={{ mt: 2, color: '#0066CC', fontWeight: 600 }}>
                Đang tạo tài khoản...
              </Typography>
            </Box>
          </Backdrop>
        </Box>
      </Fade>
    </Modal>
  );
};

export default RegisterModal;