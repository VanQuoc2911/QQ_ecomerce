import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Divider,
    Paper,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../api/axios";
import { orderService } from "../../api/orderService";
import {
    paymentService,
    type BankingResultResponse,
} from "../../api/paymentService";

interface BankingQRData {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  description: string;
  bankName?: string;
  branch?: string;
  reference?: string;
  qrString?: string;
  qrCodeDataUrl?: string;
}

interface PaymentData {
  orderId: string;
  amount: number;
  status?: string;
  sellerBankAccount?: {
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    branch?: string;
  };
  remainingTime?: number | null;
  paymentDeadline?: string | null;
  isExpired?: boolean;
}

export default function BankingPaymentPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId?: string }>();
  const [searchParams] = useSearchParams();
  const bankingQrRef = useRef<HTMLDivElement>(null);

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [bankingQR, setBankingQR] = useState<BankingQRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingResult, setProcessingResult] = useState(false);
  const [resultStatus, setResultStatus] = useState<
    "idle" | "success" | "failed"
  >("idle");
  const [countdownDeadline, setCountdownDeadline] = useState<string | null>(
    null
  );
  const [now, setNow] = useState(Date.now());
  const [autoHandled, setAutoHandled] = useState(false);
  const [autoRedirected, setAutoRedirected] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!orderId) {
        toast.error("Không tìm thấy mã đơn hàng!");
        navigate("/");
        return;
      }

      try {
        // Get banking QR data
        try {
          const bankingQRRes = await api.get(
            `/api/payment/qr/${orderId}/generate`
          );
          if (bankingQRRes.data.success) {
            setBankingQR(bankingQRRes.data.qrData);
          }
        } catch (err) {
          console.warn("Could not fetch banking QR:", err);
        }

        // Get order
        const order = await orderService.getOrderDetail(orderId);
        const totalAmount = order.totalAmount || 0;
        const remaining = order.remainingTime ?? null;

        const nextDeadline = order.paymentDeadline ?? null;
        setPaymentData({
          orderId,
          amount: totalAmount,
          status: order.status,
          sellerBankAccount: order.sellerBankAccount,
          remainingTime: remaining,
          paymentDeadline: nextDeadline,
          isExpired: order.isExpired ?? false,
        });
        setCountdownDeadline(nextDeadline);
        setNow(Date.now());
      } catch (err) {
        console.error("Error fetching payment data:", err);
        toast.error("Không thể tạo thông tin thanh toán!");
        navigate("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, navigate]);

  useEffect(() => {
    if (!countdownDeadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [countdownDeadline]);

  useEffect(() => {
    if (
      !orderId ||
      !paymentData ||
      autoRedirected ||
      paymentData.status !== "processing"
    ) {
      return;
    }
    setResultStatus("success");
    setAutoRedirected(true);
    toast.success("Đơn hàng đã được xác nhận. Đang chuyển trang...", {
      autoClose: 1500,
    });
    setTimeout(() => navigate(`/checkout-success/${orderId}`), 1000);
  }, [orderId, paymentData, autoRedirected, navigate]);

  const handleDownloadQR = (
    refElement: React.RefObject<HTMLDivElement | null>,
    filename: string
  ) => {
    if (refElement?.current) {
      const canvas = refElement.current.querySelector("canvas");
      if (canvas) {
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = filename;
        link.click();
        toast.success("Đã tải mã QR!");
      }
    }
  };

  const generateBankingQRString = (): string => {
    if (!bankingQR) return "";
    return bankingQR.qrCodeDataUrl || bankingQR.qrString || "";
  };

  const formatCountdown = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleBankingResult = useCallback(
    async (status: "success" | "failed", options?: { auto?: boolean; note?: string }) => {
      if (!orderId) return;
      setProcessingResult(true);
      try {
        const response: BankingResultResponse = await paymentService.submitBankingResult(
          orderId,
          {
            status,
            note: options?.note,
          }
        );

        if (status === "success") {
          setResultStatus("success");
          setPaymentData((prev) =>
            prev ? { ...prev, status: "processing" } : prev
          );
          const message =
            response.message ||
            "Thanh toán thành công! Đang chuyển tới trang xác nhận.";
          toast.success(message, { autoClose: 1500 });
          if (!autoRedirected) {
            setAutoRedirected(true);
            setTimeout(() => navigate(`/checkout-success/${orderId}`), 1200);
          }
          return;
        }

        setResultStatus("failed");
        const fallbackDeadline =
          response.deadline ||
          (response.countdownMs
            ? new Date(Date.now() + response.countdownMs).toISOString()
            : countdownDeadline);
        setCountdownDeadline(fallbackDeadline || null);
        setPaymentData((prev) =>
          prev
            ? {
                ...prev,
                status: "pending",
                paymentDeadline:
                  fallbackDeadline || prev.paymentDeadline || null,
              }
            : prev
        );
        setNow(Date.now());
        toast.warn(
          response.message ||
            "Thanh toán chưa thành công. Vui lòng thử lại trong thời gian cho phép.",
          { autoClose: 2500 }
        );
      } catch (err) {
        console.error("handleBankingResult error:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật trạng thái thanh toán.";
        toast.error(message);
      } finally {
        setProcessingResult(false);
        if (options?.auto) {
          navigate(`/payment/${orderId}/banking`, { replace: true });
        }
      }
    },
    [orderId, autoRedirected, countdownDeadline, navigate]
  );

  useEffect(() => {
    if (!orderId || !paymentData || autoHandled) return;
    const statusParam = (searchParams.get("status") || "").toLowerCase();
    if (statusParam === "success" || statusParam === "failed") {
      setAutoHandled(true);
      void handleBankingResult(statusParam as "success" | "failed", {
        auto: true,
        note: searchParams.get("message") || undefined,
      });
    }
  }, [orderId, paymentData, searchParams, autoHandled, handleBankingResult]);

  const countdownMs = countdownDeadline
    ? Math.max(0, new Date(countdownDeadline).getTime() - now)
    : null;

  const handleCancelPayment = async () => {
    if (!orderId) return;
    setCancelLoading(true);
    try {
      const res = await orderService.cancelOrder(orderId);
      toast.info(res.message || "Đã chuyển đơn hàng về trạng thái chờ thanh toán.");
      navigate("/order-history");
    } catch (err) {
      console.error("handleCancelPayment error:", err);
      const message =
        err instanceof Error ? err.message : "Không thể hủy thanh toán.";
      toast.error(message);
    } finally {
      setCancelLoading(false);
    }
  };

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
        <Paper sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            💳 Thanh toán bằng Ngân Hàng
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Quét mã QR hoặc chuyển khoản thủ công
          </Typography>

          {resultStatus === "success" && (
            <Alert severity="success" sx={{ mb: 3 }}>
              ✅ Thanh toán đã được xác nhận. Hệ thống đang chuyển bạn tới
              trang xác nhận đơn hàng...
            </Alert>
          )}

          {(resultStatus === "failed" ||
            (paymentData.status === "pending" && countdownMs !== null)) && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Thanh toán chưa hoàn tất.
              {countdownMs !== null && countdownMs > 0 ? (
                <>
                  {" "}Vui lòng hoàn tất chuyển khoản trong
                  {" "}
                  <strong>{formatCountdown(countdownMs)}</strong>.
                </>
              ) : (
                <> Vui lòng thử lại hoặc chọn phương thức khác.</>
              )}
            </Alert>
          )}

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

          {bankingQR ? (
            <>
              {/* Seller Bank Account Info */}
              <Box
                sx={{
                  bgcolor: "#e8f5e9",
                  p: 2,
                  borderRadius: 2,
                  mb: 3,
                  border: "2px solid #4caf50",
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  gutterBottom
                  sx={{ color: "#2e7d32" }}
                >
                  🏦 Thông tin tài khoản ngân hàng
                </Typography>
                <Box sx={{ ml: 1, textAlign: "left" }}>
                  <Typography variant="body2">
                    <strong>Ngân hàng:</strong> {bankingQR.bankName || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Số tài khoản:</strong> {bankingQR.accountNumber}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    bgcolor: "#fff9c4", 
                    p: 1, 
                    borderRadius: 1,
                    fontWeight: 700,
                    my: 1
                  }}>
                    👤 <strong>Chủ Tài Khoản:</strong> {bankingQR.accountHolder}
                  </Typography>
                  {bankingQR.branch && (
                    <Typography variant="body2">
                      <strong>Chi nhánh:</strong> {bankingQR.branch}
                    </Typography>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" sx={{ color: "#d32f2f", fontWeight: 700 }}>
                    <strong>Số tiền:</strong> {bankingQR.amount.toLocaleString("vi-VN")}₫
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nội dung:</strong> {bankingQR.description}
                  </Typography>
                </Box>
              </Box>

              {/* QR Code for Banking */}
              <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mt: 3 }}>
                📱 Quét mã QR để thanh toán
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sử dụng ứng dụng ngân hàng hoặc ứng dụng thanh toán để quét
              </Typography>
              <Box
                ref={bankingQrRef}
                sx={{
                  p: 2,
                  bgcolor: "#fff",
                  border: "2px dashed #4caf50",
                  borderRadius: 2,
                  display: "flex",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                {bankingQR.qrCodeDataUrl ? (
                  <img 
                    src={bankingQR.qrCodeDataUrl} 
                    alt="Banking QR Code"
                    style={{ maxWidth: "300px", height: "auto" }}
                  />
                ) : (
                  <QRCode
                    value={generateBankingQRString()}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                )}
              </Box>
              <Button
                variant="outlined"
                fullWidth
                onClick={() =>
                  handleDownloadQR(
                    bankingQrRef,
                    `QR_Banking_${paymentData.orderId}.png`
                  )
                }
                sx={{ mb: 2 }}
              >
                ⬇️ Tải mã QR
              </Button>

              {/* Manual Transfer Info */}
              <Box sx={{ bgcolor: "#fff3cd", p: 2, borderRadius: 2, mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  💡 <strong>Hướng dẫn quét:</strong>
                </Typography>
                <Typography variant="caption" component="div">
                  • Mở ứng dụng ngân hàng
                </Typography>
                <Typography variant="caption" component="div">
                  • Chọn "Quét QR" hoặc tính năng thanh toán
                </Typography>
                <Typography variant="caption" component="div">
                  • Quét mã QR ở trên
                </Typography>
                <Typography variant="caption" component="div">
                  • Xác nhận thông tin thanh toán
                </Typography>
                <Typography variant="caption" component="div">
                  • Nhập mã PIN để hoàn tất
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }}>HOẶC</Divider>

              {/* Manual Transfer */}
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                💰 Chuyển khoản thủ công
              </Typography>
              <Box sx={{ textAlign: "left", bgcolor: "#f5f5f5", p: 2, borderRadius: 2 }}>
                <Typography variant="caption" component="div" sx={{ mb: 1 }}>
                  Vào app ngân hàng, chọn chuyển tiền và nhập thông tin:
                </Typography>
                <TextField
                  fullWidth
                  label="Số tài khoản"
                  value={bankingQR.accountNumber}
                  InputProps={{ readOnly: true }}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  label="Chủ tài khoản"
                  value={bankingQR.accountHolder}
                  InputProps={{ readOnly: true }}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  label="Số tiền (VND)"
                  value={bankingQR.amount.toLocaleString("vi-VN")}
                  InputProps={{ readOnly: true }}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  label="Nội dung chuyển"
                  value={bankingQR.description}
                  InputProps={{ readOnly: true }}
                  size="small"
                />
              </Box>
            </>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4 }}>
              Thông tin QR chưa sẵn sàng. Vui lòng thử lại.
            </Typography>
          )}

          {paymentData.status !== "processing" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 3 }}>
              <Button
                variant="contained"
                color="success"
                disabled={processingResult}
                onClick={() => handleBankingResult("success")}
              >
                {processingResult
                  ? "⏳ Đang xác nhận..."
                  : "✅ Tôi đã chuyển khoản thành công"}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                disabled={processingResult}
                onClick={() => handleBankingResult("failed")}
              >
                ⚠️ Thanh toán gặp vấn đề
              </Button>
            </Box>
          )}

          {/* Cancel Button */}
          <Button
            variant="outlined"
            color="error"
            fullWidth
            onClick={handleCancelPayment}
            disabled={cancelLoading}
            sx={{ mt: 3 }}
          >
            {cancelLoading ? "⏳ Đang huỷ..." : "Huỷ thanh toán"}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
