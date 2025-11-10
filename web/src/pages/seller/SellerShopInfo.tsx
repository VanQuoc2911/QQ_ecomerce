// src/seller/pages/SellerShopInfo.tsx
import { Avatar, Box, Button, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sellerService, type ShopInfo } from "../../api/sellerService";
import { useAuth } from "../../context/AuthContext"; // import hook auth

export default function SellerShopInfo() {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth(); // dùng logout từ context

  useEffect(() => {
    sellerService
      .getShopInfo()
      .then((d) => setShop(d))
      .catch((e) => {
        console.error("getShopInfo", e);
        setShop(null);
      });
  }, []);

  const handleSave = async () => {
    if (!shop) return;
    try {
      setSaving(true);
      await sellerService.updateShopInfo(shop);
      alert("✅ Cập nhật thông tin cửa hàng thành công");
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi khi lưu thông tin");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout(); // gọi logout từ context
      navigate("/home"); // chuyển về trang login
    } catch (err) {
      console.error("Logout failed:", err);
      alert("❌ Lỗi khi đăng xuất");
    }
  };

  if (!shop) return <Typography>Đang tải thông tin cửa hàng...</Typography>;

  return (
    <Box maxWidth={800} p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">🏪 Thông tin cửa hàng</Typography>
        <Button
          variant="contained"
          color="error"
          onClick={handleLogout}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          Logout
        </Button>
      </Box>

      <Box display="flex" gap={2} alignItems="center" mb={2}>
        <Avatar src={shop.logo} sx={{ width: 72, height: 72 }} />
        <Box>
          <Typography fontWeight={700}>{shop.shopName}</Typography>
          <Typography color="text.secondary" fontSize={13}>{shop.address}</Typography>
        </Box>
      </Box>

      <TextField
        label="Tên cửa hàng"
        fullWidth
        sx={{ mb: 2 }}
        value={shop.shopName}
        onChange={(e) => setShop({ ...shop, shopName: e.target.value })}
      />
      <TextField
        label="Địa chỉ"
        fullWidth
        sx={{ mb: 2 }}
        value={shop.address}
        onChange={(e) => setShop({ ...shop, address: e.target.value })}
      />
      <TextField
        label="Số điện thoại"
        fullWidth
        sx={{ mb: 2 }}
        value={shop.phone}
        onChange={(e) => setShop({ ...shop, phone: e.target.value })}
      />
      <TextField
        label="Website"
        fullWidth
        sx={{ mb: 2 }}
        value={shop.website ?? ""}
        onChange={(e) => setShop({ ...shop, website: e.target.value })}
      />
      <TextField
        label="Link logo (URL)"
        fullWidth
        sx={{ mb: 2 }}
        value={shop.logo ?? ""}
        onChange={(e) => setShop({ ...shop, logo: e.target.value })}
      />
      <TextField
        label="Mô tả"
        fullWidth
        multiline
        rows={4}
        sx={{ mb: 2 }}
        value={shop.description ?? ""}
        onChange={(e) => setShop({ ...shop, description: e.target.value })}
      />

      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu thay đổi"}
      </Button>
    </Box>
  );
}
