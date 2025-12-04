import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { productService, type ApiProduct } from "../../api/productService";

type ProductWithCategory = ApiProduct & { category?: string };

export default function SellerProducts() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const items = await productService.getMyProducts();
      setProducts(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Bạn có chắc muốn xoá sản phẩm này không?");
    if (!confirmed) return;

    try {
      await productService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
      alert("Xoá sản phẩm thất bại!");
    }
  };

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }),
    []
  );

  const stats = useMemo(() => {
    const totalInventory = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
    const activeCount = products.filter((p) => p.status === "active").length;
    const lowStock = products.filter((p) => (p.stock || 0) < 10).length;
    return { totalInventory, totalValue, activeCount, lowStock };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchStatus =
        statusFilter === "all" || (statusFilter === "active" ? p.status === "active" : p.status !== "active");
      const matchSearch = !searchTerm.length
        ? true
        : p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      return matchStatus && matchSearch;
    });
  }, [products, searchTerm, statusFilter]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at top, #0f172a, #020617)",
        }}
      >
        <Stack spacing={2} textAlign="center">
          <CircularProgress size={64} sx={{ color: "#38bdf8" }} />
          <Typography variant="body1" color="#bfdbfe">
            Đang tải sản phẩm, vui lòng đợi...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg, #ffffff 0%, #e0f2ff 80%)", py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              background: "linear-gradient(120deg, rgba(191,219,254,0.8), #ffffff)",
              border: "1px solid rgba(37,99,235,0.2)",
              color: "#0f172a",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ xs: "flex-start", md: "center" }}>
              <Stack spacing={1} flex={1}>
                <Typography variant="overline" sx={{ color: "#2563eb", letterSpacing: 2 }}>
                  Quản lý sản phẩm
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  Tối ưu danh mục và tồn kho ngay tại đây
                </Typography>
                <Typography variant="body2" sx={{ color: "#0ea5e9", maxWidth: 560 }}>
                  Theo dõi tồn kho, trạng thái hiển thị và giá trị hàng hóa theo thời gian thực với bảng điều khiển mới nhất.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} width={{ xs: "100%", md: "auto" }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={fetchProducts}
                  sx={{
                    color: "#2563eb",
                    borderColor: "rgba(37,99,235,0.4)",
                    textTransform: "none",
                  }}
                >
                  Làm mới dữ liệu
                </Button>
                <Button
                  component={Link}
                  to="/seller/add"
                  variant="contained"
                  startIcon={<AddIcon />}
                  sx={{
                    background: "linear-gradient(120deg, #2563eb, #0ea5e9)",
                    minWidth: 200,
                    fontWeight: 600,
                    textTransform: "none",
                  }}
                >
                  Thêm sản phẩm mới
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(37,99,235,0.18)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
              <TextField
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên sản phẩm..."
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ color: "#38bdf8" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flex: 1,
                  input: { color: "#0f172a" },
                  fieldset: { borderColor: "rgba(37,99,235,0.4)" },
                }}
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                {[
                  { label: "Tất cả", value: "all" },
                  { label: "Đang bán", value: "active" },
                  { label: "Ngừng bán", value: "inactive" },
                ].map((option) => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    icon={<FilterAltRoundedIcon />}
                    variant={statusFilter === option.value ? "filled" : "outlined"}
                    color={statusFilter === option.value ? "primary" : "default"}
                    onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                    sx={{
                      borderColor: "rgba(37,99,235,0.3)",
                      color: statusFilter === option.value ? "#ffffff" : "#2563eb",
                      backgroundColor: statusFilter === option.value ? "#2563eb" : "transparent",
                      "& .MuiChip-icon": { color: statusFilter === option.value ? "#fff" : "#60a5fa" },
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            {[
              {
                title: "Tổng sản phẩm",
                value: products.length,
                icon: <Inventory2RoundedIcon fontSize="large" />,
                color: "#38bdf8",
              },
              {
                title: "Đang hoạt động",
                value: stats.activeCount,
                icon: <VisibilityIcon fontSize="large" />,
                color: "#34d399",
              },
              {
                title: "Tồn kho",
                value: stats.totalInventory,
                icon: <StorefrontIcon fontSize="large" />,
                color: "#fbbf24",
              },
              {
                title: "Giá trị kho",
                value: currencyFormatter.format(stats.totalValue),
                icon: <TrendingUpRoundedIcon fontSize="large" />,
                color: "#c084fc",
              },
              {
                title: "Cảnh báo tồn",
                value: stats.lowStock,
                icon: <WarningAmberRoundedIcon fontSize="large" />,
                color: "#fb7185",
              },
              {
                title: "Nhóm nổi bật",
                value: `${Math.round((stats.activeCount / Math.max(products.length, 1)) * 100)}% hoạt động`,
                icon: <LocalOfferRoundedIcon fontSize="large" />,
                color: "#f472b6",
              },
            ].map((card) => (
              <Grid item xs={12} sm={6} md={4} lg={4} key={card.title}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: "#ffffff",
                    border: "1px solid rgba(37,99,235,0.15)",
                    color: "#0f172a",
                    height: "100%",
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 54,
                        height: 54,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        background: `${card.color}20`,
                        color: card.color,
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ color: "#2563eb" }}>
                        {card.title}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {card.value}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {filteredProducts.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                borderRadius: 4,
                textAlign: "center",
                background: "rgba(255,255,255,0.95)",
                border: "1px dashed rgba(59,130,246,0.3)",
                color: "#2563eb",
              }}
            >
              <Inventory2RoundedIcon sx={{ fontSize: 72, color: "#38bdf8", mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 600, color: "#0f172a", mb: 1 }}>
                Không tìm thấy sản phẩm phù hợp
              </Typography>
              <Typography variant="body2">
                Điều chỉnh bộ lọc hoặc thêm sản phẩm mới để bắt đầu bán hàng.
              </Typography>
              <Button
                component={Link}
                to="/seller/add"
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ mt: 3, background: "linear-gradient(120deg, #2563eb, #0ea5e9)" }}
              >
                Thêm sản phẩm ngay
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredProducts.map((p) => (
                <Grid item key={p._id} xs={12} sm={6} md={4} lg={3}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: 3,
                      background: "#ffffff",
                      border: "1px solid rgba(37,99,235,0.18)",
                      boxShadow: "0 15px 35px -12px rgba(37,99,235,0.25)",
                    }}
                  >
                    <Box sx={{ position: "relative" }}>
                      <CardMedia
                        component="img"
                        image={p.images?.[0] ?? "/assets/logo.jpg"}
                        height="200"
                        alt={p.title}
                        sx={{ objectFit: "cover", filter: p.status === "active" ? "none" : "grayscale(0.3)" }}
                      />
                      <Chip
                        label={p.status === "active" ? "Đang bán" : "Ngừng bán"}
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          borderRadius: 1,
                          fontWeight: 600,
                          background: p.status === "active" ? "rgba(59,130,246,0.95)" : "rgba(239,68,68,0.9)",
                          color: "#fff",
                        }}
                      />
                      {(p.stock || 0) < 10 && (
                        <Chip
                          label={`Còn ${p.stock || 0}`}
                          size="small"
                          sx={{
                            position: "absolute",
                            bottom: 12,
                            left: 12,
                            background: "rgba(251,191,36,0.95)",
                            color: "#0f172a",
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack spacing={1.5}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: "#0f172a",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {p.title}
                        </Typography>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h5" sx={{ fontWeight: 700, color: "#2563eb" }}>
                            {currencyFormatter.format(p.price || 0)}
                          </Typography>
                          {(p as ProductWithCategory).category && (
                            <Chip
                              label={(p as ProductWithCategory).category}
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: "rgba(37,99,235,0.4)", color: "#1d4ed8" }}
                            />
                          )}
                        </Stack>
                        <Stack direction="row" spacing={2} sx={{ color: "#1d4ed8", fontSize: 13 }}>
                          <Typography>
                            Tồn: <strong>{p.stock ?? 0}</strong>
                          </Typography>
                          <Typography>
                            Lượt xem: <strong>{(p as { views?: number }).views ?? 0}</strong>
                          </Typography>
                        </Stack>
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ px: 3, pb: 3, gap: 1 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/seller/edit/${p._id}`)}
                        sx={{
                          textTransform: "none",
                          background: "linear-gradient(120deg, #2563eb, #0ea5e9)",
                        }}
                      >
                        Chỉnh sửa
                      </Button>
                      <Tooltip title="Xoá sản phẩm">
                        <IconButton
                          color="error"
                          onClick={() => handleDelete(p._id)}
                          sx={{ border: "1px solid rgba(248,113,113,0.5)" }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}