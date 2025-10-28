// src/pages/system/SystemDashboard.tsx
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types";

// Import system components
import {
    RequestApproval,
    SellerManagement,
    ShipperManagement,
    SystemHeader,
    SystemSidebar,
    SystemStats,
    UserManagement
} from "../../components/system";

interface SystemStatsData {
  totalUsers: number;
  totalSellers: number;
  totalShippers: number;
  pendingRequests: number;
  totalRevenue: number;
  completedOrders: number;
}

interface Request {
  id: string;
  type: 'seller_registration' | 'shipper_registration' | 'product_approval';
  requesterName: string;
  requesterEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  details: any;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'seller' | 'shipper' | 'admin' | 'system';
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  lastLogin?: string;
}

interface SellerData {
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

interface ShipperData {
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

export default function SystemDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<SystemStatsData>({ 
    totalUsers: 0, 
    totalSellers: 0, 
    totalShippers: 0, 
    pendingRequests: 0, 
    totalRevenue: 0, 
    completedOrders: 0 
  });
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");
  
  // Mock data for demonstration
  const [requests, setRequests] = useState<Request[]>([
    {
      id: '1',
      type: 'seller_registration',
      requesterName: 'Nguyễn Văn A',
      requesterEmail: 'nguyenvana@email.com',
      status: 'pending',
      submittedAt: '2024-01-15',
      details: { businessName: 'Cửa hàng ABC', businessLicense: '123456' }
    },
    {
      id: '2',
      type: 'shipper_registration',
      requesterName: 'Trần Thị B',
      requesterEmail: 'tranthib@email.com',
      status: 'pending',
      submittedAt: '2024-01-16',
      details: { vehicleType: 'Xe máy', licensePlate: '29A-12345' }
    }
  ]);
  
  const [users, setUsers] = useState<UserData[]>([
    {
      id: '1',
      name: 'Nguyễn Văn C',
      email: 'nguyenvanc@email.com',
      role: 'user',
      status: 'active',
      createdAt: '2024-01-10',
      lastLogin: '2024-01-20'
    }
  ]);
  
  const [sellers, setSellers] = useState<SellerData[]>([
    {
      id: '1',
      name: 'Nguyễn Văn D',
      email: 'nguyenvand@email.com',
      status: 'active',
      businessName: 'Cửa hàng XYZ',
      totalProducts: 25,
      totalSales: 50000000,
      rating: 4.5,
      createdAt: '2024-01-05'
    }
  ]);
  
  const [shippers, setShippers] = useState<ShipperData[]>([
    {
      id: '1',
      name: 'Trần Văn E',
      email: 'tranvane@email.com',
      status: 'active',
      phone: '0123456789',
      vehicleType: 'Xe máy',
      totalDeliveries: 100,
      completedDeliveries: 95,
      rating: 4.8,
      createdAt: '2024-01-08'
    }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Mock data calculation
        setStats({
          totalUsers: users.length,
          totalSellers: sellers.length,
          totalShippers: shippers.length,
          pendingRequests: requests.filter(r => r.status === 'pending').length,
          totalRevenue: sellers.reduce((sum, seller) => sum + seller.totalSales, 0),
          completedOrders: shippers.reduce((sum, shipper) => sum + shipper.completedDeliveries, 0)
        });
      } catch (err) {
        console.error("Fetch data error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [users, sellers, shippers, requests]);

  const handleLogout = async () => {
    await logout();
  };

  // Request handlers
  const handleApproveRequest = (id: string, notes?: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'approved' as const } : req
    ));
    console.log('Approved request:', id, notes);
  };

  const handleRejectRequest = (id: string, reason: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'rejected' as const } : req
    ));
    console.log('Rejected request:', id, reason);
  };

  const handleViewRequestDetails = (request: Request) => {
    console.log('View request details:', request);
  };

  // User handlers
  const handleAddUser = () => {
    console.log('Add user');
  };

  const handleEditUser = (user: UserData) => {
    console.log('Edit user:', user);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleToggleUserStatus = (id: string, status: 'active' | 'inactive' | 'banned') => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
  };

  // Seller handlers
  const handleAddSeller = () => {
    console.log('Add seller');
  };

  const handleEditSeller = (seller: SellerData) => {
    console.log('Edit seller:', seller);
  };

  const handleDeleteSeller = (id: string) => {
    setSellers(prev => prev.filter(s => s.id !== id));
  };

  const handleToggleSellerStatus = (id: string, status: 'active' | 'inactive' | 'pending' | 'banned') => {
    setSellers(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleViewSellerDetails = (seller: SellerData) => {
    console.log('View seller details:', seller);
  };

  const handleVerifySeller = (id: string) => {
    setSellers(prev => prev.map(s => 
      s.id === id ? { ...s, status: 'active' as const, verifiedAt: new Date().toISOString() } : s
    ));
  };

  // Shipper handlers
  const handleAddShipper = () => {
    console.log('Add shipper');
  };

  const handleEditShipper = (shipper: ShipperData) => {
    console.log('Edit shipper:', shipper);
  };

  const handleDeleteShipper = (id: string) => {
    setShippers(prev => prev.filter(s => s.id !== id));
  };

  const handleToggleShipperStatus = (id: string, status: 'active' | 'inactive' | 'pending' | 'banned') => {
    setShippers(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleViewShipperDetails = (shipper: ShipperData) => {
    console.log('View shipper details:', shipper);
  };

  const handleVerifyShipper = (id: string) => {
    setShippers(prev => prev.map(s => 
      s.id === id ? { ...s, status: 'active' as const, verifiedAt: new Date().toISOString() } : s
    ));
  };

  const renderContent = () => {
    switch (selectedMenu) {
      case "requests":
        return (
          <RequestApproval
            requests={requests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onViewDetails={handleViewRequestDetails}
          />
        );
      case "users":
        return (
          <UserManagement
            users={users}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onToggleStatus={handleToggleUserStatus}
          />
        );
      case "sellers":
        return (
          <SellerManagement
            sellers={sellers}
            onAddSeller={handleAddSeller}
            onEditSeller={handleEditSeller}
            onDeleteSeller={handleDeleteSeller}
            onToggleStatus={handleToggleSellerStatus}
            onViewDetails={handleViewSellerDetails}
            onVerify={handleVerifySeller}
          />
        );
      case "shippers":
        return (
          <ShipperManagement
            shippers={shippers}
            onAddShipper={handleAddShipper}
            onEditShipper={handleEditShipper}
            onDeleteShipper={handleDeleteShipper}
            onToggleStatus={handleToggleShipperStatus}
            onViewDetails={handleViewShipperDetails}
            onVerify={handleVerifyShipper}
          />
        );
      case "assignments":
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <h2>Phân công công việc</h2>
            <p>Chức năng phân công sẽ được phát triển</p>
          </Box>
        );
      case "settings":
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <h2>Cài đặt hệ thống</h2>
            <p>Chức năng cài đặt sẽ được phát triển</p>
          </Box>
        );
      default:
        return (
          <Box>
            <SystemStats stats={stats} loading={loading} />
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <h2>System Dashboard</h2>
              <p>Chào mừng đến với System Panel</p>
            </Box>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <SystemSidebar selectedMenu={selectedMenu} onMenuSelect={setSelectedMenu} />

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <SystemHeader user={user as User | null} onLogout={handleLogout} />

        {/* Content */}
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f5f5' }}>
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
}