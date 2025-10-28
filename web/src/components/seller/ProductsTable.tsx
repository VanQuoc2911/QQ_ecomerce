import {
    Add,
    Delete,
    Edit,
    Store
} from "@mui/icons-material";
import {
    Box,
    Button,
    Card,
    CardContent,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";

interface Product {
  id: number;
  title: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

interface ProductsTableProps {
  products: Product[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  showRecentOnly?: boolean;
}

export default function ProductsTable({ 
  products, 
  onAddProduct, 
  onEditProduct, 
  onDeleteProduct,
  showRecentOnly = false 
}: ProductsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const displayProducts = showRecentOnly ? products.slice(0, 5) : products;

  return (
    <Box>
      {!showRecentOnly && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Quản lý sản phẩm</Typography>
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={onAddProduct}
          >
            Thêm sản phẩm
          </Button>
        </Box>
      )}
      
      <Card>
        <CardContent>
          {showRecentOnly && (
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Store />
              Sản phẩm của tôi
            </Typography>
          )}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {!showRecentOnly && <TableCell>ID</TableCell>}
                  <TableCell>Tên sản phẩm</TableCell>
                  <TableCell>Giá</TableCell>
                  <TableCell>Tồn kho</TableCell>
                  {!showRecentOnly && <TableCell>Mô tả</TableCell>}
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayProducts.map((product) => (
                  <TableRow key={product.id}>
                    {!showRecentOnly && <TableCell>{product.id}</TableCell>}
                    <TableCell>{product.title}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    {!showRecentOnly && <TableCell>{product.description}</TableCell>}
                    <TableCell>
                      <IconButton 
                        size="small"
                        onClick={() => onEditProduct(product)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        size="small"
                        onClick={() => onDeleteProduct(product)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
