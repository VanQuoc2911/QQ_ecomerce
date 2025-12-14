import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { isAxiosError } from "axios";
import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { categoryService } from "../../api/categoryService";

interface ProductForm {
  title: string;
  description: string;
  price: number;
  stock: number;
  categories: string[];
  origin: string;
  images: string[];
  newImages: File[];
  videos: string[];
  newVideos: File[];
}

const MAX_IMAGES = 6;
const MAX_VIDEOS = 4;

export default function SellerEditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>({
    title: "",
    description: "",
    price: 0,
    stock: 0,
    categories: [],
    origin: "Việt Nam",
    images: [],
    newImages: [],
    videos: [],
    newVideos: [],
  });
  const [loading, setLoading] = useState(true);
  const [isListed, setIsListed] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<Set<string>>(new Set());
  const [removedVideoIds, setRemovedVideoIds] = useState<Set<string>>(new Set());

  const [categories, setCategories] = useState<string[]>(["Điện tử", "Thời trang", "Sách", "Đồ gia dụng", "Khác"]);
  const origins = ["Việt Nam", "Trung Quốc", "Nhật Bản", "Hàn Quốc", "Thái Lan", "Khác"];
  const editingLocked = isListed;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await categoryService.listPublic();
        if (!mounted) return;
        setCategories(list.map((c) => c.name));
      } catch (err) {
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
    if (!id) return;
    setLoadError(null);
    setNotFound(false);
    api
      .get(`/api/seller/products/${id}`)
      .then((res) => {
        const p = res.data;
        setForm((prev) => ({
          ...prev,
          title: p.title ?? "",
          description: p.description ?? "",
          price: p.price ?? 0,
          stock: p.stock ?? 0,
          categories: p.categories ?? [],
          origin: p.origin ?? "Việt Nam",
          images: p.images ?? [],
          videos: p.videos ?? [],
        }));
        setIsListed(p.isListed !== false);
        setRemovedImageIds(new Set());
        setRemovedVideoIds(new Set());
      })
      .catch((err) => {
        console.error(err);
        if (isAxiosError(err) && err.response) {
          if (err.response.status === 404) {
            setNotFound(true);
            setLoadError("Sản phẩm không tồn tại hoặc đã bị xoá.");
            return;
          }
        }
        setLoadError("Không tải được sản phẩm. Vui lòng thử lại sau.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!form.newImages.length) {
      setImagePreviews([]);
      return;
    }
    const urls = form.newImages.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [form.newImages]);

  useEffect(() => {
    if (!form.newVideos.length) {
      setVideoPreviews([]);
      return;
    }
    const urls = form.newVideos.map((file) => URL.createObjectURL(file));
    setVideoPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [form.newVideos]);

  const handleCategoriesChange = (event: SelectChangeEvent<string[]>) => {
    const { value } = event.target;
    setForm({
      ...form,
      categories: typeof value === "string" ? value.split(",") : value,
    });
  };

  const handleOriginChange = (event: SelectChangeEvent) => {
    setForm({ ...form, origin: event.target.value });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setForm((prev) => {
        const existingImages = prev.images.filter((url) => !removedImageIds.has(url));
        const usedSlots = existingImages.length + prev.newImages.length;
        const availableSlots = MAX_IMAGES - usedSlots;
        if (availableSlots <= 0) {
          alert(`Bạn chỉ có thể chọn tối đa ${MAX_IMAGES} ảnh mới trong một lần cập nhật.`);
          return prev;
        }
        const incoming = Array.from(files).slice(0, availableSlots);
        if (incoming.length < files.length) {
          alert(`Chỉ thêm ${availableSlots} ảnh để đảm bảo giới hạn ${MAX_IMAGES} ảnh mới.`);
        }
        return { ...prev, newImages: [...prev.newImages, ...incoming] };
      });
    }
    if (event.target) event.target.value = "";
  };

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setForm((prev) => {
        const existingVideos = prev.videos.filter((url) => !removedVideoIds.has(url));
        const usedSlots = existingVideos.length + prev.newVideos.length;
        const availableSlots = MAX_VIDEOS - usedSlots;
        if (availableSlots <= 0) {
          alert(`Bạn chỉ có thể chọn tối đa ${MAX_VIDEOS} video mới trong một lần cập nhật.`);
          return prev;
        }
        const incoming = Array.from(files).slice(0, availableSlots);
        if (incoming.length < files.length) {
          alert(`Chỉ thêm ${availableSlots} video để đảm bảo giới hạn ${MAX_VIDEOS} video mới.`);
        }
        return { ...prev, newVideos: [...prev.newVideos, ...incoming] };
      });
    }
    if (event.target) event.target.value = "";
  };

  const handleRemoveNewImage = (index: number) => {
    setForm((prev) => {
      const next = [...prev.newImages];
      next.splice(index, 1);
      return { ...prev, newImages: next };
    });
  };

  const handleRemoveNewVideo = (index: number) => {
    setForm((prev) => {
      const next = [...prev.newVideos];
      next.splice(index, 1);
      return { ...prev, newVideos: next };
    });
  };

  const handleToggleExistingImage = (url: string) => {
    setRemovedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleToggleExistingVideo = (url: string) => {
    setRemovedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (editingLocked) {
      alert("Vui lòng ngưng mở bán sản phẩm trước khi chỉnh sửa.");
      return;
    }
    try {
      const data = new FormData();
      data.append("title", form.title);
      data.append("description", form.description);
      data.append("price", String(form.price));
      data.append("stock", String(form.stock));
      data.append("categories", JSON.stringify(form.categories));
      data.append("origin", form.origin);
      const keptImages = form.images.filter((url) => !removedImageIds.has(url));
      const keptVideos = form.videos.filter((url) => !removedVideoIds.has(url));
      const hasImageChanges = removedImageIds.size > 0 || form.newImages.length > 0;
      const hasVideoChanges = removedVideoIds.size > 0 || form.newVideos.length > 0;
      if (hasImageChanges) {
        data.append("retainImages", JSON.stringify(keptImages));
      }
      if (hasVideoChanges) {
        data.append("retainVideos", JSON.stringify(keptVideos));
      }
      form.newImages.forEach((file) => data.append("images", file));
      form.newVideos.forEach((file) => data.append("videos", file));

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

  if (loading)
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress color="primary" thickness={5} />
        <Typography color="text.secondary">Đang tải dữ liệu sản phẩm...</Typography>
      </Box>
    );

  if (loadError)
    return (
      <Box
        sx={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          px: 2,
        }}
      >
        <Paper
          sx={{
            maxWidth: 520,
            width: "100%",
            p: 4,
            borderRadius: 4,
            textAlign: "center",
            border: "1px solid rgba(248,113,113,0.3)",
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 40, color: "#f87171", mb: 2 }} />
          <Typography variant="h5" fontWeight={700} mb={1}>
            {notFound ? "Không tìm thấy sản phẩm" : "Không thể tải dữ liệu"}
          </Typography>
          <Typography color="text.secondary" mb={3}>
            {loadError}
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIosNewIcon />}
            onClick={() => navigate("/seller/products")}
            sx={{ textTransform: "none", borderRadius: 3 }}
          >
            Quay lại trang sản phẩm
          </Button>
        </Paper>
      </Box>
    );

  return (
    <Box sx={{ backgroundColor: "#f5f7fb", minHeight: "100vh", py: 4 }}>
      <Box maxWidth={1100} mx="auto" px={{ xs: 2, md: 0 }}>
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 4,
            p: { xs: 3, md: 4 },
            background: "linear-gradient(135deg, #eef2ff 0%, #e0f2fe 100%)",
            border: "1px solid rgba(99,102,241,0.3)",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            gap: 3,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ letterSpacing: 2, color: "#6366f1", fontWeight: 700 }}
            >
              Seller Studio
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color: "#0f172a" }}>
              Chỉnh sửa sản phẩm
            </Typography>
            <Typography color="text.secondary" maxWidth={520}>
              Cập nhật nội dung, giá và hình ảnh để đảm bảo sản phẩm luôn nổi bật.
            </Typography>
            <Box mt={2} display="flex" gap={1} flexWrap="wrap">
              <Chip
                label={`${form.images.length} ảnh hiện có`}
                size="small"
                sx={{
                  backgroundColor: "rgba(99,102,241,0.15)",
                  color: "#4338ca",
                  fontWeight: 600,
                }}
              />
              {removedImageIds.size > 0 && (
                <Chip
                  label={`${removedImageIds.size} ảnh sẽ xoá`}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(248,113,113,0.25)",
                    color: "#b91c1c",
                    fontWeight: 600,
                  }}
                />
              )}
              <Chip
                label={`${form.categories.length || 0} danh mục`}
                size="small"
                sx={{
                  backgroundColor: "rgba(14,165,233,0.15)",
                  color: "#0369a1",
                  fontWeight: 600,
                }}
              />
              <Chip
                label={`${form.videos.length} video`}
                size="small"
                sx={{
                  backgroundColor: "rgba(16,185,129,0.15)",
                  color: "#047857",
                  fontWeight: 600,
                }}
              />
              {removedVideoIds.size > 0 && (
                <Chip
                  label={`${removedVideoIds.size} video sẽ xoá`}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(248,113,113,0.25)",
                    color: "#b91c1c",
                    fontWeight: 600,
                  }}
                />
              )}
              <Chip
                label={editingLocked ? "Đang mở bán" : "Đang tạm ngưng"}
                size="small"
                sx={{
                  backgroundColor: editingLocked ? "rgba(248,113,113,0.2)" : "rgba(16,185,129,0.15)",
                  color: editingLocked ? "#b91c1c" : "#047857",
                  fontWeight: 600,
                }}
              />
            </Box>
            {editingLocked && (
              <Alert
                severity="warning"
                icon={<LockOutlinedIcon fontSize="small" />}
                sx={{
                  mt: 2,
                  borderRadius: 3,
                  border: "1px solid rgba(248,113,113,0.4)",
                  backgroundColor: "rgba(254,226,226,0.6)",
                  color: "#991b1b",
                }}
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate("/seller/products")}
                    sx={{ textTransform: "none", borderRadius: 2 }}
                  >
                    Tới trang sản phẩm
                  </Button>
                }
              >
                Sản phẩm đang mở bán. Hãy ngưng mở bán trong mục "Trang sản phẩm" trước khi chỉnh sửa nội dung.
              </Alert>
            )}
          </Box>
          <Box display="flex" gap={1.5} alignItems="flex-start">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIosNewIcon />}
              sx={{ textTransform: "none", borderRadius: 3 }}
              onClick={() => navigate("/seller/products")}
            >
              Trang sản phẩm
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveRoundedIcon />}
              sx={{
                textTransform: "none",
                borderRadius: 3,
                boxShadow: "0 12px 24px rgba(99,102,241,0.25)",
              }}
              disabled={editingLocked}
              onClick={handleSave}
            >
              Lưu thay đổi
            </Button>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,0.3)",
                backgroundColor: "#ffffff",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={2}>
                Thông tin cơ bản
              </Typography>
              <TextField
                label="Tên sản phẩm"
                fullWidth
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                disabled={editingLocked}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Mô tả sản phẩm"
                fullWidth
                multiline
                minRows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                disabled={editingLocked}
              />
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,0.3)",
                backgroundColor: "#ffffff",
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={2}>
                Giá & phân loại
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Giá bán"
                    type="number"
                    fullWidth
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: Number(event.target.value) })
                    }
                    disabled={editingLocked}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₫</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Số lượng tồn"
                    type="number"
                    fullWidth
                    value={form.stock}
                    onChange={(event) =>
                      setForm({ ...form, stock: Number(event.target.value) })
                    }
                    disabled={editingLocked}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">sp</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Danh mục</InputLabel>
                    <Select
                      multiple
                      label="Danh mục"
                      value={form.categories}
                      onChange={handleCategoriesChange}
                      disabled={editingLocked}
                      input={<OutlinedInput label="Danh mục" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Xuất xứ</InputLabel>
                    <Select
                      value={form.origin}
                      label="Xuất xứ"
                      onChange={handleOriginChange}
                      disabled={editingLocked}
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
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,0.3)",
                backgroundColor: "#ffffff",
                position: "sticky",
                top: 24,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                Tổng quan nhanh
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: "#0f172a" }}>
                {form.price.toLocaleString("vi-VN")} ₫
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Giá niêm yết hiện tại
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Tồn kho khả dụng
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {form.stock.toLocaleString("vi-VN")} sản phẩm
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary" mb={1}>
                Xuất xứ
              </Typography>
              <Chip label={form.origin} color="primary" variant="outlined" />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,0.3)",
                backgroundColor: "#ffffff",
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={2}>
                Thư viện hình ảnh
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Kéo thả hoặc tải lên tối đa 6 ảnh chất lượng cao để tăng độ tin cậy cho sản phẩm.
              </Typography>
              {form.images.length ? (
                <Grid container spacing={2}>
                  {form.images.map((url, index) => {
                    const isMarkedForRemoval = removedImageIds.has(url);
                    return (
                      <Grid item xs={12} sm={6} md={3} key={`${url}-${index}`}>
                        <Card
                          elevation={0}
                          sx={{
                            borderRadius: 2,
                            overflow: "hidden",
                            border: isMarkedForRemoval
                              ? "1px solid rgba(248,113,113,0.6)"
                              : "1px solid rgba(148,163,184,0.4)",
                            position: "relative",
                          }}
                        >
                          <Box sx={{ position: "relative" }}>
                            <CardMedia
                              component="img"
                              height="160"
                              image={url}
                              alt={`Ảnh ${index + 1}`}
                              sx={{
                                filter: isMarkedForRemoval ? "grayscale(0.8)" : "none",
                                opacity: isMarkedForRemoval ? 0.45 : 1,
                                transition: "all 0.2s ease",
                              }}
                            />
                            <Tooltip
                              title={
                                isMarkedForRemoval
                                  ? "Giữ lại ảnh này"
                                  : "Đánh dấu xoá ảnh này"
                              }
                              disableHoverListener={editingLocked}
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleExistingImage(url)}
                                  disabled={editingLocked}
                                  sx={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    backgroundColor: isMarkedForRemoval
                                      ? "rgba(34,197,94,0.85)"
                                      : "rgba(248,113,113,0.85)",
                                    color: "#fff",
                                    "&:hover": {
                                      backgroundColor: isMarkedForRemoval
                                        ? "rgba(22,163,74,0.95)"
                                        : "rgba(239,68,68,0.95)",
                                    },
                                  }}
                                  aria-label={
                                    isMarkedForRemoval ? "Hoàn tác xoá ảnh" : "Đánh dấu xoá ảnh"
                                  }
                                >
                                  {isMarkedForRemoval ? (
                                    <UndoRoundedIcon fontSize="small" />
                                  ) : (
                                    <CloseRoundedIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                            {isMarkedForRemoval && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  inset: 0,
                                  backgroundColor: "rgba(15,23,42,0.65)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontWeight: 700,
                                  letterSpacing: 1,
                                  textTransform: "uppercase",
                                }}
                              >
                                Sẽ xoá
                              </Box>
                            )}
                          </Box>
                          <CardContent sx={{ py: 1.5 }}>
                            <Typography fontSize={13} fontWeight={600} mb={1}>
                              Ảnh {index + 1}
                            </Typography>
                            <Chip
                              label={isMarkedForRemoval ? "Đã đánh dấu xoá" : "Giữ lại"}
                              size="small"
                              sx={{
                                backgroundColor: isMarkedForRemoval
                                  ? "rgba(248,113,113,0.15)"
                                  : "rgba(34,197,94,0.15)",
                                color: isMarkedForRemoval ? "#b91c1c" : "#0f766e",
                                fontWeight: 600,
                              }}
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Box
                  sx={{
                    border: "1px dashed rgba(148,163,184,0.5)",
                    borderRadius: 3,
                    py: 5,
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  Chưa có hình ảnh nào cho sản phẩm này.
                </Box>
              )}

              <Box
                sx={{
                  mt: 3,
                  border: "2px dashed rgba(99,102,241,0.4)",
                  borderRadius: 3,
                  p: 3,
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography fontWeight={700}>Thêm ảnh mới</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hỗ trợ PNG, JPG (tối đa 5MB/ảnh)
                  </Typography>
                  {form.newImages.length > 0 && (
                    <Chip label={`${form.newImages.length} ảnh đã chọn`} size="small" sx={{ mt: 1 }} />
                  )}
                </Box>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  component="label"
                  sx={{ textTransform: "none", borderRadius: 3 }}
                  disabled={editingLocked}
                >
                  Chọn ảnh
                  <input
                    hidden
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={editingLocked}
                    onChange={handleFileChange}
                  />
                </Button>
              </Box>

              {imagePreviews.length > 0 && (
                <Box mt={3}>
                  <Typography fontWeight={700} mb={1}>
                    Ảnh mới sẽ được tải lên
                  </Typography>
                  <Grid container spacing={2}>
                    {imagePreviews.map((url, index) => (
                      <Grid item xs={12} sm={6} md={3} key={`${url}-${index}`}>
                        <Card
                          elevation={0}
                          sx={{
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid rgba(99,102,241,0.2)",
                            position: "relative",
                          }}
                        >
                          <Tooltip title="Xoá ảnh khỏi danh sách tải lên" disableHoverListener={editingLocked}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveNewImage(index)}
                                disabled={editingLocked}
                                sx={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  backgroundColor: "rgba(15,23,42,0.7)",
                                  color: "#fff",
                                  "&:hover": { backgroundColor: "rgba(15,23,42,0.9)" },
                                }}
                                aria-label="Xoá ảnh mới"
                              >
                                <CloseRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <CardMedia component="img" height="160" image={url} alt={`Ảnh mới ${index + 1}`} />
                          <CardContent sx={{ py: 1.5 }}>
                            <Typography fontSize={13} fontWeight={600}>
                              Ảnh mới {index + 1}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,0.3)",
                backgroundColor: "#ffffff",
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={2}>
                Video sản phẩm
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Thêm các đoạn video ngắn (tối đa 60s) để tăng độ tin tưởng và trải nghiệm mua sắm.
              </Typography>
              {form.videos.length ? (
                <Grid container spacing={2}>
                  {form.videos.map((url, index) => {
                    const isMarkedForRemoval = removedVideoIds.has(url);
                    return (
                      <Grid item xs={12} sm={6} md={4} key={`${url}-${index}`}>
                        <Card
                          elevation={0}
                          sx={{
                            borderRadius: 2,
                            overflow: "hidden",
                            border: isMarkedForRemoval
                              ? "1px solid rgba(248,113,113,0.6)"
                              : "1px solid rgba(148,163,184,0.4)",
                            position: "relative",
                          }}
                        >
                          <Box sx={{ position: "relative" }}>
                            <Box
                              component="video"
                              src={url}
                              controls
                              sx={{
                                width: "100%",
                                height: 180,
                                objectFit: "cover",
                                backgroundColor: "#0f172a",
                                filter: isMarkedForRemoval ? "grayscale(1)" : "none",
                                opacity: isMarkedForRemoval ? 0.5 : 1,
                                transition: "all 0.2s ease",
                              }}
                            />
                            <Tooltip
                              title={
                                isMarkedForRemoval
                                  ? "Giữ lại video này"
                                  : "Đánh dấu xoá video này"
                              }
                              disableHoverListener={editingLocked}
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleExistingVideo(url)}
                                  disabled={editingLocked}
                                  sx={{
                                    position: "absolute",
                                    top: 8,
                                    right: 8,
                                    backgroundColor: isMarkedForRemoval
                                      ? "rgba(34,197,94,0.85)"
                                      : "rgba(248,113,113,0.85)",
                                    color: "#fff",
                                    "&:hover": {
                                      backgroundColor: isMarkedForRemoval
                                        ? "rgba(22,163,74,0.95)"
                                        : "rgba(239,68,68,0.95)",
                                    },
                                  }}
                                  aria-label={
                                    isMarkedForRemoval ? "Hoàn tác xoá video" : "Đánh dấu xoá video"
                                  }
                                >
                                  {isMarkedForRemoval ? (
                                    <UndoRoundedIcon fontSize="small" />
                                  ) : (
                                    <CloseRoundedIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                            {isMarkedForRemoval && (
                              <Box
                                sx={{
                                  position: "absolute",
                                  inset: 0,
                                  backgroundColor: "rgba(15,23,42,0.65)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#fff",
                                  fontWeight: 700,
                                  letterSpacing: 1,
                                  textTransform: "uppercase",
                                }}
                              >
                                Sẽ xoá
                              </Box>
                            )}
                          </Box>
                          <CardContent sx={{ py: 1.5 }}>
                            <Typography fontSize={13} fontWeight={600} mb={1}>
                              Video {index + 1}
                            </Typography>
                            <Chip
                              label={isMarkedForRemoval ? "Đã đánh dấu xoá" : "Giữ lại"}
                              size="small"
                              sx={{
                                backgroundColor: isMarkedForRemoval
                                  ? "rgba(248,113,113,0.15)"
                                  : "rgba(34,197,94,0.15)",
                                color: isMarkedForRemoval ? "#b91c1c" : "#0f766e",
                                fontWeight: 600,
                              }}
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Box
                  sx={{
                    border: "1px dashed rgba(148,163,184,0.5)",
                    borderRadius: 3,
                    py: 5,
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  Chưa có video nào cho sản phẩm này.
                </Box>
              )}

              <Box
                sx={{
                  mt: 3,
                  border: "2px dashed rgba(16,185,129,0.4)",
                  borderRadius: 3,
                  p: 3,
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography fontWeight={700}>Thêm video mới</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hỗ trợ MP4, MOV (tối đa 50MB/video)
                  </Typography>
                  {form.newVideos.length > 0 && (
                    <Chip label={`${form.newVideos.length} video đã chọn`} size="small" sx={{ mt: 1 }} />
                  )}
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  component="label"
                  sx={{ textTransform: "none", borderRadius: 3 }}
                  disabled={editingLocked}
                >
                  Chọn video
                  <input
                    hidden
                    type="file"
                    multiple
                    accept="video/*"
                    disabled={editingLocked}
                    onChange={handleVideoChange}
                  />
                </Button>
              </Box>

              {videoPreviews.length > 0 && (
                <Box mt={3}>
                  <Typography fontWeight={700} mb={1}>
                    Video mới sẽ được tải lên
                  </Typography>
                  <Grid container spacing={2}>
                    {videoPreviews.map((url, index) => (
                      <Grid item xs={12} sm={6} md={4} key={`${url}-${index}`}>
                        <Card
                          elevation={0}
                          sx={{
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid rgba(16,185,129,0.2)",
                            position: "relative",
                          }}
                        >
                          <Tooltip title="Xoá video khỏi danh sách tải lên" disableHoverListener={editingLocked}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveNewVideo(index)}
                                disabled={editingLocked}
                                sx={{
                                  position: "absolute",
                                  top: 8,
                                  right: 8,
                                  backgroundColor: "rgba(15,23,42,0.7)",
                                  color: "#fff",
                                  "&:hover": { backgroundColor: "rgba(15,23,42,0.9)" },
                                }}
                                aria-label="Xoá video mới"
                              >
                                <CloseRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Box component="video" src={url} controls sx={{ width: "100%", height: 200 }} />
                          <CardContent sx={{ py: 1.5 }}>
                            <Typography fontSize={13} fontWeight={600}>
                              Video mới {index + 1}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="flex-end" gap={1.5} mt={4}>
          <Button
            variant="outlined"
            sx={{ textTransform: "none", borderRadius: 3 }}
            onClick={() => navigate("/seller/products")}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            sx={{ textTransform: "none", borderRadius: 3 }}
            disabled={editingLocked}
            onClick={handleSave}
          >
            Lưu cập nhật
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
