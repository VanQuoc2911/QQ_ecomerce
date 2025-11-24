import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InventoryIcon from '@mui/icons-material/Inventory';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { productService, type ApiProduct } from "../../api/productService";

type ProductWithCategory = ApiProduct & { category?: string };

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
      const products = await productService.getMyProducts();
      setProducts(products);
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

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={60} sx={{ color: "#1976d2", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Đang tải sản phẩm...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="xl">
        {/* Header Section */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 3,
            background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
            color: "white",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <StorefrontIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  Quản Lý Sản Phẩm
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Tổng số: {products.length} sản phẩm
                </Typography>
              </Box>
            </Box>
            <Button
              component={Link}
              to="/seller/add"
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              sx={{
                background: "white",
                color: "#1976d2",
                fontWeight: 700,
                px: 3,
                py: 1.5,
                "&:hover": {
                  background: "#f5f5f5",
                  transform: "translateY(-2px)",
                  boxShadow: 4,
                },
                transition: "all 0.3s",
              }}
            >
              Thêm Sản Phẩm Mới
            </Button>
          </Box>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                transition: "all 0.3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <InventoryIcon sx={{ fontSize: 40, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {products.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Tổng sản phẩm
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
                transition: "all 0.3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <VisibilityIcon sx={{ fontSize: 40, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {products.filter(p => p.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Đang hoạt động
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "white",
                transition: "all 0.3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <StorefrontIcon sx={{ fontSize: 40, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {products.reduce((sum, p) => sum + (p.stock || 0), 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Tồn kho
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              elevation={2}
              sx={{
                p: 2.5,
                borderRadius: 3,
                background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                color: "white",
                transition: "all 0.3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ fontSize: 40 }}>💰</Box>
                <Box>
                  <Typography variant="h4" fontWeight={700}>
                    {(products.reduce((sum, p) => sum + p.price, 0) / 1000).toFixed(0)}K
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Tổng giá trị
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Products Grid */}
        {products.length === 0 ? (
          <Paper
            elevation={2}
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: 3,
              background: "white",
            }}
          >
            <InventoryIcon sx={{ fontSize: 80, color: "#bdbdbd", mb: 2 }} />
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Chưa có sản phẩm nào
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Hãy thêm sản phẩm đầu tiên của bạn để bắt đầu bán hàng
            </Typography>
            <Button
              component={Link}
              to="/seller/add"
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              sx={{
                background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
                px: 4,
                py: 1.5,
              }}
            >
              Thêm Sản Phẩm Ngay
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {products.map((p) => (
              <Grid item key={p._id} xs={12} sm={6} md={4} lg={3}>
                <Card
                  elevation={3}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 3,
                    overflow: "hidden",
                    transition: "all 0.3s",
                    border: "2px solid transparent",
                    "&:hover": {
                      transform: "translateY(-8px)",
                      boxShadow: 8,
                      borderColor: "#1976d2",
                    },
                  }}
                >
                  <Box sx={{ position: "relative", overflow: "hidden" }}>
                    <CardMedia
                      component="img"
                      height="200"
                      image={p.images?.[0] ?? "/assets/logo.jpg"}
                      alt={p.title}
                      sx={{
                        transition: "transform 0.3s",
                        "&:hover": {
                          transform: "scale(1.1)",
                        },
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        display: "flex",
                        gap: 0.5,
                      }}
                    >
                      {p.status === 'active' ? (
                        <Chip
                          label="Đang bán"
                          size="small"
                          sx={{
                            background: "linear-gradient(135deg, #4caf50 0%, #81c784 100%)",
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      ) : (
                        <Chip
                          label="Ngừng bán"
                          size="small"
                          sx={{
                            background: "linear-gradient(135deg, #f44336 0%, #e57373 100%)",
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                    {(p.stock || 0) < 10 && (
                      <Chip
                        label={`Còn ${p.stock || 0}`}
                        size="small"
                        sx={{
                          position: "absolute",
                          top: 10,
                          left: 10,
                          background: "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)",
                          color: "white",
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>

                  <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      sx={{
                        mb: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        minHeight: "3.6em",
                      }}
                    >
                      {p.title}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1.5,
                      }}
                    >
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{
                          background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {p.price.toLocaleString()}₫
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {((p as ProductWithCategory).category) && (
                          <Chip
                            label={(p as ProductWithCategory).category}
                            size="small"
                            variant="outlined"
                            sx={{ borderColor: "#1976d2", color: "#1976d2" }}
                          />
                        )}
                      </Stack>
                    </Box>
                  </CardContent>

                  <CardActions
                    sx={{
                      p: 2,
                      pt: 0,
                      display: "flex",
                      gap: 1,
                    }}
                  >
                    <Tooltip title="Chỉnh sửa">
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/seller/edit/${p._id}`)}
                        sx={{
                          background: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
                          "&:hover": {
                            background: "linear-gradient(135deg, #1565c0 0%, #2196f3 100%)",
                          },
                        }}
                      >
                        Sửa
                      </Button>
                    </Tooltip>
                    <Tooltip title="Xoá sản phẩm">
                      <IconButton
                        color="error"
                        onClick={() => handleDelete(p._id)}
                        sx={{
                          border: "2px solid",
                          borderColor: "#f44336",
                          "&:hover": {
                            background: "#f44336",
                            color: "white",
                          },
                        }}
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
      </Container>
    </Box>
  );
}