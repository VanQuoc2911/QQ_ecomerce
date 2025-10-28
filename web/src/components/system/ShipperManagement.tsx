// src/components/system/ShipperManagement.tsx
import {
  Add,
  Delete,
  Edit,
  Block,
  CheckCircle,
  LocalShipping,
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

interface Shipper {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending' | 'banned';
  phone?: string;
  address?: string;
  vehicleType?: string;
  licensePlate?: string;
  totalDeliveries: number;
  completedDeliveries: number;
  rating: number;
  createdAt: string;
  verifiedAt?: string;
}

interface ShipperManagementProps {
  shippers: Shipper[];
  onAddShipper: () => void;
  onEditShipper: (shipper: Shipper) => void;
  onDeleteShipper: (id: string) => void;
  onToggleStatus: (id: string, status: 'active' | 'inactive' | 'pending' | 'banned') => void;
  onViewDetails: (shipper: Shipper) => void;
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

export default function ShipperManagement({
  shippers,
  onAddShipper,
  onEditShipper,
  onDeleteShipper,
  onToggleStatus,
  onViewDetails,
  onVerify
}: ShipperManagementProps) {
  const handleToggleStatus = (shipper: Shipper) => {
    const newStatus = shipper.status === 'active' ? 'inactive' : 'active';
    onToggleStatus(shipper.id, newStatus);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Quản lý Shipper</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddShipper}
        >
          Thêm Shipper
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
                  <TableCell>Số điện thoại</TableCell>
                  <TableCell>Loại xe</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Tổng giao</TableCell>
                  <TableCell>Hoàn thành</TableCell>
                  <TableCell>Đánh giá</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shippers.map((shipper) => (
                  <TableRow key={shipper.id}>
                    <TableCell>{shipper.id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalShipping />
                        {shipper.name}
                      </Box>
                    </TableCell>
                    <TableCell>{shipper.email}</TableCell>
                    <TableCell>{shipper.phone || 'Chưa cập nhật'}</TableCell>
                    <TableCell>{shipper.vehicleType || 'Chưa cập nhật'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(shipper.status)}
                        color={getStatusColor(shipper.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{shipper.totalDeliveries}</TableCell>
                    <TableCell>{shipper.completedDeliveries}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2">{shipper.rating.toFixed(1)}</Typography>
                        <Typography variant="body2" color="text.secondary">⭐</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{shipper.createdAt}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => onViewDetails(shipper)}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onEditShipper(shipper)}
                        >
                          <Edit />
                        </IconButton>
                        {shipper.status === 'pending' && (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onVerify(shipper.id)}
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          color={shipper.status === 'active' ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(shipper)}
                        >
                          {shipper.status === 'active' ? <Block /> : <CheckCircle />}
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDeleteShipper(shipper.id)}
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
