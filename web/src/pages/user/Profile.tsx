import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import axios, { type AxiosResponse } from "axios";
import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext"; // ✅ thêm dòng này

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
  const { logout } = useAuth(); // ✅ dùng context logout

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

  // ===== Fetch profile =====
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

  // ===== Handlers =====
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
      const res: AxiosResponse<{ user: User; message?: string }> = await axios.put(
        "/api/profile",
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
      await axios.put(
        "/api/profile/password",
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

  // ✅ Đồng bộ logout
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );

  // ===== UI =====
  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Hồ sơ cá nhân
        </Typography>
        <Button
          onClick={handleLogout}
          variant="outlined"
          color="error"
          sx={{ borderRadius: "8px", px: 3 }}
        >
          Đăng xuất
        </Button>
      </Box>

      <Tabs value={tab} onChange={handleTabChange} centered>
        <Tab label="Thông tin cá nhân" />
        <Tab label="Đổi mật khẩu" />
      </Tabs>

      {tab === 0 && (
        <Box mt={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4} display="flex" flexDirection="column" alignItems="center">
              <Avatar
                src={form.avatar}
                alt={user?.name}
                sx={{
                  width: 150,
                  height: 150,
                  mb: 2,
                  border: "3px solid #00f2fe",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                }}
              />
              {editing && <input type="file" accept="image/*" onChange={handleAvatarChange} />}
            </Grid>

            <Grid item xs={12} md={8}>
              {[ 
                { label: "Họ tên", name: "name", value: form.name },
                { label: "Email", name: "email", value: user?.email || "", disabled: true },
                { label: "Số điện thoại", name: "phone", value: form.phone },
                { label: "Địa chỉ", name: "address", value: form.address },
              ].map((f, i) => (
                <TextField
                  key={i}
                  label={f.label}
                  name={f.name}
                  value={f.value}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!editing || f.disabled}
                  sx={{ mb: 2 }}
                />
              ))}

              <TextField label="Vai trò" value={user?.role} fullWidth disabled sx={{ mb: 2 }} />
              <TextField
                label="Trạng thái người bán"
                value={user?.sellerApproved ? "Đã duyệt" : "Chưa duyệt"}
                fullWidth
                disabled
                sx={{ mb: 2 }}
              />

              {user?.shop && (
                <Box mt={3}>
                  <Typography variant="h6" mb={1}>
                    🏪 Thông tin cửa hàng
                  </Typography>
                  {[
                    { label: "Tên cửa hàng", name: "shopName", value: form.shopName },
                    { label: "Logo cửa hàng (URL)", name: "shopLogo", value: form.shopLogo },
                    { label: "Địa chỉ", name: "shopAddress", value: form.shopAddress },
                    { label: "Số điện thoại", name: "shopPhone", value: form.shopPhone },
                    { label: "Website", name: "shopWebsite", value: form.shopWebsite },
                    {
                      label: "Mô tả cửa hàng",
                      name: "shopDescription",
                      value: form.shopDescription,
                      multiline: true,
                      rows: 2,
                    },
                  ].map((f, i) => (
                    <TextField
                      key={i}
                      label={f.label}
                      name={f.name}
                      value={f.value}
                      onChange={handleInputChange}
                      fullWidth
                      disabled={!editing}
                      multiline={f.multiline}
                      rows={f.rows}
                      sx={{ mb: 2 }}
                    />
                  ))}
                </Box>
              )}

              <Box mt={2} display="flex" gap={2}>
                {!editing ? (
                  <Button
                    variant="contained"
                    sx={{
                      background: "linear-gradient(to right, #4facfe, #00f2fe)",
                      color: "#fff",
                      flex: 1,
                    }}
                    onClick={() => setEditing(true)}
                  >
                    Chỉnh sửa thông tin
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      sx={{
                        background: "linear-gradient(to right, #4facfe, #00f2fe)",
                        color: "#fff",
                        flex: 1,
                      }}
                      onClick={handleUpdateProfile}
                      disabled={loading}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : "Lưu thay đổi"}
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => {
                        setEditing(false);
                        fetchProfile();
                      }}
                    >
                      Hủy
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {tab === 1 && (
        <Box mt={3}>
          <TextField
            label="Mật khẩu cũ"
            name="oldPassword"
            type="password"
            value={form.oldPassword}
            onChange={handleInputChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Mật khẩu mới"
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleInputChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            sx={{
              background: "linear-gradient(to right, #ff7e5f, #feb47b)",
              color: "#fff",
            }}
            onClick={handleChangePassword}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Đổi mật khẩu"}
          </Button>
        </Box>
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setToast(null)} severity={toast?.type || "info"} sx={{ width: "100%" }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
