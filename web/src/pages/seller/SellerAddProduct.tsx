import { Box, Button, TextField, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import { type ChangeEvent, useEffect, useState } from "react";
import { sellerService, type ShopInfo } from "../../api/sellerService";

interface NewProductForm {
  title: string;
  description: string;
  price: string;
  stock: string;
  images: File[];
  shopId: string;
}

// Animation cho ".000" chạy
const fadeIn = keyframes`
  0% { opacity: 0.2; transform: translateY(-2px);}
  50% { opacity: 0.6; transform: translateY(0);}
  100% { opacity: 0.2; transform: translateY(-2px);}
`;

export default function SellerAddProduct() {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [form, setForm] = useState<NewProductForm>({
    title: "",
    description: "",
    price: "",
    stock: "",
    images: [],
    shopId: "",
  });

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const shopInfo = await sellerService.getShopInfo();
        setShop(shopInfo);
        setForm((prev) => ({ ...prev, shopId: shopInfo._id }));
      } catch (err) {
        console.error("Failed to fetch shop info", err);
      }
    };
    fetchShop();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "price" || name === "stock") {
      const numericValue = value.replace(/\D/g, "");
      setForm((prev) => ({ ...prev, [name]: numericValue }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setForm((prev) => ({ ...prev, images: Array.from(files) }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (!form.shopId) {
        alert("❌ Shop chưa sẵn sàng hoặc chưa tạo!");
        return;
      }

      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "images") {
          (value as File[]).forEach((file) => data.append("images", file));
        } else if (key === "price") {
          data.append(key, (Number(value) * 1000).toString());
        } else if (key === "stock") {
          data.append(key, Number(value).toString());
        } else {
          data.append(key, String(value));
        }
      });

      await sellerService.createProduct(data);
      alert("✅ Thêm sản phẩm thành công!");
      setForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        price: "",
        stock: "",
        images: [],
      }));
    } catch (error) {
      console.error(error);
      alert("❌ Lỗi khi thêm sản phẩm!");
    }
  };

  if (!shop) return <Typography>Đang tải thông tin Shop...</Typography>;

  return (
    <Box p={3} maxWidth={600}>
      <Typography variant="h5" mb={2}>
        ➕ Thêm sản phẩm mới
      </Typography>

      <TextField
        label="Tên sản phẩm"
        name="title"
        value={form.title}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />

      <TextField
        label="Mô tả"
        name="description"
        value={form.description}
        onChange={handleChange}
        fullWidth
        margin="normal"
        multiline
        rows={3}
      />

      <Box sx={{ position: "relative", width: "100%", marginTop: 16 }}>
        <TextField
          label="Giá (nghìn đồng)"
          name="price"
          type="text"
          value={form.price}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            setForm((prev) => ({ ...prev, price: raw }));
          }}
          fullWidth
          InputProps={{
            sx: { paddingRight: "40px" }, // chừa chỗ cho .000
          }}
        />
        {form.price && (
          <Typography
            sx={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#000",
              opacity: 0.5,
              animation: `${fadeIn} 1s infinite`,
              pointerEvents: "none",
              fontSize: 16,
            }}
          >
            .000
          </Typography>
        )}
      </Box>

      <TextField
        label="Số lượng tồn"
        name="stock"
        type="text"
        value={form.stock}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />

      <input type="file" multiple onChange={handleFileChange} style={{ marginTop: 16 }} />

      <Button variant="contained" color="primary" sx={{ mt: 3 }} onClick={handleSubmit}>
        Lưu sản phẩm
      </Button>
    </Box>
  );
}
