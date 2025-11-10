import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import InventoryIcon from "@mui/icons-material/Inventory";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { Box, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import { productService } from "../../api/productService";
import { sellerService, type SellerStats } from "../../api/sellerService";
import SellerStatCard from "../../components/seller/SellerStatsCards";

// ✅ Định nghĩa kiểu dữ liệu sản phẩm (summary dùng trong top list)
export interface ProductSummary {
  _id: string;
  title: string;
  price: number;
  images: string[];
  soldCount?: number;
  createdAt?: string;
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [topProducts, setTopProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    // Lấy dữ liệu thống kê tổng quan của seller
    sellerService
      .getStats()
      .then(setStats)
      .catch((err) => console.error("❌ getStats error:", err));

    // Lấy danh sách sản phẩm để hiển thị top bán chạy
    productService
      .getProducts({ limit: 10 })
      .then((res) => {
        const items: ProductSummary[] = Array.isArray(res.items)
          ? res.items.map((item) => ({
              _id: item._id,
              title: item.title,
              price: item.price,
              images: item.images || [],
              soldCount: item.soldCount ?? 0,
              createdAt: item.createdAt,
            }))
          : [];

        // Sắp xếp theo soldCount (nếu có)
        const sorted = [...items].sort(
          (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)
        );

        setTopProducts(sorted.slice(0, 5));
      })
      .catch((err) => console.error("❌ getProducts error:", err));
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        📊 Tổng quan cửa hàng
      </Typography>

      {/* --- Thống kê 3 ô: sản phẩm / đơn / doanh thu --- */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <SellerStatCard
            title="Số sản phẩm"
            value={stats?.totalProducts ?? 0}
            icon={<InventoryIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <SellerStatCard
            title="Số đơn hàng"
            value={stats?.totalSales ?? 0}
            icon={<ShoppingCartIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <SellerStatCard
            title="Doanh thu"
            value={
              stats
                ? `${Number(stats.totalRevenue).toLocaleString()} ₫`
                : "0 ₫"
            }
            icon={<AttachMoneyIcon />}
          />
        </Grid>
      </Grid>

      {/* --- Top sản phẩm --- */}
      <Box>
        <Typography variant="h6" mb={1}>
          🔥 Sản phẩm bán chạy
        </Typography>
        <Grid container spacing={2}>
          {topProducts.length === 0 ? (
            <Typography color="text.secondary" ml={1}>
              Chưa có dữ liệu.
            </Typography>
          ) : (
            topProducts.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p._id}>
                <Box
                  display="flex"
                  gap={2}
                  alignItems="center"
                  p={2}
                  borderRadius={2}
                  boxShadow={1}
                  sx={{ transition: "all 0.2s", "&:hover": { boxShadow: 3 } }}
                >
                  <img
                    src={p.images?.[0] ?? "https://via.placeholder.com/120"}
                    alt={p.title}
                    style={{
                      width: 100,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 6,
                    }}
                  />
                  <Box>
                    <Typography fontWeight={700}>{p.title}</Typography>
                    <Typography color="text.secondary" fontSize={13}>
                      Đã bán: {p.soldCount ?? 0}
                    </Typography>
                    <Typography color="text.secondary" fontSize={13}>
                      Giá: {Number(p.price).toLocaleString()}₫
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))
          )}
        </Grid>
      </Box>
    </Box>
  );
}
