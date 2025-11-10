import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { productService, type ApiProduct } from "../../api/productService";

export default function SellerProducts() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.getProducts({ limit: 50 });
      setProducts(res.items);
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

  if (loading)
    return (
      <Typography textAlign="center" mt={5} fontSize={18}>
        Đang tải sản phẩm...
      </Typography>
    );

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">🛍 Sản phẩm của bạn</Typography>
        <Button component={Link} to="/seller/add" variant="contained" color="primary">
          + Thêm sản phẩm
        </Button>
      </Box>

      <Grid container spacing={2}>
        {products.map((p) => (
          <Grid item key={p._id} xs={12} sm={6} md={4}>
            <Card sx={{ borderRadius: 2 }}>
              <CardMedia
                component="img"
                height="160"
                image={p.images?.[0] ?? "web/src/assets/logo.jpg"}
                alt={p.title}
              />
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">
                  {p.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {p.price.toLocaleString()}₫
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => navigate(`/seller/edit/${p._id}`)}
                >
                  Chỉnh sửa
                </Button>
                <Button size="small" color="error" onClick={() => handleDelete(p._id)}>
                  Xoá
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
