import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import XIcon from "@mui/icons-material/X";
import {
  Box,
  Container,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";

import Grid from "@mui/material/GridLegacy";
const quickLinks = [
  { label: "Sản phẩm", href: "/products" },
  { label: "Lịch sử mua hàng", href: "/order-history" },
  { label: "Giỏ hàng", href: "/cart" },
  { label: "Ưu đãi", href: "/promotions" },
];

const supportLinks = [
  { label: "Hướng dẫn mua hàng", href: "/guides/buy" },
  { label: "Chính sách giao hàng", href: "/policies/shipping" },
  { label: "Chính sách đổi trả", href: "/policies/return" },
  { label: "Bảo mật & thanh toán", href: "/policies/payment" },
];

export default function Footer() {
  return (
    <Box sx={{ mt: 8, background: "linear-gradient(135deg, #0f172a 0%, #0b3d91 60%, #1d4ed8 100%)", color: "#e2e8f0", position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 55%)",
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, position: "relative", zIndex: 1 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 30px rgba(37,99,235,0.4)",
                  }}
                >
                  <LocalMallIcon sx={{ color: "white" }} />
                </Box>
                <Typography variant="h5" fontWeight={800} color="white">
                  QQ E-commerce
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.8)", lineHeight: 1.7 }}>
                Nền tảng mua sắm hiện đại với trải nghiệm mượt mà, thanh toán linh hoạt và hệ thống hỗ trợ khách hàng 24/7.
              </Typography>
              <Stack direction="row" spacing={1}>
                {[
                  { icon: <FacebookIcon />, label: "Facebook" },
                  { icon: <InstagramIcon />, label: "Instagram" },
                  { icon: <XIcon />, label: "X" },
                ].map((item) => (
                  <IconButton
                    key={item.label}
                    aria-label={item.label}
                    size="small"
                    sx={{
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.3)",
                      backdropFilter: "blur(6px)",
                      transition: "all 0.2s",
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.15)" },
                    }}
                  >
                    {item.icon}
                  </IconButton>
                ))}
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="subtitle1" fontWeight={700} color="white" gutterBottom>
              Khám phá
            </Typography>
            <Stack spacing={1.2}>
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  color="inherit"
                  underline="none"
                  sx={{
                    opacity: 0.75,
                    fontSize: "0.95rem",
                    "&:hover": { opacity: 1, color: "#93c5fd" },
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="subtitle1" fontWeight={700} color="white" gutterBottom>
              Hỗ trợ & liên hệ
            </Typography>
            <Stack spacing={1.2}>
              {supportLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  color="inherit"
                  underline="none"
                  sx={{
                    opacity: 0.75,
                    fontSize: "0.95rem",
                    "&:hover": { opacity: 1, color: "#93c5fd" },
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 2 }} />
              <Stack direction="row" spacing={1.2} alignItems="center">
                <PhoneIphoneIcon fontSize="small" />
                <Typography variant="body2">1900 636 099</Typography>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <MailOutlineIcon fontSize="small" />
                <Typography variant="body2">support@qq-ecom.vn</Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.1)" }} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }}>
          <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.8)" }}>
            © {new Date().getFullYear()} QQ E-commerce. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3} sx={{ color: "rgba(226,232,240,0.8)", fontSize: "0.85rem" }}>
            <Link href="/policies/terms" color="inherit" underline="hover">
              Điều khoản sử dụng
            </Link>
            <Link href="/policies/privacy" color="inherit" underline="hover">
              Bảo mật
            </Link>
            <Link href="/contact" color="inherit" underline="hover">
              Liên hệ
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
