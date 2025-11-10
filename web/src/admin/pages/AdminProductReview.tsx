/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

interface Product {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  status: string;
  reviewNote?: string;
  images?: string[];
  sellerId?: string;
  shopId?: string;
}

interface ShopInfo {
  _id: string;
  shopName: string;
  logo?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
}

export default function AdminProductReview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openReject, setOpenReject] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<{ open: boolean; message: string; type: "success" | "error" }>({
    open: false,
    message: "",
    type: "success",
  });
  const [detailDialog, setDetailDialog] = useState(false);
  const [shopDetail, setShopDetail] = useState<ShopInfo | null>(null);

  const navigate = useNavigate();

  // 🔄 Lấy danh sách sản phẩm pending
  const fetchPending = async () => {
    try {
      const res = await api.get<Product[]>("/api/products/pending", { withCredentials: true });
      setProducts(res.data);
    } catch (err) {
      console.error("Fetch pending products failed", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // ✅ Duyệt sản phẩm
  const handleApprove = async (id: string) => {
    try {
      await api.post(`/api/products/${id}/review`, { action: "approve" }, { withCredentials: true });
      setToast({ open: true, message: "✅ Sản phẩm đã được duyệt!", type: "success" });
      fetchPending();
    } catch (err) {
      setToast({ open: true, message: "❌ Duyệt thất bại", type: "error" });
    }
  };

  // ❌ Từ chối sản phẩm
  const handleReject = async () => {
    if (!selectedProduct) return;
    try {
      await api.post(
        `/api/products/${selectedProduct._id}/review`,
        { action: "reject", reviewNote: note },
        { withCredentials: true }
      );
      setOpenReject(false);
      setNote("");
      setSelectedProduct(null);
      setToast({ open: true, message: "🚫 Đã từ chối sản phẩm", type: "success" });
      fetchPending();
    } catch (err) {
      setToast({ open: true, message: "❌ Từ chối thất bại", type: "error" });
    }
  };

  // 🔎 Xem chi tiết sản phẩm + shop
  const handleViewDetail = async (product: Product) => {
    try {
      setSelectedProduct(product);
      // Lấy shop info
      if (product.shopId) {
        const res = await api.get<ShopInfo>(`/api/shops/${product.shopId}`);
        setShopDetail(res.data); // ✅ đúng
      }
      setDetailDialog(true);
    } catch (err) {
      console.error("Fetch shop detail failed", err);
      setToast({ open: true, message: "❌ Không thể lấy thông tin shop", type: "error" });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>
        🕓 Danh sách sản phẩm chờ duyệt
      </Typography>

      <Button variant="outlined" sx={{ mb: 2 }} onClick={() => navigate("/admin/dashboard")}>
        🔙 Trở về Dashboard
      </Button>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
          <CircularProgress />
        </Box>
      ) : products.length === 0 ? (
        <Typography textAlign="center" color="text.secondary">
          Không có sản phẩm pending nào.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {products.map((p) => (
            <Grid item xs={12} md={6} lg={4} key={p._id}>
              <Card
                sx={{
                  borderRadius: 3,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                  transition: "all 0.25s ease",
                  "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  },
                }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>
                    {p.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
                    {p.description || "Không có mô tả"}
                  </Typography>
                  {p.price && (
                    <Typography variant="subtitle1" color="primary" fontWeight={700}>
                      {p.price.toLocaleString()}₫
                    </Typography>
                  )}
                  <Typography variant="body2" color="orange" mt={1}>
                    Trạng thái: {p.status.toUpperCase()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: "space-between", pb: 2, px: 2 }}>
                  <Box>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleApprove(p._id)}
                      sx={{ textTransform: "none", fontWeight: 600, mr: 1 }}
                    >
                      Duyệt
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      sx={{ textTransform: "none", fontWeight: 600 }}
                      onClick={() => {
                        setSelectedProduct(p);
                        setOpenReject(true);
                      }}
                    >
                      Từ chối
                    </Button>
                  </Box>
                  <Button
                    variant="text"
                    onClick={() => handleViewDetail(p)}
                    sx={{ textTransform: "none" }}
                  >
                    Xem chi tiết
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog từ chối */}
      <Dialog open={openReject} onClose={() => setOpenReject(false)}>
        <DialogTitle>📝 Ghi chú khi từ chối sản phẩm</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Lý do từ chối"
            multiline
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReject(false)}>Hủy</Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Xác nhận từ chối
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog chi tiết sản phẩm + shop + hình ảnh */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🛒 Chi tiết sản phẩm</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box>
              <Typography variant="h6">{selectedProduct.title}</Typography>
              <Typography>{selectedProduct.description}</Typography>
              {selectedProduct.price && (
                <Typography fontWeight={600} color="primary">
                  {selectedProduct.price.toLocaleString()}₫
                </Typography>
              )}
              <Typography mt={1} color="orange">
                Trạng thái: {selectedProduct.status.toUpperCase()}
              </Typography>

              {/* Hiển thị hình ảnh */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <Box mt={2}>
                  <Typography fontWeight={700} mb={1}>Hình ảnh sản phẩm</Typography>
                  <Grid container spacing={1}>
                    {selectedProduct.images.map((img, index) => (
                      <Grid item xs={4} key={index}>
                        <Box
                          component="img"
                          src={img}
                          alt={`Hình ${index + 1}`}
                          sx={{
                            width: "100%",
                            height: 100,
                            objectFit: "cover",
                            borderRadius: 1,
                            border: "1px solid #ccc",
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {shopDetail && (
                <Box mt={2} p={1} sx={{ border: "1px solid #ccc", borderRadius: 2 }}>
                  <Typography fontWeight={700}>Thông tin Shop</Typography>
                  <Typography>Tên shop: {shopDetail.shopName}</Typography>
                  <Typography>Địa chỉ: {shopDetail.address}</Typography>
                  <Typography>Điện thoại: {shopDetail.phone}</Typography>
                  {shopDetail.website && <Typography>Website: {shopDetail.website}</Typography>}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Thông báo toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.type} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
