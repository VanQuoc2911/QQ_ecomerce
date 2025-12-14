import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axios";

interface SellerRequest {
  _id: string;
  userId: { _id: string; name: string; email: string };
  shopName: string;
  logo: string;
  address: string;
  phone: string;
  website: string;
  businessLicenseUrl: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: string;
  reviewerId?: string;
  reviewNote: string;
  createdAt: string;
}

export default function AdminSellerRequests() {
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openRequestInfoDialog, setOpenRequestInfoDialog] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<SellerRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [requestMessage, setRequestMessage] = useState("");

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const filterRequests = (
    requestList: SellerRequest[],
    search: string,
    status: "all" | "pending" | "approved" | "rejected"
  ) => {
    let filtered = requestList;

    if (status !== "all") {
      filtered = filtered.filter((r) => r.status === status);
    }

    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.shopName.toLowerCase().includes(lowerSearch) ||
          r.userId.name.toLowerCase().includes(lowerSearch) ||
          r.userId.email.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredRequests(filtered);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      console.log("🔐 Token in localStorage:", token ? "✅ Present" : "❌ Missing");
      
      if (!token) {
        toast.error("❌ Bạn chưa đăng nhập. Vui lòng đăng nhập với tài khoản admin.");
        setLoading(false);
        return;
      }
      
      console.log("📤 Sending request to /api/admin/seller-requests with token:", token);
      const { data } = await api.get<SellerRequest[]>("/api/admin/seller-requests");
      console.log("✅ Seller requests loaded:", data);
      
      const requestList = Array.isArray(data) ? data : [];
      setRequests(requestList);
      filterRequests(requestList, searchTerm, statusFilter);
    } catch (err: unknown) {
      console.error("❌ Full error object:", err);
      const errorMsg = err instanceof Error ? err.message : "Lỗi không xác định";
      if (errorMsg.includes("403")) {
        toast.error("❌ Bạn không có quyền truy cập. Vui lòng đăng nhập với tài khoản admin (admin@gmail.com / 123456)");
      } else {
        toast.error("❌ Lỗi khi tải danh sách yêu cầu: " + errorMsg);
      }
      console.error("fetchRequests error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    filterRequests(requests, value, statusFilter);
  };

  const handleStatusFilterChange = (status: "all" | "pending" | "approved" | "rejected") => {
    setStatusFilter(status);
    filterRequests(requests, searchTerm, status);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "⏳ Chờ duyệt";
      case "approved":
        return "✅ Đã duyệt";
      case "rejected":
        return "❌ Từ chối";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  const handleReview = (req: SellerRequest, actionType: "approve" | "reject") => {
    setCurrentRequest(req);
    setAction(actionType);
    setReviewNote("");
    setOpenDialog(true);
  };

  const handleViewDetails = (req: SellerRequest) => {
    setCurrentRequest(req);
    setOpenDetailsDialog(true);
  };

  const submitReview = async () => {
    if (!currentRequest) return;
    try {
      await api.post(`/api/admin/seller-requests/${currentRequest._id}/review`, {
        action,
        reviewNote,
      });
      toast.success(`✅ Yêu cầu đã được ${action === "approve" ? "duyệt" : "từ chối"}`);
      setOpenDialog(false);
      fetchRequests();
    } catch (err) {
      toast.error("❌ Lỗi khi duyệt yêu cầu");
      console.error(err);
    }
  };

  const handleRequestMoreInfo = (req: SellerRequest) => {
    setCurrentRequest(req);
    setRequestMessage("");
    setOpenRequestInfoDialog(true);
  };

  const submitRequestInfo = async () => {
    if (!currentRequest) return;
    try {
      // Send notification to user
      await api.post(`/api/notifications`, {
        userId: currentRequest.userId._id,
        type: "seller_request_info",
        title: "📝 Admin yêu cầu thêm thông tin",
        message: requestMessage || "Admin yêu cầu bạn cập nhật thêm thông tin cho yêu cầu trở thành seller",
        relatedId: currentRequest._id,
        relatedModel: "SellerRequest",
      });
      
      toast.success("✅ Đã gửi yêu cầu cung cấp thông tin tới seller");
      setOpenRequestInfoDialog(false);
      setRequestMessage("");
    } catch (err) {
      toast.error("❌ Lỗi khi gửi yêu cầu");
      console.error(err);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Hero / Summary */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #0d47a1, #0288d1)",
          color: "white",
          boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              🏪 Duyệt yêu cầu Seller
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
              Xem nhanh trạng thái, lọc và xử lý yêu cầu trở thành seller.
            </Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<InfoOutlinedIcon />}
              onClick={() => filterRequests(requests, searchTerm, statusFilter)}
            >
              Cập nhật bộ lọc
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<RefreshIcon />}
              onClick={fetchRequests}
              sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
            >
              Làm mới dữ liệu
            </Button>
          </Stack>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2, mt: 3 }}>
          <Card sx={{ bgcolor: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>⏳ Chờ duyệt</Typography>
              <Typography variant="h5" fontWeight={800}>{pendingCount}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Yêu cầu đang cần xử lý</Typography>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>✅ Đã duyệt</Typography>
              <Typography variant="h5" fontWeight={800}>{approvedCount}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Được chấp thuận</Typography>
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>❌ Từ chối</Typography>
              <Typography variant="h5" fontWeight={800}>{rejectedCount}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Bị từ chối / cần xem lại</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Filters Card */}
      <Card sx={{ mb: 3, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
            <TextField
              placeholder="🔍 Tìm kiếm tên cửa hàng, người yêu cầu, email"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              sx={{ flex: 1, minWidth: 280 }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
              }}
            />

            <FormControl sx={{ minWidth: 220 }} size="small">
              <Select
                value={statusFilter}
                displayEmpty
                onChange={(e: SelectChangeEvent<string>) =>
                  handleStatusFilterChange(
                    e.target.value as "all" | "pending" | "approved" | "rejected"
                  )
                }
              >
                <MenuItem value="all">📋 Tất cả trạng thái</MenuItem>
                <MenuItem value="pending">⏳ Chờ duyệt</MenuItem>
                <MenuItem value="approved">✅ Đã duyệt</MenuItem>
                <MenuItem value="rejected">❌ Từ chối</MenuItem>
              </Select>
            </FormControl>

            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchRequests} sx={{ minWidth: 140 }}>
              Làm mới
            </Button>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Bộ lọc nhanh:
            </Typography>
            {(["all", "pending", "approved", "rejected"] as const).map((key) => (
              <Chip
                key={key}
                label={getStatusLabel(key)}
                color={key === "all" ? "default" : getStatusColor(key)}
                variant={statusFilter === key ? "filled" : "outlined"}
                onClick={() => handleStatusFilterChange(key)}
                clickable
              />
            ))}
            <Chip
              label={`Hiển thị ${filteredRequests.length}/${requests.length}`}
              color="info"
              variant="outlined"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Requests Table */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : filteredRequests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" mb={1}>
            📭 Không tìm thấy yêu cầu nào
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: "0 12px 30px rgba(0,0,0,0.06)" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell sx={{ fontWeight: 700 }}>Tên cửa hàng</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Người yêu cầu</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ngày gửi</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((req) => (
                <TableRow
                  key={req._id}
                  sx={{
                    "&:hover": { bgcolor: alpha("#0288d1", 0.08) },
                    transition: "background-color 0.2s",
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar
                        src={req.logo}
                        variant="rounded"
                        sx={{ width: 40, height: 40, bgcolor: alpha("#0288d1", 0.08) }}
                      >
                        {req.shopName?.[0] || "S"}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={700}>{req.shopName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {req._id.slice(-6)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{req.userId.name}</TableCell>
                  <TableCell>{req.userId.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(req.status)}
                      size="small"
                      color={getStatusColor(req.status)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{new Date(req.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                  <TableCell align="center">
                    {req.status === "pending" && (
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          onClick={() => handleViewDetails(req)}
                        >
                          Xem chi tiết
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon />}
                          onClick={() => handleReview(req, "approve")}
                        >
                          Duyệt
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          startIcon={<CloseIcon />}
                          onClick={() => handleReview(req, "reject")}
                        >
                          Từ chối
                        </Button>
                      </Box>
                    )}
                    {req.status !== "pending" && (
                      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", alignItems: "center" }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="info"
                          onClick={() => handleViewDetails(req)}
                        >
                          Chi tiết
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                          {req.reviewNote || "—"}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Review Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {action === "approve" ? "✅ Duyệt yêu cầu" : "❌ Từ chối yêu cầu"} — {currentRequest?.shopName}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              👤 {currentRequest?.userId.name} ({currentRequest?.userId.email})
            </Typography>
          </Box>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            {currentRequest?.logo && (
              <img src={currentRequest.logo} alt="logo" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover" }} />
            )}
            <Typography variant="body2">📍 {currentRequest?.address}</Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Ghi chú"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Nhập ghi chú (không bắt buộc)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button onClick={submitReview} variant="contained" color={action === "approve" ? "success" : "error"}>
            {action === "approve" ? "✅ Duyệt" : "❌ Từ chối"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          📋 Chi tiết yêu cầu — {currentRequest?.shopName}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Shop Information */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: "#0288d1" }}>
              🏪 Thông tin cửa hàng
            </Typography>
            {currentRequest?.logo && (
              <Box sx={{ mb: 2 }}>
                <img 
                  src={currentRequest.logo} 
                  alt="logo" 
                  style={{ width: 120, height: 120, borderRadius: 8, objectFit: "cover" }}
                />
              </Box>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Tên cửa hàng</Typography>
                <Typography variant="body2" fontWeight={600}>{currentRequest?.shopName}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Điện thoại</Typography>
                <Typography variant="body2" fontWeight={600}>{currentRequest?.phone || "—"}</Typography>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" color="text.secondary">Địa chỉ</Typography>
                <Typography variant="body2" fontWeight={600}>{currentRequest?.address}</Typography>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" color="text.secondary">Website</Typography>
                <Typography variant="body2" fontWeight={600}>{currentRequest?.website || "—"}</Typography>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" color="text.secondary">Mô tả</Typography>
                <Typography variant="body2">{currentRequest?.description || "—"}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Owner Information */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: "#0288d1" }}>
              👤 Thông tin chủ cửa hàng
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" color="text.secondary">Tên</Typography>
                <Typography variant="body2" fontWeight={600}>{currentRequest?.userId.name}</Typography>
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" color="text.secondary">Email</Typography>
                <Typography variant="body2" fontWeight={600}>{currentRequest?.userId.email}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Business Information */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: "#0288d1" }}>
              📄 Thông tin kinh doanh
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <Typography variant="caption" color="text.secondary">Giấy phép kinh doanh</Typography>
                {currentRequest?.businessLicenseUrl ? (
                  <Box
                    component="a"
                    href={currentRequest.businessLicenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: "inline-block",
                      mt: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "#f5f5f5",
                      border: "1px solid #e0e0e0",
                      textDecoration: "none",
                      color: "#0288d1",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "#eeeeee" }
                    }}
                  >
                    🔗 Xem tài liệu
                  </Box>
                ) : (
                  <Typography variant="body2" color="error">Chưa cung cấp</Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Status Information */}
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: "#0288d1" }}>
              ℹ️ Trạng thái
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Trạng thái</Typography>
                <Chip
                  label={getStatusLabel(currentRequest?.status || "pending")}
                  size="small"
                  color={getStatusColor(currentRequest?.status || "pending")}
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Ngày gửi</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {currentRequest?.createdAt ? new Date(currentRequest.createdAt).toLocaleDateString("vi-VN") : "—"}
                </Typography>
              </Box>
              {currentRequest?.status !== "pending" && currentRequest?.reviewNote && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Typography variant="caption" color="text.secondary">Ghi chú duyệt</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, p: 1, bgcolor: alpha("#0288d1", 0.1), borderRadius: 1 }}>
                    {currentRequest.reviewNote}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          {currentRequest?.status === "pending" && (
            <>
              <Button
                onClick={() => handleRequestMoreInfo(currentRequest)}
                variant="outlined"
                color="warning"
              >
                📝 Yêu cầu thông tin
              </Button>
              <Button
                onClick={() => {
                  setOpenDetailsDialog(false);
                  handleReview(currentRequest, "approve");
                }}
                variant="contained"
                color="success"
              >
                ✅ Duyệt
              </Button>
              <Button
                onClick={() => {
                  setOpenDetailsDialog(false);
                  handleReview(currentRequest, "reject");
                }}
                variant="contained"
                color="error"
              >
                ❌ Từ chối
              </Button>
            </>
          )}
          <Button onClick={() => setOpenDetailsDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Request Info Dialog */}
      <Dialog open={openRequestInfoDialog} onClose={() => setOpenRequestInfoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          📝 Yêu cầu cung cấp thêm thông tin — {currentRequest?.shopName}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Gửi thông báo tới seller để yêu cầu cập nhật hoặc cung cấp thêm thông tin cho yêu cầu trở thành seller.
          </Typography>
          
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: "#0288d1" }}>
            ✉️ Lựa chọn nhanh:
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setRequestMessage("Vui lòng cung cấp giấy phép kinh doanh hợp lệ.")}
            >
              Giấy phép kinh doanh
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setRequestMessage("Vui lòng cập nhật website cho cửa hàng.")}
            >
              Website
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setRequestMessage("Vui lòng cập nhật mô tả chi tiết cho cửa hàng.")}
            >
              Mô tả
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setRequestMessage("Vui lòng cung cấp logo của cửa hàng.")}
            >
              Logo
            </Button>
          </Box>

          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
            📧 Nội dung thông báo:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Nhập nội dung yêu cầu"
            placeholder="Nhập thông điệp cụ thể cho seller..."
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            variant="outlined"
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            💡 Seller sẽ nhận được thông báo và có thể cập nhật thông tin từ tài khoản của họ.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRequestInfoDialog(false)}>Hủy</Button>
          <Button 
            onClick={submitRequestInfo} 
            variant="contained" 
            color="warning"
            disabled={!requestMessage.trim()}
          >
            📤 Gửi yêu cầu
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
