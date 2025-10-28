// src/components/system/UserManagement.tsx
import {
  Add,
  Delete,
  Edit,
  Block,
  CheckCircle,
  Person
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
import { useState } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'seller' | 'shipper' | 'admin' | 'system';
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  lastLogin?: string;
}

interface UserManagementProps {
  users: User[];
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onToggleStatus: (id: string, status: 'active' | 'inactive' | 'banned') => void;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin': return 'error';
    case 'system': return 'error';
    case 'seller': return 'warning';
    case 'shipper': return 'info';
    case 'user': return 'default';
    default: return 'default';
  }
};

const getRoleText = (role: string) => {
  switch (role) {
    case 'admin': return 'Admin';
    case 'system': return 'System';
    case 'seller': return 'Seller';
    case 'shipper': return 'Shipper';
    case 'user': return 'User';
    default: return role;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'inactive': return 'warning';
    case 'banned': return 'error';
    default: return 'default';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return 'Hoạt động';
    case 'inactive': return 'Không hoạt động';
    case 'banned': return 'Bị cấm';
    default: return status;
  }
};

export default function UserManagement({
  users,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onToggleStatus
}: UserManagementProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    onToggleStatus(user.id, newStatus);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Quản lý người dùng</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddUser}
        >
          Thêm người dùng
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
                  <TableCell>Vai trò</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                  <TableCell>Lần đăng nhập cuối</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person />
                        {user.name}
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleText(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(user.status)}
                        color={getStatusColor(user.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell>{user.lastLogin || 'Chưa đăng nhập'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => onEditUser(user)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          color={user.status === 'active' ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 'active' ? <Block /> : <CheckCircle />}
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDeleteUser(user.id)}
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
