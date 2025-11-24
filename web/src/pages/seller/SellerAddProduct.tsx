import DeleteIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
// styling helpers
import { type ChangeEvent, useEffect, useState } from "react";
import { sellerService, type ShopInfo } from "../../api/sellerService";

interface NewProductForm {
  title: string;
  description: string;
  price: string;
  stock: string;
  categories: string[];
  origin: string;
  images: File[];
  videos: File[];
  brand: string;
  shortDescription: string;
  tags: string[];
  weight: string; // in grams (string to keep input simple)
  dimensions: { width: string; height: string; depth: string };
  shopId: string;
}

// (removed unused animation helper)

export default function SellerAddProduct() {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewVideos, setPreviewVideos] = useState<string[]>([]);

  const [form, setForm] = useState<NewProductForm>({
    title: "",
    description: "",
    price: "",
    stock: "",
    categories: [],
    origin: "Việt Nam",
    images: [],
    videos: [],
    brand: "",
    shortDescription: "",
    tags: [],
    weight: "",
    dimensions: { width: "", height: "", depth: "" },
    shopId: "",
  });

  const categories = ["Điện tử", "Thời trang", "Sách", "Đồ gia dụng", "Khác"];
  const origins = ["Việt Nam", "Trung Quốc", "Nhật Bản", "Hàn Quốc", "Thái Lan", "Khác"];

  useEffect(() => {
    const loadShop = async () => {
      try {
        const shopInfo = await sellerService.getShopInfo();
        setShop(shopInfo);
        setForm((prev) => ({ ...prev, shopId: shopInfo._id }));
      } catch (err) {
        console.error(err);
      }
    };
    loadShop();
  }, []);

  // ✅ Chọn nhiều ảnh liên tục (không ghi đè)
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selected = Array.from(files);

    // ✅ gộp ảnh cũ + ảnh mới
    const newImages = [...form.images, ...selected];

    // ✅ tạo preview cho tất cả ảnh
    const previews = newImages.map((file) => URL.createObjectURL(file));

    setForm((prev) => ({ ...prev, images: newImages }));
    setPreviewImages(previews);
  };

  // ✅ Chọn nhiều video (không ghi đè)
  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selected = Array.from(files);
    const newVideos = [...form.videos, ...selected];
    const previews = newVideos.map((file) => URL.createObjectURL(file));

    setForm((prev) => ({ ...prev, videos: newVideos }));
    setPreviewVideos(previews);
  };

  // ✅ Xóa từng ảnh
  const removeImage = (index: number) => {
    const updatedImages = [...form.images];
    updatedImages.splice(index, 1);

    setForm((prev) => ({ ...prev, images: updatedImages }));

    const newPreviews = updatedImages.map((file) => URL.createObjectURL(file));
    setPreviewImages(newPreviews);
  };

  // ✅ Xóa video
  const removeVideo = (index: number) => {
    const updated = [...form.videos];
    updated.splice(index, 1);
    setForm((prev) => ({ ...prev, videos: updated }));
    const previews = updated.map((file) => URL.createObjectURL(file));
    setPreviewVideos(previews);
  };

  const handleSubmit = async () => {
    try {
      const data = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key === "images") {
          (value as File[]).forEach((file) => data.append("images", file));
        } else if (key === "videos") {
          (value as File[]).forEach((file) => data.append("videos", file));
        } else if (key === "price") {
          data.append("price", (Number(value) * 1000).toString());
        } else if (key === "categories") {
            data.append("categories", JSON.stringify(value));
        } else if (key === "tags") {
            data.append("tags", JSON.stringify(value));
        } else if (key === "dimensions") {
            data.append("dimensions", JSON.stringify(value));
        } else {
            data.append(key, String(value));
        }
      });

      await sellerService.createProduct(data);
      alert("✅ Thêm sản phẩm thành công!");

      setForm({
        title: "",
        description: "",
        price: "",
        stock: "",
        categories: [],
        origin: "Việt Nam",
        images: [],
        videos: [],
        brand: "",
        shortDescription: "",
        tags: [],
        weight: "",
        dimensions: { width: "", height: "", depth: "" },
        shopId: form.shopId,
      });

      setPreviewImages([]);
      setPreviewVideos([]);
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi khi thêm sản phẩm!");
    }
  };

  if (!shop) return <Typography>Đang tải...</Typography>;

  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: 'linear-gradient(180deg, #f4f8fb 0%, #ffffff 100%)' }}>
      <Container maxWidth="lg">
        <Card elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ background: 'linear-gradient(90deg,#1976d2 0%, #42a5f5 100%)', p: 3, color: 'white' }}>
            <Typography variant="h4" fontWeight={800}>Thêm sản phẩm</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>Tạo sản phẩm mới cho cửa hàng của bạn</Typography>
          </Box>
          <CardContent sx={{ p: { xs: 2, md: 4 } }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Stack spacing={2}>
                  <TextField
                    label="Tên sản phẩm"
                    name="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    fullWidth
                    size="medium"
                  />

                  <TextField
                    label="Mô tả"
                    name="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={4}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        label="Giá (nghìn)"
                        name="price"
                        type="text"
                        value={form.price}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setForm({ ...form, price: raw });
                        }}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        label="Số lượng"
                        name="stock"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/\D/g, "") })}
                        fullWidth
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2} sx={{ mt: 0 }}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Danh mục</InputLabel>
                        <Select
                          multiple
                          value={form.categories}
                          onChange={(e) => setForm({ ...form, categories: e.target.value as string[] })}
                          label="Danh mục"
                        >
                          {categories.map((cat) => (
                            <MenuItem key={cat} value={cat}>
                              {cat}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Xuất xứ</InputLabel>
                        <Select
                          value={form.origin}
                          onChange={(e) => setForm({ ...form, origin: e.target.value })}
                          label="Xuất xứ"
                        >
                          {origins.map((origin) => (
                            <MenuItem key={origin} value={origin}>
                              {origin}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <TextField label="Thương hiệu" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} fullWidth />

                </Stack>
              </Grid>

              <Grid item xs={12} md={5}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Hình ảnh & Video</Typography>

                      <input
                        id="images-input"
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="images-input">
                        <Button component="span" variant="outlined" sx={{ width: '100%', justifyContent: 'flex-start', borderColor: '#1976d2', color: '#1976d2' }}>+ Thêm ảnh</Button>
                      </label>

                      <input
                        id="videos-input"
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={handleVideoChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="videos-input">
                        <Button component="span" variant="outlined" sx={{ mt: 1, width: '100%', justifyContent: 'flex-start', borderColor: '#1976d2', color: '#1976d2' }}>+ Thêm video</Button>
                      </label>

                      <Divider sx={{ my: 2 }} />

                      {/* Preview images */}
                      {previewImages.length > 0 && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 2 }}>
                          {previewImages.map((src, i) => (
                            <Box key={i} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #e3f2fd' }}>
                              <img src={src} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                              <IconButton size="small" onClick={() => removeImage(i)} sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.5)' }}>
                                <DeleteIcon sx={{ color: 'white', fontSize: 18 }} />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}

                      {previewVideos.length > 0 && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 2, mt: 1 }}>
                          {previewVideos.map((src, i) => (
                            <Box key={i} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #e3f2fd', bgcolor: '#000' }}>
                              <video src={src} style={{ width: '100%', height: 120, objectFit: 'cover' }} controls />
                              <IconButton size="small" onClick={() => removeVideo(i)} sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.5)' }}>
                                <DeleteIcon sx={{ color: 'white', fontSize: 18 }} />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      )}

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="subtitle2" color="text.secondary">Cửa hàng</Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                        <Chip label={shop.shopName} color="primary" sx={{ bgcolor: '#e8f0ff', color: '#1976d2', fontWeight: 700 }} />
                        <Typography variant="body2" color="text.secondary">ID: {shop._id}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Sản phẩm sẽ được duyệt tự động nếu hệ thống đang bật chế độ duyệt tự động (Auto Approve). Nếu không, trạng thái sẽ là <strong>Pending</strong> cho admin review.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" color="inherit" onClick={() => {
                    setForm({
                      title: "",
                      description: "",
                      price: "",
                      stock: "",
                      categories: [],
                      origin: "Việt Nam",
                      images: [],
                      videos: [],
                      brand: "",
                      shortDescription: "",
                      tags: [],
                      weight: "",
                      dimensions: { width: "", height: "", depth: "" },
                      shopId: form.shopId,
                    });
                    setPreviewImages([]);
                    setPreviewVideos([]);
                  }}>Reset</Button>
                  <Button variant="contained" onClick={handleSubmit} sx={{ background: 'linear-gradient(90deg,#1976d2 0%, #42a5f5 100%)' }}>Lưu sản phẩm</Button>
                </Box>
              </CardContent>
            </Card>
          </Container>
        </Box>
  );
}
