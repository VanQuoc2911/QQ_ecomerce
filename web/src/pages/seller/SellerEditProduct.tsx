import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";

interface ProductForm {
  title: string;
  description: string;
  price: number;
  stock: number;
  images: string[]; // existing URLs
  newImages: File[]; // files to upload
}

export default function SellerEditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>({
    title: "",
    description: "",
    price: 0,
    stock: 0,
    images: [],
    newImages: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/products/${id}`)
      .then((res) => {
        const p = res.data;
        setForm((f) => ({
          ...f,
          title: p.title || "",
          description: p.description || "",
          price: p.price || 0,
          stock: p.stock || 0,
          images: p.images || [],
        }));
      })
      .catch((e) => {
        console.error(e);
        alert("Không tải được sản phẩm");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setForm((prev) => ({ ...prev, newImages: Array.from(files) }));
    }
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("description", form.description);
      data.append("price", String(form.price));
      data.append("stock", String(form.stock));
      // append new files if any
      form.newImages.forEach((f) => data.append("images", f));

      await api.put(`/api/products/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Cập nhật sản phẩm thành công");
      navigate("/seller/products");
    } catch (err) {
      console.error(err);
      alert("Lỗi cập nhật sản phẩm");
    }
  };

  if (loading) return <Typography>Đang tải...</Typography>;

  return (
    <Box maxWidth={900} p={2}>
      <Typography variant="h5" mb={2}>
        ✏️ Chỉnh sửa sản phẩm
      </Typography>

      <TextField
        label="Tên sản phẩm"
        fullWidth
        sx={{ mb: 2 }}
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <TextField
        label="Mô tả"
        fullWidth
        multiline
        rows={3}
        sx={{ mb: 2 }}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Giá"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
        />
        <TextField
          label="Số lượng tồn"
          type="number"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
        />
      </Box>

      <Box mb={2}>
        <Typography fontWeight={700} mb={1}>
          Ảnh hiện tại
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          {form.images.map((u, idx) => (
            <Card key={idx} sx={{ width: 140 }}>
              <CardMedia component="img" height="100" image={u} />
              <CardContent>
                <Typography fontSize={12}>{`Ảnh ${idx + 1}`}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      <Box mb={2}>
        <Typography fontWeight={700} mb={1}>
          Thêm ảnh mới (nếu muốn)
        </Typography>
        <input type="file" multiple accept="image/*" onChange={handleFileChange} />
      </Box>

      <Button variant="contained" onClick={handleSave}>
        Lưu thay đổi
      </Button>
    </Box>
  );
}
