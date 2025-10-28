// src/components/system/RequestApproval.tsx
import {
  CheckCircle,
  Cancel,
  Visibility,
  Person,
  Store,
  LocalShipping
} from "@mui/icons-material";
import type { ChipProps } from "@mui/material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { useState } from "react";

interface Request {
  id: string;
  type: 'seller_registration' | 'shipper_registration' | 'product_approval';
  requesterName: string;
  requesterEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  details: any;
}

interface RequestApprovalProps {
  requests: Request[];
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, reason: string) => void;
  onViewDetails: (request: Request) => void;
}

const getRequestTypeText = (type: string) => {
  switch (type) {
    case 'seller_registration': return 'Đăng ký Seller';
    case 'shipper_registration': return 'Đăng ký Shipper';
    case 'product_approval': return 'Duyệt sản phẩm';
    default: return type;
  }
};

const getRequestTypeIcon = (type: string) => {
  switch (type) {
    case 'seller_registration': return <Store />;
    case 'shipper_registration': return <LocalShipping />;
    case 'product_approval': return <Store />;
    default: return <Person />;
  }
};

const getStatusColor = (status: string): ChipProps['color'] => {
  switch (status) {
    case "approved": return "success";
    case "pending": return "warning";
    case "rejected": return "error";
    default: return "default";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "approved": return "Đã duyệt";
    case "pending": return "Chờ duyệt";
    case "rejected": return "Từ chối";
    default: return status;
  }
};

export default function RequestApproval({
  requests,
  onApprove,
  onReject,
  onViewDetails
}: RequestApprovalProps) {
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  const handleApprove = () => {
    if (selectedRequest) {
      onApprove(selectedRequest.id, approvalNotes);
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      setApprovalNotes('');
    }
  };

  const handleReject = () => {
    if (selectedRequest && rejectReason.trim()) {
      onReject(selectedRequest.id, rejectReason);
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason('');
    }
  };

  const openRejectDialog = (request: Request) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const openApproveDialog = (request: Request) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Duyệt yêu cầu
      </Typography>
      
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Loại yêu cầu</TableCell>
                  <TableCell>Người yêu cầu</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell>Ngày gửi</TableCell>
                  <TableCell>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getRequestTypeIcon(request.type)}
                        {getRequestTypeText(request.type)}
                      </Box>
                    </TableCell>
                    <TableCell>{request.requesterName}</TableCell>
                    <TableCell>{request.requesterEmail}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(request.status)}
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{request.submittedAt}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => onViewDetails(request)}
                        >
                          <Visibility />
                        </IconButton>
                        {request.status === 'pending' && (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => openApproveDialog(request)}
                            >
                              <CheckCircle />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openRejectDialog(request)}
                            >
                              <Cancel />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
        <DialogTitle>Duyệt yêu cầu</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Bạn có chắc chắn muốn duyệt yêu cầu này?
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Ghi chú (tùy chọn)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Hủy</Button>
          <Button onClick={handleApprove} color="success" variant="contained">
            Duyệt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Từ chối yêu cầu</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Vui lòng nhập lý do từ chối:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Lý do từ chối"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Hủy</Button>
          <Button 
            onClick={handleReject} 
            color="error" 
            variant="contained"
            disabled={!rejectReason.trim()}
          >
            Từ chối
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
