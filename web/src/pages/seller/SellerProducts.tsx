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
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/GridLegacy";
import Slide from "@mui/material/Slide";
import Snackbar from "@mui/material/Snackbar";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { productService, type ApiProduct } from "../../api/productService";

type ProductWithCategory = ApiProduct & { category?: string };

const resolveSellingState = (product: ApiProduct): "active" | "inactive" => {
  const isApproved = product.status === "approved";
  const hasStock = (product.stock ?? 0) > 0;
  const isListed = product.isListed !== false;
  return isApproved && hasStock && isListed ? "active" : "inactive";
};

export default function SellerProducts() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [listingMutation, setListingMutation] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    product: ApiProduct | null;
    nextState: boolean;
    message: string;
  }>({ open: false, product: null, nextState: false, message: "" });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "info" | "warning" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  // Listen for live product view updates from socket (dispatched via SocketContext)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ productId: string; views: number }>).detail;
      if (!detail) return;
      setProducts((prev) => prev.map((p) => (p._id === detail.productId ? { ...p, views: detail.views } : p)));
    };
    window.addEventListener("productViewed", handler as EventListener);
    return () => window.removeEventListener("productViewed", handler as EventListener);
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

  const handleToggleListing = (product: ApiProduct) => {
    const nextState = !(product.isListed ?? true);
    setConfirmDialog({
      open: true,
      product,
      nextState,
      message: nextState
        ? "Bạn có chắc muốn <b style='color:#22c55e'>MỞ BÁN</b> lại sản phẩm này không?"
        : "Bạn có chắc muốn <b style='color:#ef4444'>NGƯNG BÁN</b> sản phẩm này không?",
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmDialog.product) return;
    setListingMutation(confirmDialog.product._id);
    setConfirmDialog((d) => ({ ...d, open: false }));
    try {
      await productService.updateListingStatus(confirmDialog.product._id, confirmDialog.nextState);
      setProducts((prev) =>
        prev.map((item) =>
          item._id === confirmDialog.product!._id
            ? { ...item, isListed: confirmDialog.nextState }
            : item
        )
      );
      setSnackbar({ open: true, message: confirmDialog.nextState ? "✅ Đã mở bán sản phẩm" : "⚠️ Đã ngưng bán sản phẩm", severity: "success" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Không thể thay đổi trạng thái bán. Vui lòng thử lại.", severity: "error" });
    } finally {
      setListingMutation(null);
    }
  };

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }),
    []
  );

  const stats = useMemo(() => {
    const totalInventory = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
    const activeCount = products.filter((p) => resolveSellingState(p) === "active").length;
    const lowStock = products.filter((p) => (p.stock || 0) < 10).length;
    return { totalInventory, totalValue, activeCount, lowStock };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const sellingState = resolveSellingState(p);
      const matchStatus = statusFilter === "all" || statusFilter === sellingState;
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
      {/* Snackbar for feedback messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
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
                  { label: "Ngưng bán", value: "inactive" },
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

          <Grid container spacing={2} sx={{ mb: 6 }}>
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
              {filteredProducts.map((p) => {
                const sellingState = resolveSellingState(p);
                const isActive = sellingState === "active";
                const views = (p as { views?: number }).views ?? 0;
                return (
                  <Grid item key={p._id} xs={12} sm={6} md={4} lg={3}>
                    <Card
                      sx={{
                        position: "relative",
                        overflow: "hidden",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 4,
                        background: "linear-gradient(150deg, #ffffff 0%, #e0f2ff 100%)",
                        border: "1px solid rgba(37,99,235,0.18)",
                        boxShadow: "0 30px 60px -40px rgba(15,23,42,0.9)",
                        transition: "transform 0.3s ease, box-shadow 0.3s ease",
                        "&::before": {
                          content: "''",
                          position: "absolute",
                          inset: 0,
                          background: "radial-gradient(circle at 80% 0%, rgba(56,189,248,0.18), transparent 60%)",
                          pointerEvents: "none",
                        },
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: "0 35px 60px -32px rgba(15,23,42,0.95)",
                        },
                      }}
                    >
                      <Box sx={{ position: "relative", zIndex: 1 }}>
                        <CardMedia
                          component="img"
                          image={p.images?.[0] ?? "/assets/logo.jpg"}
                          height="220"
                          alt={p.title}
                          sx={{
                            objectFit: "cover",
                            filter: isActive ? "none" : "grayscale(0.4)",
                            transition: "transform 0.4s ease",
                          }}
                        />
                        <Chip
                          label={isActive ? "Đang bán" : "Ngưng bán"}
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            borderRadius: 1,
                            fontWeight: 700,
                            background: isActive ? "rgba(37,99,235,0.95)" : "rgba(239,68,68,0.95)",
                            color: "#fff",
                            textTransform: "uppercase",
                          }}
                        />
                        {(p.stock || 0) < 10 && (
                          <Chip
                            label={`Còn ${p.stock || 0}`}
                            size="small"
                            color="warning"
                            sx={{
                              position: "absolute",
                              bottom: 16,
                              left: 16,
                              fontWeight: 700,
                              borderRadius: 1,
                              bgcolor: "rgba(251,191,36,0.95)",
                              color: "#0f172a",
                            }}
                          />
                        )}
                      </Box>
                      <CardContent sx={{ flexGrow: 1, position: "relative", zIndex: 1 }}>
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: "#0f172a",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {p.title}
                            </Typography>
                            {(p as ProductWithCategory).category && (
                              <Chip
                                label={(p as ProductWithCategory).category}
                                size="small"
                                sx={{
                                  borderRadius: 2,
                                  background: "rgba(37,99,235,0.08)",
                                  border: "1px solid rgba(37,99,235,0.16)",
                                  color: "#1d4ed8",
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Stack>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1d4ed8" }}>
                            {currencyFormatter.format(p.price || 0)}
                          </Typography>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                              gap: 2,
                              p: 2,
                              borderRadius: 2,
                              background: "rgba(15,23,42,0.03)",
                              border: "1px solid rgba(15,23,42,0.05)",
                            }}
                          >
                            {[{
                              label: "Tồn kho",
                              value: p.stock ?? 0,
                              icon: <Inventory2RoundedIcon fontSize="small" sx={{ color: "#2563eb" }} />,
                            },
                            {
                              label: "Lượt xem",
                              value: views,
                              icon: <VisibilityIcon fontSize="small" sx={{ color: "#0ea5e9" }} />,
                            }].map((metric) => (
                              <Stack key={metric.label} direction="row" spacing={2} alignItems="center">
                                {metric.icon}
                                <Box>
                                  <Typography variant="caption" sx={{ color: "#64748b" }}>
                                    {metric.label}
                                  </Typography>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                    {metric.value}
                                  </Typography>
                                </Box>
                              </Stack>
                            ))}
                          </Box>
                        </Stack>
                      </CardContent>
                      <CardActions
                        sx={{
                          px: 3,
                          pb: 3,
                          pt: 0,
                          flexDirection: "column",
                          gap: 1,
                          alignItems: "stretch",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        <Stack direction="row" spacing={1.5} width="100%">
                          <Button
                            variant="outlined"
                            onClick={() => handleToggleListing(p)}
                            disabled={listingMutation === p._id}
                            sx={{
                              textTransform: "none",
                              flex: 1,
                              borderRadius: 2,
                              borderColor: isActive ? "rgba(248,113,113,0.6)" : "rgba(34,197,94,0.6)",
                              color: isActive ? "#b91c1c" : "#0f766e",
                              fontWeight: 600,
                            }}
                          >
                            {listingMutation === p._id
                              ? "Đang cập nhật..."
                              : isActive
                              ? "Ngưng bán"
                              : "Mở bán"}
                          </Button>
                                {/* Confirmation Dialog for Toggle Listing */}
                                <Dialog
                                  open={confirmDialog.open}
                                  onClose={() => setConfirmDialog((d) => ({ ...d, open: false }))}
                                  aria-labelledby="toggle-listing-dialog-title"
                                  aria-describedby="toggle-listing-dialog-description"
                                  TransitionComponent={Slide}
                                  transitionDuration={260}
                                  PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
                                  hideBackdrop
                                >
                                  <DialogTitle id="toggle-listing-dialog-title" sx={{ bgcolor: '#f8fafc', p: 2.5, fontWeight: 800, color: '#0f172a' }}>
                                    Xác nhận thay đổi trạng thái
                                  </DialogTitle>
                                  <DialogContent sx={{ p: 0 }}>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 3, bgcolor: 'white' }}>
                                      <Avatar
                                        variant="rounded"
                                        src={confirmDialog.product?.images?.[0] ?? '/assets/logo.jpg'}
                                        sx={{ width: 84, height: 84, borderRadius: 1.5, boxShadow: '0 10px 30px rgba(2,6,23,0.06)' }}
                                      />
                                      <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
                                          {confirmDialog.product?.title ?? 'Sản phẩm'}
                                        </Typography>
                                        <Typography sx={{ color: '#64748b', mt: 0.5 }}>
                                          {currencyFormatter.format(confirmDialog.product?.price ?? 0)}
                                        </Typography>
                                        <Typography sx={{ mt: 1, color: '#334155' }}>
                                          {confirmDialog.nextState ? 'Bạn sẽ MỞ BÁN lại sản phẩm này.' : 'Bạn sẽ NGƯNG BÁN sản phẩm này.'}
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <Divider />
                                    <Box sx={{ p: 3, bgcolor: '#fbfdff' }}>
                                      <Typography sx={{ color: '#334155' }}>Hành động này sẽ thay đổi trạng thái hiển thị trên cửa hàng. Bạn có chắc muốn tiếp tục?</Typography>
                                    </Box>
                                  </DialogContent>
                                  <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
                                    <Button
                                      onClick={() => setConfirmDialog((d) => ({ ...d, open: false }))}
                                      color="inherit"
                                      variant="outlined"
                                      sx={{ textTransform: 'none', borderRadius: 2 }}
                                    >
                                      Huỷ
                                    </Button>
                                    <Button
                                      onClick={handleConfirmToggle}
                                      variant="contained"
                                      sx={{
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        minWidth: 140,
                                        fontWeight: 800,
                                        background: confirmDialog.nextState
                                          ? 'linear-gradient(120deg,#16a34a,#60a5fa)'
                                          : 'linear-gradient(120deg,#ef4444,#f97316)',
                                        boxShadow: '0 10px 30px -12px rgba(15,23,42,0.45)'
                                      }}
                                    >
                                      Xác nhận
                                    </Button>
                                  </DialogActions>
                                </Dialog>
                          {!isActive && (
                            <Button
                              variant="contained"
                              startIcon={<EditIcon />}
                              onClick={() => navigate(`/seller/edit/${p._id}`)}
                              sx={{
                                flex: 1,
                                width: "100%",
                                textTransform: "none",
                                borderRadius: 2,
                                fontWeight: 600,
                                background: "linear-gradient(120deg, #2563eb, #0ea5e9)",
                                boxShadow: "0 15px 30px -20px rgba(37,99,235,0.8)",
                              }}
                            >
                              Chỉnh sửa
                            </Button>
                          )}
                          <Tooltip title="Xoá sản phẩm">
                            <IconButton
                              onClick={() => handleDelete(p._id)}
                              sx={{
                                borderRadius: 2,
                                border: "1px solid rgba(248,113,113,0.4)",
                                color: "#dc2626",
                                background: "rgba(254,226,226,0.6)",
                                height: 48,
                                width: 48,
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}