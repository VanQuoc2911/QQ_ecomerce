// src/components/system/SellerManagement.tsx
import {
  Add,
  Delete,
  Edit,
  Block,
  CheckCircle,
  Store,
  Visibility
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";

interface Seller {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending' | 'banned';
  businessName?: string;
  businessLicense?: string;
  phone?: string;
  address?: string;
  totalProducts: number;
  totalSales: number;
  rating: number;
  createdAt: string;
  verifiedAt?: string;
}

interface SellerManagementProps {
  sellers: Seller[];
  onAddSeller: () => void;
  onEditSeller: (seller: Seller) => void;
  onDeleteSeller: (id: string) => void;
  onToggleStatus: (id: string, status: 'active' | 'inactive' | 'pending' | 'banned') => void;
  onViewDetails: (seller: Seller) => void;
  onVerify: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'inactive': return 'warning';
    case 'pending': return 'info';
    case 'banned': return 'error';
    default: return 'default';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return 'Hoạt động';
    case 'inactive': return 'Không hoạt động';
    case 'pending': return 'Chờ duyệt';
    case 'banned': return 'Bị cấm';
    default: return status;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

export default function SellerManagement({
  sellers,
  onAddSeller,
  onEditSeller,
  onDeleteSeller,
  onToggleStatus,
  onViewDetails,
  onVerify
}: SellerManagementProps) {
  const handleToggleStatus = (seller: Seller) => {
    const newStatus = seller.status === 'active' ? 'inactive' : 'active';
    onToggleStatus(seller.id, newStatus);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Quản lý Seller</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddSeller}
        >
          Thêm Seller
        </Button>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Tên</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Tên doanh nghiệp</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>Doanh thu</TableCell>
                  <TableCell>Đánh giá</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell>{seller.id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Store />
                        {seller.name}
                      </Box>
                    </TableCell>
                    <TableCell>{seller.email}</TableCell>
                    <TableCell>{seller.businessName || 'Chưa cập nhật'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(seller.status)}
                        color={getStatusColor(seller.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{seller.totalProducts}</TableCell>
                    <TableCell>{formatCurrency(seller.totalSales)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2">{seller.rating.toFixed(1)}</Typography>
                        <Typography variant="body2" color="text.secondary">⭐</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{seller.createdAt}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => onViewDetails(seller)}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onEditSeller(seller)}
                        >
                          <Edit />
                        </IconButton>
                        {seller.status === 'pending' && (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onVerify(seller.id)}
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          color={seller.status === 'active' ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(seller)}
                        >
                          {seller.status === 'active' ? <Block /> : <CheckCircle />}
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDeleteSeller(seller.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
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
