import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE_URL = "http://localhost:4000/api";

export default function VnpayReturn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<{
    success: boolean;
    message: string;
    orderId?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Get all VNPAY callback parameters
        const params = new URLSearchParams(searchParams.toString());
        const responseCode = searchParams.get("vnp_ResponseCode");
        const txnRef = searchParams.get("vnp_TxnRef");
        const secureHash = searchParams.get("vnp_SecureHash");

        console.log("🔍 VNPAY Return - Initial params:", {
          responseCode,
          txnRef,
          secureHash,
        });

        if (!txnRef) {
          setPaymentStatus({
            success: false,
            message: "Không tìm thấy mã giao dịch",
          });
          setLoading(false);
          return;
        }

        // Call backend to verify signature and payment status
        console.log("📞 Verifying payment with backend...");
        const response = await fetch(
          `${API_BASE_URL}/payment/vnpay/verify?${params.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();
        console.log("✅ Backend verification response:", result);

        if (response.ok && result.success) {
          // Payment verified successfully
          setPaymentStatus({
            success: true,
            message: "Thanh toán thành công! Đơn hàng của bạn đang được xử lý.",
            orderId: txnRef,
          });
          toast.success("Thanh toán thành công!");
        } else {
          // Payment verification failed
          const errorMessage =
            result.message || `Thanh toán không thành công. Mã lỗi: ${responseCode}`;
          setPaymentStatus({
            success: false,
            message: errorMessage,
            orderId: txnRef,
          });
          toast.error(errorMessage);
        }
      } catch (err) {
        console.error("VNPAY return error:", err);
        setPaymentStatus({
          success: false,
          message: "Có lỗi xảy ra khi xử lý thanh toán. Vui lòng thử lại.",
        });
        toast.error("Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography color="text.secondary">
            Đang xác nhận thanh toán...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card
        elevation={0}
        sx={{
          border: "1px solid #e0e0e0",
          borderRadius: 3,
          textAlign: "center",
          p: 4,
        }}
      >
        <CardContent>
          {paymentStatus?.success ? (
            <>
              <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
                <CheckCircleIcon
                  sx={{ fontSize: 80, color: "#4caf50" }}
                />
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: "#4caf50" }}>
                Thanh toán thành công
              </Typography>
            </>
          ) : (
            <>
              <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
                <ErrorIcon
                  sx={{ fontSize: 80, color: "#f44336" }}
                />
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: "#f44336" }}>
                Thanh toán thất bại
              </Typography>
            </>
          )}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            {paymentStatus?.message}
          </Typography>

          {paymentStatus?.orderId && (
            <Typography
              variant="caption"
              display="block"
              sx={{ mb: 2, color: "#999" }}
            >
              Mã đơn hàng: {paymentStatus.orderId}
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button
              variant="outlined"
              onClick={() => navigate("/orders")}
              sx={{ borderRadius: 2, px: 3 }}
            >
              Lịch sử đơn hàng
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate("/")}
              sx={{
                borderRadius: 2,
                px: 3,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              Về trang chủ
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
