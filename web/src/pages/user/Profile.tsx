import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import HomeIcon from "@mui/icons-material/Home";
import LanguageIcon from "@mui/icons-material/Language";
import LockIcon from "@mui/icons-material/Lock";
import LogoutIcon from "@mui/icons-material/Logout";
import PendingIcon from "@mui/icons-material/Pending";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import SaveIcon from "@mui/icons-material/Save";
import StoreIcon from "@mui/icons-material/Store";
import VerifiedIcon from "@mui/icons-material/Verified";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { type AxiosResponse } from "axios";
import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

interface Shop {
  shopName?: string;
  logo?: string;
  address?: string;
  phone?: string;
  website?: string;
  businessLicenseUrl?: string;
  description?: string;
  rating?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  avatar?: string;
  sellerApproved?: boolean;
  shop?: Shop | null;
}

interface Toast {
  msg: string;
  type: "success" | "error";
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    avatar: "",
    oldPassword: "",
    newPassword: "",
    shopName: "",
    shopLogo: "",
    shopAddress: "",
    shopPhone: "",
    shopWebsite: "",
    shopDescription: "",
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res: AxiosResponse<User> = await api.get("/auth/profile", {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setUser(res.data);
      setForm({
        name: res.data.name,
        phone: res.data.phone || "",
        address: res.data.address || "",
        avatar: res.data.avatar || "",
        oldPassword: "",
        newPassword: "",
        shopName: res.data.shop?.shopName || "",
        shopLogo: res.data.shop?.logo || "",
        shopAddress: res.data.shop?.address || "",
        shopPhone: res.data.shop?.phone || "",
        shopWebsite: res.data.shop?.website || "",
        shopDescription: res.data.shop?.description || "",
      });
    } catch (err) {
      console.error(err);
      setToast({ msg: "Không thể tải dữ liệu người dùng", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleTabChange = (_: unknown, newValue: number) => setTab(newValue);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, avatar: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const res: AxiosResponse<{ user: User; message?: string }> = await api.put(
        "/api/auth/profile",
        {
          name: form.name,
          phone: form.phone,
          address: form.address,
          avatar: form.avatar,
          shop: {
            shopName: form.shopName,
            logo: form.shopLogo,
            address: form.shopAddress,
            phone: form.shopPhone,
            website: form.shopWebsite,
            description: form.shopDescription,
          },
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      setUser(res.data.user);
      setToast({ msg: res.data.message || "Cập nhật thành công", type: "success" });
      setEditing(false);
    } catch (err) {
      console.error(err);
      setToast({ msg: "Cập nhật thất bại", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!form.oldPassword || !form.newPassword) {
      setToast({ msg: "Vui lòng nhập đủ mật khẩu cũ và mới", type: "error" });
      return;
    }
    setLoading(true);
    try {
      await api.put(
        "/api/auth/profile/password",
        { oldPassword: form.oldPassword, newPassword: form.newPassword },
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      setForm((f) => ({ ...f, oldPassword: "", newPassword: "" }));
      setToast({ msg: "Đổi mật khẩu thành công", type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ msg: "Đổi mật khẩu thất bại", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/home");
    } catch (err) {
      console.error("Lỗi khi đăng xuất:", err);
    }
  };

  if (loading && !user)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} size={60} />
      </Box>
    );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        py: 4,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                       radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
          pointerEvents: "none",
        },
      }}
    >
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        {/* Header Card */}
        <Paper
          elevation={0}
          sx={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            p: 3,
            mb: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(102,126,234,0.4)",
                }}
              >
                <PersonIcon sx={{ fontSize: 32, color: "#fff" }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="700" sx={{ 
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  Hồ Sơ Của Tôi
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Quản lý thông tin cá nhân và cửa hàng
                </Typography>
              </Box>
            </Box>
            <Button
              onClick={handleLogout}
              variant="outlined"
              startIcon={<LogoutIcon />}
              sx={{
                borderRadius: "12px",
                px: 3,
                py: 1.5,
                borderColor: "#667eea",
                color: "#667eea",
                fontWeight: 600,
                "&:hover": {
                  borderColor: "#764ba2",
                  background: "rgba(102,126,234,0.05)",
                },
              }}
            >
              Đăng xuất
            </Button>
          </Box>
        </Paper>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            mb: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.3)",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={tab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              "& .MuiTab-root": {
                py: 2.5,
                fontSize: "1rem",
                fontWeight: 600,
                textTransform: "none",
                color: "#667eea",
                transition: "all 0.3s ease",
              },
              "& .Mui-selected": {
                color: "#764ba2",
              },
              "& .MuiTabs-indicator": {
                height: 4,
                borderRadius: "4px 4px 0 0",
                background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
              },
            }}
          >
            <Tab icon={<PersonIcon />} iconPosition="start" label="Thông tin cá nhân" />
            <Tab icon={<LockIcon />} iconPosition="start" label="Đổi mật khẩu" />
          </Tabs>
        </Paper>

        {/* Content Card */}
        <Paper
          elevation={0}
          sx={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            p: 4,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          {tab === 0 && (
            <Box>
              <Grid container spacing={4}>
                {/* Avatar Section */}
                <Grid item xs={12} md={4}>
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    sx={{
                      position: "relative",
                      animation: "fadeIn 0.6s ease-in",
                      "@keyframes fadeIn": {
                        from: { opacity: 0, transform: "translateY(20px)" },
                        to: { opacity: 1, transform: "translateY(0)" },
                      },
                    }}
                  >
                    <Box sx={{ position: "relative", mb: 3 }}>
                      <Avatar
                        src={form.avatar}
                        alt={user?.name}
                        sx={{
                          width: 180,
                          height: 180,
                          border: "6px solid #fff",
                          boxShadow: "0 8px 32px rgba(102,126,234,0.3)",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "scale(1.05)",
                            boxShadow: "0 12px 40px rgba(102,126,234,0.4)",
                          },
                        }}
                      />
                      {editing && (
                        <IconButton
                          component="label"
                          sx={{
                            position: "absolute",
                            bottom: 10,
                            right: 10,
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "#fff",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                            "&:hover": {
                              background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                            },
                          }}
                        >
                          <CameraAltIcon />
                          <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                        </IconButton>
                      )}
                    </Box>

                    <Typography variant="h5" fontWeight="700" mb={1} textAlign="center">
                      {user?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {user?.email}
                    </Typography>

                    <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center">
                      <Chip
                        label={user?.role}
                        size="small"
                        sx={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "#fff",
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        icon={user?.sellerApproved ? <VerifiedIcon /> : <PendingIcon />}
                        label={user?.sellerApproved ? "Đã duyệt" : "Chưa duyệt"}
                        size="small"
                        color={user?.sellerApproved ? "success" : "warning"}
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Form Section */}
                <Grid item xs={12} md={8}>
                  <Box sx={{ animation: "slideIn 0.6s ease-in" }}>
                    <Typography variant="h6" fontWeight="700" mb={3} sx={{ color: "#667eea" }}>
                      Thông tin cá nhân
                    </Typography>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12}>
                        <TextField
                          label="Họ và tên"
                          name="name"
                          value={form.name}
                          onChange={handleInputChange}
                          fullWidth
                          disabled={!editing}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonIcon sx={{ color: "#667eea" }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={textFieldStyle}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Số điện thoại"
                          name="phone"
                          value={form.phone}
                          onChange={handleInputChange}
                          fullWidth
                          disabled={!editing}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon sx={{ color: "#667eea" }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={textFieldStyle}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Email"
                          value={user?.email || ""}
                          fullWidth
                          disabled
                          sx={textFieldStyle}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          label="Địa chỉ"
                          name="address"
                          value={form.address}
                          onChange={handleInputChange}
                          fullWidth
                          disabled={!editing}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <HomeIcon sx={{ color: "#667eea" }} />
                              </InputAdornment>
                            ),
                          }}
                          sx={textFieldStyle}
                        />
                      </Grid>
                    </Grid>

                    {user?.shop && (
                      <Box mt={4}>
                        <Typography variant="h6" fontWeight="700" mb={3} sx={{ color: "#667eea" }}>
                          <StoreIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                          Thông tin cửa hàng
                        </Typography>

                        <Grid container spacing={2.5}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Tên cửa hàng"
                              name="shopName"
                              value={form.shopName}
                              onChange={handleInputChange}
                              fullWidth
                              disabled={!editing}
                              sx={textFieldStyle}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Số điện thoại shop"
                              name="shopPhone"
                              value={form.shopPhone}
                              onChange={handleInputChange}
                              fullWidth
                              disabled={!editing}
                              sx={textFieldStyle}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <TextField
                              label="Địa chỉ cửa hàng"
                              name="shopAddress"
                              value={form.shopAddress}
                              onChange={handleInputChange}
                              fullWidth
                              disabled={!editing}
                              sx={textFieldStyle}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Website"
                              name="shopWebsite"
                              value={form.shopWebsite}
                              onChange={handleInputChange}
                              fullWidth
                              disabled={!editing}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <LanguageIcon sx={{ color: "#667eea" }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={textFieldStyle}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Logo URL"
                              name="shopLogo"
                              value={form.shopLogo}
                              onChange={handleInputChange}
                              fullWidth
                              disabled={!editing}
                              sx={textFieldStyle}
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <TextField
                              label="Mô tả cửa hàng"
                              name="shopDescription"
                              value={form.shopDescription}
                              onChange={handleInputChange}
                              fullWidth
                              disabled={!editing}
                              multiline
                              rows={3}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 2 }}>
                                    <DescriptionIcon sx={{ color: "#667eea" }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={textFieldStyle}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    )}

                    {/* Action Buttons */}
                    <Box mt={4} display="flex" gap={2}>
                      {!editing ? (
                        <Button
                          variant="contained"
                          startIcon={<EditIcon />}
                          fullWidth
                          onClick={() => setEditing(true)}
                          sx={{
                            py: 1.5,
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            fontWeight: 600,
                            fontSize: "1rem",
                            textTransform: "none",
                            boxShadow: "0 4px 20px rgba(102,126,234,0.4)",
                            "&:hover": {
                              background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                              boxShadow: "0 6px 24px rgba(102,126,234,0.5)",
                            },
                          }}
                        >
                          Chỉnh sửa thông tin
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="contained"
                            startIcon={loading ? null : <SaveIcon />}
                            fullWidth
                            onClick={handleUpdateProfile}
                            disabled={loading}
                            sx={{
                              py: 1.5,
                              borderRadius: "12px",
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              fontWeight: 600,
                              fontSize: "1rem",
                              textTransform: "none",
                              boxShadow: "0 4px 20px rgba(102,126,234,0.4)",
                              "&:hover": {
                                background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                              },
                            }}
                          >
                            {loading ? <CircularProgress size={24} color="inherit" /> : "Lưu thay đổi"}
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<CloseIcon />}
                            onClick={() => {
                              setEditing(false);
                              fetchProfile();
                            }}
                            sx={{
                              py: 1.5,
                              borderRadius: "12px",
                              borderColor: "#667eea",
                              color: "#667eea",
                              fontWeight: 600,
                              fontSize: "1rem",
                              textTransform: "none",
                              minWidth: "140px",
                              "&:hover": {
                                borderColor: "#764ba2",
                                background: "rgba(102,126,234,0.05)",
                              },
                            }}
                          >
                            Hủy
                          </Button>
                        </>
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ maxWidth: 500, mx: "auto", animation: "fadeIn 0.6s ease-in" }}>
              <Typography variant="h6" fontWeight="700" mb={4} textAlign="center" sx={{ color: "#667eea" }}>
                Đổi mật khẩu
              </Typography>

              <TextField
                label="Mật khẩu cũ"
                name="oldPassword"
                type="password"
                value={form.oldPassword}
                onChange={handleInputChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: "#667eea" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ ...textFieldStyle, mb: 3 }}
              />

              <TextField
                label="Mật khẩu mới"
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleInputChange}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: "#667eea" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ ...textFieldStyle, mb: 4 }}
              />

              <Button
                variant="contained"
                fullWidth
                startIcon={loading ? null : <SaveIcon />}
                onClick={handleChangePassword}
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  fontWeight: 600,
                  fontSize: "1rem",
                  textTransform: "none",
                  boxShadow: "0 4px 20px rgba(102,126,234,0.4)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                    boxShadow: "0 6px 24px rgba(102,126,234,0.5)",
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Đổi mật khẩu"}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.type || "info"}
          sx={{
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            "& .MuiAlert-icon": {
              fontSize: 28,
            },
          }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

const textFieldStyle = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    transition: "all 0.3s ease",
    "&:hover fieldset": {
      borderColor: "#667eea",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#764ba2",
      borderWidth: 2,
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#764ba2",
  },
};