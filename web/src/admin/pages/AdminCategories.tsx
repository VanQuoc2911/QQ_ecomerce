import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { categoryService, type Category } from "../../api/categoryService";

interface CategoryFormState {
  name: string;
  description: string;
}

const initialForm: CategoryFormState = { name: "", description: "" };

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await categoryService.list();
      setCategories([...data].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh mục. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const handler: EventListener = (event) => {
      const detail = (event as CustomEvent<Category[]>).detail;
      if (Array.isArray(detail)) {
        setCategories([...detail].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
      }
    };
    window.addEventListener("categoriesUpdated", handler);
    return () => window.removeEventListener("categoriesUpdated", handler);
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const keyword = search.toLowerCase();
    return categories.filter((category) =>
      [category.name, category.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword))
    );
  }, [categories, search]);

  const stats = useMemo(() => {
    const total = categories.length;
    const latest = categories.reduce<Date | null>((acc, category) => {
      const ts = category.updatedAt || category.createdAt;
      if (!ts) return acc;
      const date = new Date(ts);
      if (!acc || date > acc) return date;
      return acc;
    }, null);
    return { total, latest };
  }, [categories]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const description = form.description.trim();
    if (!name) {
      toast.error("Tên danh mục không được để trống");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await categoryService.update(editingId, {
          name,
          description: description || undefined,
        });
        setCategories((prev) =>
          prev
            .map((cat) => (cat._id === updated._id ? updated : cat))
            .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
        );
        toast.success("Đã cập nhật danh mục");
      } else {
        const created = await categoryService.create({ name, description: description || undefined });
        setCategories((prev) => [...prev, created].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
        toast.success("Đã tạo danh mục mới");
      }
      setForm(initialForm);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error("Không thể lưu danh mục. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category._id);
    setForm({ name: category.name, description: category.description ?? "" });
  };

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(`Xoá danh mục "${category.name}"?`);
    if (!confirmed) return;
    setActionId(category._id);
    try {
      await categoryService.remove(category._id ?? category.id ?? "");
      setCategories((prev) => prev.filter((item) => item._id !== category._id));
      toast.success("Đã xoá danh mục");
    } catch (err) {
      console.error(err);
      toast.error("Không thể xoá danh mục.");
    } finally {
      setActionId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const lastUpdatedText = stats.latest
    ? new Date(stats.latest).toLocaleString("vi-VN", { hour12: false })
    : "Chưa có dữ liệu";

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            background: "linear-gradient(120deg, rgba(14,165,233,0.1), rgba(99,102,241,0.15))",
            border: "1px solid rgba(37,99,235,0.2)",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ xs: "flex-start", md: "center" }}>
            <Stack spacing={1} flex={1}>
              <Chip
                icon={<CategoryRoundedIcon />}
                label="Quản lý danh mục"
                sx={{ width: "fit-content", fontWeight: 600 }}
                color="primary"
              />
              <Typography variant="h4" fontWeight={800} color="#0f172a">
                Toàn quyền kiểm soát danh mục sản phẩm
              </Typography>
              <Typography color="text.secondary">
                Tạo, chỉnh sửa hoặc xoá danh mục để thống nhất trải nghiệm tìm kiếm sản phẩm trên toàn bộ hệ thống.
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" mt={1}>
                <Chip label={`Tổng danh mục: ${stats.total}`} color="info" variant="outlined" />
                <Chip label={`Cập nhật gần nhất: ${lastUpdatedText}`} variant="outlined" />
              </Stack>
            </Stack>
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={18} /> : <RefreshRoundedIcon />}
              onClick={loadCategories}
              sx={{ textTransform: "none", borderRadius: 3 }}
            >
              Làm mới
            </Button>
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid rgba(148,163,184,0.4)" }}>
              <Typography variant="h6" fontWeight={700} mb={2}>
                {editingId ? "Cập nhật danh mục" : "Thêm danh mục mới"}
              </Typography>
              <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Tên danh mục"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  disabled={saving}
                />
                <TextField
                  label="Mô tả (không bắt buộc)"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  disabled={saving}
                  multiline
                  minRows={3}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<AddCircleOutlineRoundedIcon />}
                    disabled={saving}
                    sx={{ flex: 1, textTransform: "none", borderRadius: 3 }}
                  >
                    {editingId ? "Lưu thay đổi" : "Thêm danh mục"}
                  </Button>
                  {editingId && (
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={handleCancelEdit}
                      disabled={saving}
                      sx={{ textTransform: "none" }}
                    >
                      Huỷ
                    </Button>
                  )}
                </Stack>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid rgba(148,163,184,0.4)", minHeight: 420 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Danh sách danh mục
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tìm kiếm và chỉnh sửa trực tiếp các danh mục hiện có.
                  </Typography>
                </Box>
                <TextField
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên hoặc mô tả"
                  size="small"
                />
              </Stack>

              {loading ? (
                <Box minHeight={240} display="flex" alignItems="center" justifyContent="center">
                  <CircularProgress />
                </Box>
              ) : filteredCategories.length === 0 ? (
                <Box
                  minHeight={240}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                  color="text.secondary"
                  gap={1}
                >
                  <CategoryRoundedIcon fontSize="large" />
                  <Typography>Chưa có danh mục phù hợp.</Typography>
                  <Typography variant="body2">
                    Hãy tạo danh mục mới hoặc thay đổi điều kiện tìm kiếm.
                  </Typography>
                </Box>
              ) : (
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell width={80}>Mã</TableCell>
                      <TableCell>Tên danh mục</TableCell>
                      <TableCell>Mô tả</TableCell>
                      <TableCell width={160}>Cập nhật</TableCell>
                      <TableCell width={120} align="right">
                        Thao tác
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCategories.map((category) => {
                      const updatedAt = category.updatedAt || category.createdAt;
                      return (
                        <TableRow key={category._id} hover>
                          <TableCell>
                            <Chip label={category.id ?? "—"} size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={600}>{category.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
                              {category.description || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {updatedAt
                                ? new Date(updatedAt).toLocaleDateString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Chỉnh sửa">
                                <span>
                                  <IconButton onClick={() => handleEdit(category)} disabled={saving}>
                                    <EditRoundedIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Xoá danh mục">
                                <span>
                                  <IconButton
                                    color="error"
                                    onClick={() => handleDelete(category)}
                                    disabled={actionId === category._id}
                                  >
                                    {actionId === category._id ? (
                                      <CircularProgress size={18} />
                                    ) : (
                                      <DeleteRoundedIcon />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}
