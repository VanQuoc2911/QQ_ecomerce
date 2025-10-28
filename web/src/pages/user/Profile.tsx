import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { api } from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import type { UserProfile } from "../../types/UserProfile";
import { uploadImageToCloudinary } from "../../utils/cloudinary";

export default function Profile() {
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // 🔹 Lấy thông tin người dùng từ API
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const response = await api.get('/auth/profile');
        const data = response.data;
        setUserData({
          name: data.name || "",
          displayName: data.name || "",
          email: data.email || "",
          photoURL: data.avatar || "",
          phone: data.phone || "",
          address: data.address || "",
          birthday: data.birthday || "",
          gender: data.gender || "",
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
      setLoading(false);
    };

    fetchUserData();
  }, [user]);

  // 🔹 Upload avatar lên Cloudinary và lưu vào API
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setSaving(true);
      const url = await uploadImageToCloudinary(file);
      // Cập nhật UI trước
      setUserData((prev) => (prev ? { ...prev, photoURL: url } : prev));
      // Lưu vào API
      await api.put('/auth/profile', { avatar: url });
    } catch (err) {
      console.error(err);
      alert("❌ Upload ảnh thất bại!");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Cập nhật thông tin người dùng
  const handleSave = async () => {
    if (!user || !userData) return;
    try {
      setSaving(true);
      await api.put('/auth/profile', {
        name: userData.displayName,
        phone: userData.phone,
        address: userData.address,
        birthday: userData.birthday,
        gender: userData.gender,
      });
      alert("🎉 Cập nhật thông tin thành công!");
    } catch (err) {
      console.error(err);
      alert("❌ Cập nhật thất bại!");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Loading khi chưa có dữ liệu
  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );

  // 🔹 Nếu chưa đăng nhập
  if (!user || !userData)
    return (
      <>
        <Box textAlign="center" mt={10}>
          <Typography variant="h6" color="text.secondary">
            Vui lòng đăng nhập để xem hồ sơ.
          </Typography>
        </Box>
      </>
    );

  return (
    <>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        sx={{ mt: 8, mb: 6 }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 4,
            width: "100%",
            maxWidth: 500,
            borderRadius: 4,
            textAlign: "center",
          }}
          component={motion.div}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 🔹 Avatar */}
          <Box position="relative" mb={2}>
            <Avatar
              src={userData.photoURL || "https://cdn-icons-png.flaticon.com/512/219/219983.png"}
              alt={userData.displayName || user.email || "User Avatar"}
              sx={{
                width: 100,
                height: 100,
                mx: "auto",
                mb: 2,
                border: "3px solid #1976d2",
              }}
            />
            <Button variant="outlined" component="label" size="small">
              Đổi ảnh
              <input hidden accept="image/*" type="file" onChange={handleAvatarUpload} />
            </Button>
          </Box>

          {/* 🔹 Thông tin cá nhân */}
          <TextField
            label="Tên hiển thị"
            fullWidth
            sx={{ mb: 2 }}
            value={userData.displayName}
            onChange={(e) => setUserData({ ...userData, displayName: e.target.value })}
          />
          <TextField
            label="Email"
            fullWidth
            sx={{ mb: 2 }}
            value={userData.email}
            disabled
          />
          <TextField
            label="Số điện thoại"
            fullWidth
            sx={{ mb: 2 }}
            value={userData.phone}
            onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
          />
          <TextField
            label="Địa chỉ"
            fullWidth
            sx={{ mb: 2 }}
            value={userData.address}
            onChange={(e) => setUserData({ ...userData, address: e.target.value })}
          />
          <TextField
            label="Ngày sinh"
            fullWidth
            sx={{ mb: 2 }}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={userData.birthday}
            onChange={(e) => setUserData({ ...userData, birthday: e.target.value })}
          />
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Giới tính</InputLabel>
            <Select
              value={userData.gender}
              label="Giới tính"
              onChange={(e) =>
                setUserData({ ...userData, gender: e.target.value as UserProfile["gender"] })
              }
            >
              <MenuItem value="Nam">Nam</MenuItem>
              <MenuItem value="Nữ">Nữ</MenuItem>
              <MenuItem value="Khác">Khác</MenuItem>
            </Select>
          </FormControl>

          {/* 🔹 Nút hành động */}
          <Box display="flex" flexDirection="column" gap={2}>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={24} color="inherit" /> : "Lưu thay đổi"}
            </Button>
            <Button variant="outlined" color="error" onClick={logout}>
              Đăng xuất
            </Button>
          </Box>
        </Paper>
      </Box>
    </>
  );
}
