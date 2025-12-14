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
import { categoryService } from "../../api/categoryService";
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
  const [saving, setSaving] = useState(false);

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

  const [categories, setCategories] = useState<string[]>(["Điện tử", "Thời trang", "Sách", "Đồ gia dụng", "Khác"]);
  const origins = ["Việt Nam", "Trung Quốc", "Nhật Bản", "Hàn Quốc", "Thái Lan", "Khác"];

  // UI theme colors
  const primaryGradient = 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)';
  const cardBg = 'linear-gradient(120deg, #f0f7fa 0%, #e0e7ff 100%)';
  const sectionTitleStyle = { fontWeight: 800, color: '#334155', letterSpacing: 0.5 };
  const labelStyle = { fontWeight: 700, color: '#0ea5e9' };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await categoryService.listPublic();
        if (!mounted) return;
        // map to names for backward-compatibility
        setCategories(list.map((c) => c.name));
      } catch (err) {
        // keep defaults on error
        console.error("Failed to load categories:", err);
      }
    };
    load();

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }[]>).detail;
      if (Array.isArray(detail)) setCategories(detail.map((c) => c.name));
    };
    window.addEventListener("categoriesUpdated", handler);

    return () => {
      mounted = false;
      window.removeEventListener("categoriesUpdated", handler);
    };
  }, []);

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
      setSaving(true);
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

      // Force seller to go through a fresh page state for the next product.
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi khi thêm sản phẩm!");
    } finally {
      setSaving(false);
    }
  };

  if (!shop) return <Typography>Đang tải...</Typography>;

  return (
    <Box sx={{ minHeight: '100vh', py: 6, background: 'linear-gradient(180deg, #f0f9ff 0%, #e0e7ff 100%)' }}>
      <Container maxWidth="md">
        <Card elevation={4} sx={{ borderRadius: 5, overflow: 'hidden', background: cardBg, boxShadow: '0 8px 32px rgba(56,189,248,0.08)' }}>
          <Box sx={{ background: primaryGradient, p: 4, color: 'white', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
            <Typography variant="h4" sx={sectionTitleStyle} gutterBottom>Thêm sản phẩm mới</Typography>
            <Typography variant="body1" sx={{ opacity: 0.92, fontWeight: 500 }}>Tạo sản phẩm mới cho cửa hàng của bạn với đầy đủ thông tin và hình ảnh nổi bật.</Typography>
          </Box>
          <CardContent sx={{ p: { xs: 2, md: 5 } }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={7}>
                <Stack spacing={3}>
                  <TextField
                    label={<span style={labelStyle}>Tên sản phẩm</span>}
                    name="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    fullWidth
                    size="medium"
                    InputProps={{ sx: { borderRadius: 3, background: '#fff' } }}
                  />

                  <TextField
                    label={<span style={labelStyle}>Mô tả chi tiết</span>}
                    name="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={4}
                    InputProps={{ sx: { borderRadius: 3, background: '#fff' } }}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        label={<span style={labelStyle}>Giá (nghìn)</span>}
                        name="price"
                        type="text"
                        value={form.price}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setForm({ ...form, price: raw });
                        }}
                        fullWidth
                        InputProps={{ sx: { borderRadius: 3, background: '#fff' } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        label={<span style={labelStyle}>Số lượng</span>}
                        name="stock"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value.replace(/\D/g, "") })}
                        fullWidth
                        InputProps={{ sx: { borderRadius: 3, background: '#fff' } }}
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2} sx={{ mt: 0 }}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel sx={labelStyle}>Danh mục</InputLabel>
                        <Select
                          multiple
                          value={form.categories}
                          onChange={(e) => setForm({ ...form, categories: e.target.value as string[] })}
                          label="Danh mục"
                          sx={{ borderRadius: 3, background: '#fff' }}
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
                        <InputLabel sx={labelStyle}>Xuất xứ</InputLabel>
                        <Select
                          value={form.origin}
                          onChange={(e) => setForm({ ...form, origin: e.target.value })}
                          label="Xuất xứ"
                          sx={{ borderRadius: 3, background: '#fff' }}
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

                  <TextField
                    label={<span style={labelStyle}>Thương hiệu</span>}
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    fullWidth
                    InputProps={{ sx: { borderRadius: 3, background: '#fff' } }}
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={5}>
                <Box>
                  <Typography variant="subtitle1" sx={{ ...labelStyle, mb: 1 }}>Hình ảnh & Video</Typography>

                  <input
                    id="images-input"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="images-input">
                    <Button component="span" variant="outlined" sx={{ width: '100%', justifyContent: 'flex-start', borderColor: '#6366f1', color: '#6366f1', borderRadius: 3, fontWeight: 700 }}>+ Thêm ảnh</Button>
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
                    <Button component="span" variant="outlined" sx={{ mt: 1, width: '100%', justifyContent: 'flex-start', borderColor: '#06b6d4', color: '#06b6d4', borderRadius: 3, fontWeight: 700 }}>+ Thêm video</Button>
                  </label>

                  <Divider sx={{ my: 2 }} />

                  {/* Preview images */}
                  {previewImages.length > 0 && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 2 }}>
                      {previewImages.map((src, i) => (
                        <Box key={i} sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: '1.5px solid #bae6fd', boxShadow: '0 2px 8px rgba(14,165,233,0.08)' }}>
                          <img src={src} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
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
                        <Box key={i} sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', border: '1.5px solid #bae6fd', bgcolor: '#000', boxShadow: '0 2px 8px rgba(14,165,233,0.08)' }}>
                          <video src={src} style={{ width: '100%', height: 120, objectFit: 'cover' }} controls />
                          <IconButton size="small" onClick={() => removeVideo(i)} sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.5)' }}>
                            <DeleteIcon sx={{ color: 'white', fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>Cửa hàng</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                    <Chip label={shop.shopName} color="primary" sx={{ bgcolor: '#e0e7ff', color: '#6366f1', fontWeight: 700, fontSize: 16 }} />
                    <Typography variant="body2" color="text.secondary">ID: {shop._id}</Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

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
              }} sx={{ borderRadius: 3, fontWeight: 700 }}>Reset</Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                sx={{ background: primaryGradient, borderRadius: 3, fontWeight: 700, px: 4, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Đang lưu..." : "Lưu sản phẩm"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>

      {saving && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            backdropFilter: 'blur(6px)',
            background: 'linear-gradient(120deg, rgba(15,23,42,0.55), rgba(99,102,241,0.45))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 240,
              height: 240,
              borderRadius: 5,
              border: '1px solid rgba(148,163,184,0.3)',
              background: 'rgba(15,23,42,0.65)',
              boxShadow: '0 35px 90px rgba(0,0,0,0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: '#e2e8f0',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(150deg, rgba(99,102,241,0.18), transparent)',
              }}
            />
            <Box
              sx={{
                position: 'relative',
                width: 120,
                height: 120,
              }}
            >
              {[...Array(10)].map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    top: '50%',
                    left: '50%',
                    marginTop: '-5px',
                    marginLeft: '-5px',
                    background: 'linear-gradient(120deg, #67e8f9, #38bdf8)',
                    transformOrigin: '0 -35px',
                    animation: 'orbitDot 1.2s linear infinite',
                    animationDelay: `${index * 0.1}s`,
                  }}
                />
              ))}
            </Box>
            <Typography fontWeight={700}>Đang thêm sản phẩm...</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Vui lòng đợi trong giây lát
            </Typography>
          </Box>
          <style>{`
            @keyframes orbitDot {
              from { transform: rotate(0deg) translateY(-35px) rotate(0deg); }
              to { transform: rotate(360deg) translateY(-35px) rotate(-360deg); }
            }
          `}</style>
        </Box>
      )}
    </Box>
  );
}
