import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Toolbar,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { api } from "../../api/axios";
import { productService } from "../../api/productService";
import ProductFormAdvanced from "../../components/seller/ProductFormAdvanced";
import ProductsTable from "../../components/seller/ProductsTable";
import SellerSidebar from "../../components/seller/SellerSidebar";
import SellerStatsCards from "../../components/seller/SellerStatsCards";
import { useAuth } from "../../context/AuthContext";
import type { Product as ProductType } from "../../types/Product";

interface SellerStats {
  products: number;
  orders: number;
  revenue: number;
  pendingOrders: number;
}

interface Product {
  id: number;
  title: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

interface Order {
  id: number;
  userId: number;
  total: number;
  status: string;
  date: string;
}

const drawerWidth = 280;

export default function SellerDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<SellerStats>({ products: 0, orders: 0, revenue: 0, pendingOrders: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");
  
  // Form states
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsRes, ordersRes] = await Promise.all([
          api.get<Product[]>("/products"),
          api.get<Order[]>("/orders")
        ]);
        
        const productsData = productsRes.data;
        const ordersData = ordersRes.data;
        
        // Calculate stats
        const totalRevenue = ordersData.reduce((sum: number, order: Order) => sum + (order.total || 0), 0);
        const pendingOrders = ordersData.filter((order: Order) => order.status === "pending").length;
        
        setStats({
          products: productsData.length,
          orders: ordersData.length,
          revenue: totalRevenue,
          pendingOrders: pendingOrders
        });
        
        setProducts(productsData);
      } catch (err) {
        console.error("Fetch data error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get<Product[]>("/products"),
        api.get<Order[]>("/orders")
      ]);
      
      const productsData = productsRes.data;
      const ordersData = ordersRes.data;
      
      // Calculate stats
      const totalRevenue = ordersData.reduce((sum: number, order: Order) => sum + (order.total || 0), 0);
      const pendingOrders = ordersData.filter((order: Order) => order.status === "pending").length;
      
      setStats({
        products: productsData.length,
        orders: ordersData.length,
        revenue: totalRevenue,
        pendingOrders: pendingOrders
      });
      
      setProducts(productsData);
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Product CRUD handlers
  const handleCreateProduct = async (productData: Omit<ProductType, 'id' | '_id' | 'createdAt' | 'updatedAt'>) => {
    // Thêm sellerId và status pending cho sản phẩm mới
    const productWithSeller = {
      ...productData,
      sellerId: 2, // TODO: Get from auth context
      status: 'pending' as const // Sản phẩm chờ duyệt
    };
    await productService.createProduct(productWithSeller);
    await fetchData();
  };

  const handleUpdateProduct = async (productData: Omit<ProductType, 'id' | '_id' | 'createdAt' | 'updatedAt'>) => {
    if (editingProduct) {
      await productService.updateProduct(editingProduct.id, productData);
      await fetchData();
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    await productService.deleteProduct(product.id);
    await fetchData();
  };

  const handleDeleteConfirm = async () => {
    if (deleteProduct) {
      try {
        await handleDeleteProduct(deleteProduct);
        setDeleteDialogOpen(false);
        setDeleteProduct(null);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };


  const renderDashboard = () => (
    <Box>
      <SellerStatsCards stats={stats} loading={loading} />
      <ProductsTable
        products={products}
        onAddProduct={() => {
          setEditingProduct(null);
          setProductFormOpen(true);
        }}
        onEditProduct={(product) => {
          setEditingProduct(product);
          setProductFormOpen(true);
        }}
        onDeleteProduct={(product) => {
          setDeleteProduct(product);
          setDeleteDialogOpen(true);
        }}
        showRecentOnly={true}
      />
    </Box>
  );

  const renderProducts = () => (
    <ProductsTable
      products={products}
      onAddProduct={() => {
        setEditingProduct(null);
        setProductFormOpen(true);
      }}
      onEditProduct={(product) => {
        setEditingProduct(product);
        setProductFormOpen(true);
      }}
      onDeleteProduct={(product) => {
        setDeleteProduct(product);
        setDeleteDialogOpen(true);
      }}
      showRecentOnly={false}
    />
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <SellerSidebar
        selectedMenu={selectedMenu}
        onMenuSelect={setSelectedMenu}
        drawerWidth={drawerWidth}
      />

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top App Bar */}
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'text.primary' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Chào mừng, {user?.displayName || user?.email || "Seller"}
            </Typography>
            <Button onClick={handleLogout} color="inherit">
              Đăng xuất
            </Button>
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f5f5' }}>
          {selectedMenu === "dashboard" && renderDashboard()}
          {selectedMenu === "products" && renderProducts()}
          {selectedMenu === "orders" && (
            <Typography variant="h4">Quản lý đơn hàng</Typography>
          )}
          {selectedMenu === "analytics" && (
            <Typography variant="h4">Phân tích bán hàng</Typography>
          )}
        </Box>
      </Box>

      {/* Forms and Dialogs */}
      <ProductFormAdvanced
        open={productFormOpen}
        onClose={() => {
          setProductFormOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        product={editingProduct as ProductType}
        title={editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa sản phẩm "{deleteProduct?.title}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
