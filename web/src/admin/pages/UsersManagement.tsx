import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";

interface User {
  _id: string;
  id?: number;
  name: string;
  displayName?: string;
  email: string;
  phone?: string;
  role: "user" | "seller" | "admin";
  status?: string;
  sellerApproved?: boolean;
  createdAt: string;
  updatedAt?: string;
}

type SellerRequestUser = string | { _id: string; name?: string; email?: string };

interface SellerRequestSummary {
  _id?: string;
  userId?: SellerRequestUser;
  status?: "pending" | "approved" | "rejected" | string;
  shopName?: string;
  createdAt?: string;
}

interface SellerRequestSummary {
  status?: "pending" | "approved" | "rejected" | string;
}

export default function UsersManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "seller" | "admin">("all");
  const [pendingSellerCount, setPendingSellerCount] = useState(0);
  const [pendingRequestMap, setPendingRequestMap] = useState<Record<string, SellerRequestSummary>>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("❌ Bạn chưa đăng nhập. Vui lòng đăng nhập với tài khoản admin.");
        setLoading(false);
        return;
      }
      const [usersRes, sellerRequestsRes] = await Promise.all([
        api.get("/api/users"),
        api.get("/api/admin/seller-requests").catch((err) => {
          console.warn("Không thể tải danh sách seller requests", err);
          return { data: [] };
        }),
      ]);
      const { data } = usersRes;
      // Handle both formats: { data: users, page, limit, total } or just [users]
      const userList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setUsers(userList);
      filterUsers(userList, searchTerm, roleFilter);

      const requestPayload = sellerRequestsRes?.data as SellerRequestSummary[] | { data?: SellerRequestSummary[] } | undefined;
      const requestArray = Array.isArray(requestPayload)
        ? requestPayload
        : Array.isArray(requestPayload?.data)
          ? requestPayload.data
          : [];
      const pendingRequests = requestArray.filter((req) => req.status === "pending");
      setPendingSellerCount(pendingRequests.length);
      const requestMap: Record<string, SellerRequestSummary> = {};
      pendingRequests.forEach((req) => {
        const uId = typeof req.userId === "string" ? req.userId : req.userId?._id;
        if (uId) requestMap[uId] = req;
      });
      setPendingRequestMap(requestMap);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Lỗi không xác định";
      if (errorMsg.includes("403")) {
        toast.error("❌ Bạn không có quyền truy cập. Vui lòng đăng nhập với tài khoản admin (admin@gmail.com / 123456)");
      } else {
        toast.error("❌ Lỗi khi tải danh sách người dùng: " + errorMsg);
      }
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = (
    userList: User[],
    search: string,
    role: "all" | "user" | "seller" | "admin"
  ) => {
    let filtered = userList;

    // Filter by role
    if (role !== "all") {
      filtered = filtered.filter((u) => u.role === role);
    }

    // Filter by search term
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(lowerSearch) ||
          u.email.toLowerCase().includes(lowerSearch) ||
          u.phone?.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    filterUsers(users, value, roleFilter);
  };

  const handleRoleFilterChange = (role: "all" | "user" | "seller" | "admin") => {
    setRoleFilter(role);
    filterUsers(users, searchTerm, role);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "user":
        return "👤 Người dùng";
      case "seller":
        return "🏪 Seller";
      case "admin":
        return "👨‍💼 Admin";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "user":
        return "default";
      case "seller":
        return "success";
      case "admin":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusChip = (user: User) => {
    const pendingRequest = pendingRequestMap[user._id];
    if (pendingRequest) {
      return (
        <Chip
          label="⏳ Chờ duyệt seller"
          size="small"
          color="warning"
          variant="filled"
        />
      );
    }
    if (user.role === "seller") {
      if (user.sellerApproved === false) {
        return (
          <Chip
            label="⚠️ Cần duyệt lại"
            size="small"
            color="warning"
            variant="outlined"
          />
        );
      }
      return (
        <Chip
          label="✅ Đã duyệt"
          size="small"
          color="success"
          variant="filled"
        />
      );
    }
    return <Chip label="✓ Hoạt động" size="small" color="default" variant="filled" />;
  };

  const totalUsers = users.length;
  const sellerCount = users.filter((u) => u.role === "seller").length;
  const sellerApprovedCount = users.filter((u) => u.role === "seller" && u.sellerApproved !== false).length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.filter((u) => u.role === "user").length;
  const totalSellerIncludingPending = sellerCount + pendingSellerCount;

  const quickStats = [
    {
      label: "Tổng tài khoản",
      value: totalUsers,
      subLabel: "Bao gồm tất cả vai trò",
    },
    {
      label: "Người dùng",
      value: userCount,
      subLabel: "Khách mua sắm", 
    },
    {
      label: "Seller hoạt động",
      value: sellerApprovedCount,
      subLabel: `${pendingSellerCount} chờ duyệt`,
    },
    {
      label: "Admin",
      value: adminCount,
      subLabel: "Quản trị viên hệ thống",
    },
  ];

  const roleOptions: Array<{ label: string; value: "all" | "user" | "seller" | "admin" }> = [
    { label: "📋 Tất cả vai trò", value: "all" },
    { label: "👤 Người dùng", value: "user" },
    { label: "🏪 Seller", value: "seller" },
    { label: "👨‍💼 Admin", value: "admin" },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box
        sx={{
          mb: 4,
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          color: "#fff",
          background: "linear-gradient(135deg, #0b3cdb, #6b2ed5)",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(11,60,219,0.35)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.2,
            background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 55%)",
          }}
        />
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="stretch" position="relative" zIndex={1}>
          <Box flex={1}>
            <Typography variant="overline" sx={{ letterSpacing: 3, opacity: 0.8 }}>
              Trung tâm người dùng
            </Typography>
            <Typography variant="h4" fontWeight={800} mt={1}>
              👥 Quản lý tài khoản toàn hệ thống
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 1.5 }}>
              Theo dõi số lượng tài khoản, tình trạng seller và can thiệp nhanh khi cần thiết.
            </Typography>

            <Grid container spacing={2} mt={2}>
              {quickStats.map((stat) => (
                <Grid item xs={12} sm={6} md={4} key={stat.label}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: "1px solid rgba(255,255,255,0.25)",
                      backgroundColor: "rgba(5,16,66,0.3)",
                    }}
                  >
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {stat.subLabel}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Stack spacing={1.5} width={{ xs: "100%", lg: 280 }}>
            <Button
              variant="contained"
              onClick={fetchUsers}
              sx={{
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 700,
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "#fff",
                '&:hover': {
                  backgroundColor: "rgba(255,255,255,0.3)",
                },
              }}
            >
              🔄 Làm mới dữ liệu
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate("/seller-requests")}
              sx={{
                borderRadius: 3,
                textTransform: "none",
                fontWeight: 600,
                borderColor: "rgba(255,255,255,0.5)",
                color: "#fff",
              }}
            >
              🏪 Xem Seller chờ duyệt
            </Button>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.2)",
                backgroundColor: "rgba(4,12,46,0.5)",
              }}
            >
              <Typography variant="body2">
                Đang có <strong>{pendingSellerCount}</strong> seller cần duyệt và <strong>{totalUsers}</strong> tài khoản đang hoạt động.
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 3, boxShadow: "0 10px 30px rgba(15,18,63,0.08)" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Bộ lọc & tìm kiếm
              </Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
                <TextField
                  placeholder="Tìm theo tên, email, điện thoại..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                />
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Vai trò</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Vai trò"
                    onChange={(e) => handleRoleFilterChange(e.target.value as "all" | "user" | "seller" | "admin")}
                  >
                    {roleOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
                {roleOptions.map((option) => (
                  <Chip
                    key={`chip-${option.value}`}
                    label={option.label}
                    variant={roleFilter === option.value ? "filled" : "outlined"}
                    color={roleFilter === option.value ? "primary" : "default"}
                    onClick={() => handleRoleFilterChange(option.value)}
                  />
                ))}
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Hiển thị <strong>{filteredUsers.length}</strong> kết quả / Tổng <strong>{totalUsers}</strong> tài khoản
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 3, height: "100%", boxShadow: "0 10px 30px rgba(15,18,63,0.08)" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700}>
                Tình trạng seller
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cập nhật theo thời gian thực
              </Typography>
              <Stack spacing={1.5} mt={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Đang hoạt động
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {sellerApprovedCount}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Chờ duyệt
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {pendingSellerCount}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tổng seller
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {totalSellerIncludingPending}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bao gồm {pendingSellerCount} chờ duyệt
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                Lần làm mới gần nhất: {new Date().toLocaleTimeString("vi-VN")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3, borderRadius: 3, boxShadow: "0 15px 40px rgba(15,18,63,0.1)", overflow: "hidden" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="h6" color="text.secondary" mb={1}>
              📭 Không tìm thấy người dùng phù hợp
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hãy điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để thử lại.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha("#0b3cdb", 0.05) }}>
                  <TableCell sx={{ fontWeight: 700 }}>Tên</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Điện thoại</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Vai trò</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Ngày tạo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Trạng thái
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user._id}
                    sx={{
                      "&:hover": {
                        backgroundColor: alpha("#0b3cdb", 0.08),
                      },
                      ...(pendingRequestMap[user._id]
                        ? {
                            borderLeft: "4px solid #fbc02d",
                            backgroundColor: alpha("#fdd835", 0.08),
                          }
                        : {}),
                    }}
                  >
                    <TableCell>
                      <Typography fontWeight={600}>{user.name}</Typography>
                      {user.displayName && user.displayName !== user.name && (
                        <Typography variant="caption" color="text.secondary">
                          @{user.displayName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        size="small"
                        color={getRoleColor(user.role) as "default" | "success" | "error"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell align="center">
                      {getStatusChip(user)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Container>
  );
}
