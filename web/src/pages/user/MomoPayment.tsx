import {
    Box,
    Button,
    CircularProgress,
    Container,
    Divider,
    Paper,
    Typography,
    useTheme,
} from "@mui/material";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { orderService } from "../../api/orderService";

interface PaymentData {
  orderId: string;
  amount: number;
  status?: string;
}

export default function MomoPaymentPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId?: string }>();

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!orderId) {
        toast.error("Không tìm thấy mã đơn hàng!");
        navigate("/");
        return;
      }

      try {
        // Get order
        const order = await orderService.getOrderDetail(orderId);
        const totalAmount = order.totalAmount || 0;

        setPaymentData({
          orderId,
          amount: totalAmount,
          status: order.status,
        });
      } catch (err) {
        console.error("Error fetching payment data:", err);
        toast.error("Không thể tạo thông tin thanh toán!");
        navigate("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!paymentData) {
    return (
      <Container sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h6" color="error">
          Không thể tải thông tin thanh toán!
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 3 }}
          onClick={() => navigate("/")}
        >
          Quay về trang chủ
        </Button>
      </Container>
    );
  }

  const handleCancelPayment = async () => {
    if (!orderId) return;
    setCancelLoading(true);
    try {
      const res = await orderService.cancelOrder(orderId);
      toast.info(res.message || "Đã chuyển đơn hàng về trạng thái chờ thanh toán.");
      navigate("/order-history");
    } catch (err) {
      console.error("MoMo cancel payment error:", err);
      const message =
        err instanceof Error ? err.message : "Không thể hủy thanh toán.";
      toast.error(message);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: 6,
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #101820, #1a273a)"
            : "linear-gradient(135deg, #e3f2fd, #f5f7fa)",
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            💜 Thanh toán qua MoMo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Quét mã QR hoặc sử dụng ứng dụng MoMo
          </Typography>

          {/* Status Alert - If payment_pending */}
          {paymentData.status === "payment_pending" && (
            <Box
              sx={{
                bgcolor: "#fff3cd",
                border: "2px solid #ff9800",
                color: "#856404",
                p: 2,
                borderRadius: 2,
                mb: 3,
              }}
            >
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  ⏳ Chờ thanh toán
                </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Bạn đã hoàn thành chuyển khoản. Vui lòng chờ seller xác nhận đã
                nhận được tiền.
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Đơn hàng sẽ chuyển sang trạng thái "Chờ xử lý" sau khi seller
                xác nhận.
              </Typography>
            </Box>
          )}

          {/* Order Info */}
          <Box sx={{ bgcolor: "#f5f5f5", p: 2, borderRadius: 2, mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Mã đơn hàng
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {paymentData.orderId}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Số tiền cần thanh toán
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              color="error"
              sx={{ mb: 1 }}
            >
              {paymentData.amount.toLocaleString("vi-VN")}₫
            </Typography>
          </Box>

          {/* MoMo Info */}
          <Box sx={{ bgcolor: "#f9e7f5", p: 2, borderRadius: 2, mb: 3, border: "2px solid #a21caf" }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              gutterBottom
              sx={{ color: "#6a1b9a" }}
            >
              💜 Thông tin thanh toán MoMo
            </Typography>
            <Box sx={{ ml: 1, textAlign: "left" }}>
              <Typography variant="body2">
                <strong>Loại:</strong> Thanh toán qua ứng dụng MoMo
              </Typography>
              <Typography variant="body2" sx={{ 
                bgcolor: "#fff9c4", 
                p: 1, 
                borderRadius: 1,
                fontWeight: 700,
                my: 1
              }}>
                💰 <strong>Số tiền:</strong> {paymentData.amount.toLocaleString("vi-VN")}₫
              </Typography>
              <Typography variant="body2">
                <strong>Mã đơn hàng:</strong> {paymentData.orderId}
              </Typography>
            </Box>
          </Box>

          {/* MoMo QR */}
          <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mt: 3 }}>
            📱 Quét mã QR bằng MoMo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mở ứng dụng MoMo và quét mã QR bên dưới
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: "#fff",
              border: "2px dashed #a21caf",
              borderRadius: 2,
              display: "flex",
              justifyContent: "center",
              mb: 3,
            }}
          >
            <QRCode
              value={`momo_payment_${paymentData.orderId}`}
              size={256}
              level="H"
              includeMargin={true}
            />
          </Box>

          {/* MoMo Button */}
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => {
              window.location.href = `momo://app?action=payment`;
              toast.info("Mở ứng dụng MoMo...");
            }}
            sx={{
              mb: 2,
              fontWeight: 700,
              py: 1.5,
              bgcolor: "#a21caf",
              "&:hover": { bgcolor: "#9016d4" },
            }}
          >
            💜 Mở MoMo để thanh toán
          </Button>

          {/* Instructions */}
          <Box sx={{ bgcolor: "#fff3cd", p: 2, borderRadius: 2, mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              💡 <strong>Hướng dẫn thanh toán MoMo:</strong>
            </Typography>
            <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
              • Tải ứng dụng MoMo (nếu chưa có)
            </Typography>
            <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
              • Quét mã QR bằng MoMo hoặc nhấn nút trên
            </Typography>
            <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
              • Xác nhận số tiền: {paymentData.amount.toLocaleString("vi-VN")}₫
            </Typography>
            <Typography variant="caption" component="div">
              • Nhập PIN MoMo để hoàn tất thanh toán
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Alternative Payment Methods */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Muốn chọn phương thức khác?
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => navigate(`/payment/${orderId}`)}
            sx={{ mb: 2 }}
          >
            Chọn phương thức thanh toán khác
          </Button>

          {/* Cancel Button */}
          <Button
            variant="outlined"
            color="error"
            fullWidth
            disabled={cancelLoading}
            onClick={handleCancelPayment}
          >
            {cancelLoading ? "⏳ Đang huỷ..." : "Huỷ thanh toán"}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
