import { Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, alpha } from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axios";

interface ShipperContactInfo {
  fullName?: string;
  phone?: string;
  email?: string;
}

interface ShipperVehicleInfo {
  vehicleType?: string;
  vehicleModel?: string;
  licensePlate?: string;
}

interface ShipperRequest {
  _id: string;
  userId: { _id: string; name: string; email: string };
  contactInfo?: ShipperContactInfo;
  vehicleInfo?: ShipperVehicleInfo;
  avatar?: string;
  status: "pending" | "approved" | "rejected";
  reviewedAt?: string;
  reviewerId?: string;
  reviewNote: string;
  createdAt: string;
}

export default function AdminShipperRequests() {
  const [requests, setRequests] = useState<ShipperRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<ShipperRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [action, setAction] = useState<"approve" | "reject">("approve");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ShipperRequest[]>('/api/admin/shipper-requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách hồ sơ shipper');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleReview = (req: ShipperRequest, actionType: "approve" | "reject") => {
    setCurrentRequest(req);
    setAction(actionType);
    setReviewNote("");
    setOpenDialog(true);
  };

  const handleViewDetails = (req: ShipperRequest) => {
    setCurrentRequest(req);
    setOpenDetailsDialog(true);
  };

  const submitReview = async () => {
    if (!currentRequest) return;
    try {
      const { data } = await api.post<ShipperRequest>(
        `/api/admin/shipper-requests/${currentRequest._id}/review`,
        { action, reviewNote },
      );
      // If server returns the updated request, update local state optimistically
      if (data && data._id) {
        setRequests((prev) => prev.map((r) => (r._id === data._id ? data : r)));
      } else {
        // fallback: refresh full list
        await fetchRequests();
      }
      toast.success(`Yêu cầu đã được ${action === 'approve' ? 'duyệt' : 'từ chối'}`);
      setOpenDialog(false);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi duyệt hồ sơ shipper');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '⏳ Chờ duyệt';
      case 'approved': return '✅ Đã duyệt';
      case 'rejected': return '❌ Từ chối';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} mb={2}>🚚 Duyệt Hồ sơ Shipper</Typography>
        <Typography variant="body1" color="text.secondary">Quản lý và duyệt hồ sơ người đăng ký làm shipper</Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px"><CircularProgress/></Box>
      ) : requests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}><Typography variant="h6">Không có hồ sơ nào</Typography></Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 700 }}>Người yêu cầu</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Số điện thoại</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phương tiện</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ngày gửi</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req._id} sx={{ '&:hover': { bgcolor: alpha('#0288d1', 0.06) } }}>
                  <TableCell>{req.userId.name} ({req.userId.email})</TableCell>
                  <TableCell>{req.contactInfo?.phone || '—'}</TableCell>
                  <TableCell>{req.vehicleInfo?.vehicleType || '—'}</TableCell>
                  <TableCell><Chip label={getStatusLabel(req.status)} size="small" color={getStatusColor(req.status)} variant="outlined"/></TableCell>
                  <TableCell>{new Date(req.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell align="center">
                    {req.status === 'pending' ? (
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button size="small" variant="outlined" onClick={() => handleViewDetails(req)}>Xem</Button>
                        <Button size="small" variant="contained" color="success" onClick={() => handleReview(req, 'approve')}>Duyệt</Button>
                        <Button size="small" variant="contained" color="error" onClick={() => handleReview(req, 'reject')}>Từ chối</Button>
                      </Box>
                    ) : (
                      <Button size="small" variant="outlined" onClick={() => handleViewDetails(req)}>Chi tiết</Button>
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
        <DialogTitle>{action === 'approve' ? 'Duyệt hồ sơ' : 'Từ chối hồ sơ'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">Người dùng: {currentRequest?.userId.name} ({currentRequest?.userId.email})</Typography>
          </Box>
          <TextField fullWidth multiline rows={3} label="Ghi chú" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button variant="contained" color={action === 'approve' ? 'success' : 'error'} onClick={submitReview}>{action === 'approve' ? 'Duyệt' : 'Từ chối'}</Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chi tiết hồ sơ</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2">Thông tin liên hệ</Typography>
            <Typography variant="body2">Họ tên: {currentRequest?.contactInfo?.fullName || '—'}</Typography>
            <Typography variant="body2">Số điện thoại: {currentRequest?.contactInfo?.phone || '—'}</Typography>
            <Typography variant="body2">Email: {currentRequest?.contactInfo?.email || '—'}</Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Phương tiện</Typography>
            <Typography variant="body2">Loại: {currentRequest?.vehicleInfo?.vehicleType || '—'}</Typography>
            <Typography variant="body2">Model: {currentRequest?.vehicleInfo?.vehicleModel || '—'}</Typography>
            <Typography variant="body2">Biển số: {currentRequest?.vehicleInfo?.licensePlate || '—'}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          {currentRequest?.status === 'pending' && (
            <>
              <Button onClick={() => { setOpenDetailsDialog(false); handleReview(currentRequest, 'approve'); }} variant="contained" color="success">Duyệt</Button>
              <Button onClick={() => { setOpenDetailsDialog(false); handleReview(currentRequest, 'reject'); }} variant="contained" color="error">Từ chối</Button>
            </>
          )}
          <Button onClick={() => setOpenDetailsDialog(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
