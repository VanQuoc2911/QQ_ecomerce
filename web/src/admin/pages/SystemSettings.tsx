import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";
import SaveIcon from "@mui/icons-material/Save";
import SecurityIcon from "@mui/icons-material/Security";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControlLabel,
  InputAdornment,
  Snackbar,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import axios, { type AxiosResponse } from "axios";
import React, { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";

interface SmtpSettings {
  email: string;
  smtpServer: string;
  smtpPort: number;
  username?: string;
  password?: string;
  secure?: boolean;
  fromName?: string;
}

interface SystemSettings {
  autoApproveProducts: boolean;
  autoApproveSellers: boolean;
  smtp: SmtpSettings;
  serviceFeePercent?: number;
  sellerServiceFeePercent?: number;
}

type AnnouncementAudience = "all" | "users" | "sellers" | "shippers";

interface AnnouncementHistory {
  _id: string;
  title: string;
  message: string;
  audience: AnnouncementAudience;
  createdAt: string;
  createdBy?: {
    name?: string;
    email?: string;
  };
  metadata?: {
    recipientCount?: number;
  };
}

const AUDIENCE_OPTIONS: Array<{ value: AnnouncementAudience; label: string }> = [
  { value: "all", label: "Toàn hệ thống" },
  { value: "users", label: "Toàn bộ user" },
  { value: "sellers", label: "Toàn bộ seller" },
  { value: "shippers", label: "Toàn bộ shipper" },
];

const SettingsPage: React.FC = () => {
  const [autoApproveProducts, setAutoApproveProducts] = useState<boolean>(false);
  const [autoApproveSellers, setAutoApproveSellers] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [smtpServer, setSmtpServer] = useState<string>("");
  const [smtpPort, setSmtpPort] = useState<string>("587");
  const [smtpUsername, setSmtpUsername] = useState<string>("");
  const [smtpPassword, setSmtpPassword] = useState<string>("");
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);
  const [smtpFromName, setSmtpFromName] = useState<string>("");
  const [serviceFeePercent, setServiceFeePercent] = useState<string>("0");
  const [sellerServiceFeePercent, setSellerServiceFeePercent] = useState<string>("0");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [announcementTitle, setAnnouncementTitle] = useState<string>("");
  const [announcementMessage, setAnnouncementMessage] = useState<string>("");
  const [announcementAudience, setAnnouncementAudience] =
    useState<AnnouncementAudience>("all");
  const [announcementHistory, setAnnouncementHistory] = useState<AnnouncementHistory[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState<boolean>(false);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res: AxiosResponse<AnnouncementHistory[]> = await api.get(
        "/api/admin/announcements",
        { params: { limit: 10 } }
      );
      setAnnouncementHistory(res.data ?? []);
    } catch (err) {
      console.error("Failed to load announcements", err);
    }
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res: AxiosResponse<SystemSettings> = await api.get("/api/admin/settings");
        const data = res.data;
        setAutoApproveProducts(data.autoApproveProducts ?? false);
        setAutoApproveSellers(data.autoApproveSellers ?? false);
        setEmail(data.smtp?.email ?? "");
        setSmtpServer(data.smtp?.smtpServer ?? "");
        setSmtpPort(data.smtp?.smtpPort?.toString() ?? "587");
        setSmtpUsername(data.smtp?.username ?? "");
        setSmtpPassword(data.smtp?.password ?? "");
        setSmtpSecure(Boolean(data.smtp?.secure));
        setSmtpFromName(data.smtp?.fromName ?? "");
        setServiceFeePercent((data.serviceFeePercent ?? 0).toString());
        setSellerServiceFeePercent((data.sellerServiceFeePercent ?? 0).toString());
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error(err.message);
        }
      }
    };
    fetchSettings();
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const parsedServiceFee = Number(serviceFeePercent);
      const normalizedServiceFee = Number.isNaN(parsedServiceFee)
        ? 0
        : Math.min(Math.max(parsedServiceFee, 0), 100);
      const parsedSellerFee = Number(sellerServiceFeePercent);
      const normalizedSellerFee = Number.isNaN(parsedSellerFee)
        ? 0
        : Math.min(Math.max(parsedSellerFee, 0), 100);

      const payload: Partial<SystemSettings> = {
        autoApproveProducts,
        autoApproveSellers,
        smtp: {
          email,
          smtpServer,
          smtpPort: Number(smtpPort),
          username: smtpUsername,
          password: smtpPassword,
          secure: smtpSecure,
          fromName: smtpFromName,
        },
        serviceFeePercent: normalizedServiceFee,
        sellerServiceFeePercent: normalizedSellerFee,
      };

      await api.post("/api/admin/settings", payload);

      setSuccessMessage("Settings saved successfully!");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Failed to save settings");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung thông báo");
      return;
    }

    setAnnouncementLoading(true);
    setError("");
    try {
      await api.post("/api/admin/announcements", {
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        audience: announcementAudience,
      });

      setSuccessMessage("Đã gửi thông báo đến đối tượng đã chọn");
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      await loadAnnouncements();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? "Không thể gửi thông báo");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Đã xảy ra lỗi không xác định");
      }
    } finally {
      setAnnouncementLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #0288d1 0%, #01579b 100%)",
            borderRadius: 4,
            p: 4,
            mb: 4,
            boxShadow: "0 8px 32px rgba(2, 136, 209, 0.2)",
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: 3,
                bgcolor: alpha("#ffffff", 0.2),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SettingsIcon sx={{ fontSize: 32, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h3" fontWeight={800} color="white" gutterBottom>
                System Settings
              </Typography>
              <Typography variant="body1" sx={{ color: alpha("#ffffff", 0.9) }}>
                Configure your e-commerce platform settings
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Snackbars */}
        <Snackbar 
          open={!!successMessage} 
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          onClose={() => setSuccessMessage("")}
        >
          <Alert 
            severity="success" 
            icon={<CheckCircleIcon />}
            sx={{ 
              borderRadius: 3,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              fontWeight: 600,
            }}
          >
            {successMessage || "Success"}
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!error} 
          autoHideDuration={5000}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          onClose={() => setError("")}
        >
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: 3,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              fontWeight: 600,
            }}
          >
            {error}
          </Alert>
        </Snackbar>

        <Grid container spacing={3}>
          {/* Product Moderation Card */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                height: "100%",
                borderRadius: 4,
                background: "white",
                border: "1px solid",
                borderColor: alpha("#0288d1", 0.1),
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: `0 8px 24px ${alpha("#0288d1", 0.15)}`,
                  borderColor: alpha("#0288d1", 0.3),
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${alpha("#0288d1", 0.15)}, ${alpha("#0288d1", 0.05)})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <SecurityIcon sx={{ fontSize: 28, color: "#0288d1" }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="#0288d1">
                      Product Moderation
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Auto-approval settings
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha("#0288d1", 0.04),
                    mb: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoApproveProducts}
                        onChange={() => setAutoApproveProducts(!autoApproveProducts)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#0288d1",
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#0288d1",
                          },
                        }}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight={600}>Auto-approve Products</Typography>
                        {autoApproveProducts && (
                          <Chip 
                            label="Active" 
                            size="small" 
                            sx={{ 
                              bgcolor: alpha("#00897b", 0.1),
                              color: "#00897b",
                              fontWeight: 700,
                              fontSize: "0.7rem",
                            }} 
                          />
                        )}
                      </Box>
                    }
                    sx={{ m: 0, width: "100%" }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 6, display: "block", mt: 0.5 }}>
                    Automatically approve new products without review
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha("#0288d1", 0.04),
                    mt: 2,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1}>
                    Phí dịch vụ shipper (%)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={serviceFeePercent}
                    onChange={(e) => setServiceFeePercent(e.target.value)}
                    inputProps={{ min: 0, max: 100, step: 0.5 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    helperText="Trừ trên phí ship để trả cho hệ thống/shipper"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha("#0288d1", 0.04),
                    mt: 2,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600} color="text.secondary" mb={1}>
                    Phí dịch vụ người bán (%)
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={sellerServiceFeePercent}
                    onChange={(e) => setSellerServiceFeePercent(e.target.value)}
                    inputProps={{ min: 0, max: 100, step: 0.5 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    helperText="Trừ trên giá sản phẩm/đơn để thu phí nền tảng"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                      },
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: alpha("#0288d1", 0.04),
                    mt: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoApproveSellers}
                        onChange={() => setAutoApproveSellers(!autoApproveSellers)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#0288d1",
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#0288d1",
                          },
                        }}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight={600}>Auto-approve Sellers</Typography>
                        {autoApproveSellers && (
                          <Chip 
                            label="Active" 
                            size="small" 
                            sx={{ 
                              bgcolor: alpha("#00897b", 0.1),
                              color: "#00897b",
                              fontWeight: 700,
                              fontSize: "0.7rem",
                            }} 
                          />
                        )}
                      </Box>
                    }
                    sx={{ m: 0, width: "100%" }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 6, display: "block", mt: 0.5 }}>
                    Automatically approve seller registration requests
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Email SMTP Settings Card */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                height: "100%",
                borderRadius: 4,
                background: "white",
                border: "1px solid",
                borderColor: alpha("#0288d1", 0.1),
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: `0 8px 24px ${alpha("#0288d1", 0.15)}`,
                  borderColor: alpha("#0288d1", 0.3),
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${alpha("#0288d1", 0.15)}, ${alpha("#0288d1", 0.05)})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <EmailIcon sx={{ fontSize: 28, color: "#0288d1" }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="#0288d1">
                      Email Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      SMTP server settings
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" flexDirection="column" gap={2.5}>
                  <TextField
                    fullWidth
                    label="Admin Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover fieldset": {
                          borderColor: "#0288d1",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#0288d1",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#0288d1",
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="SMTP Server"
                    value={smtpServer}
                    onChange={(e) => setSmtpServer(e.target.value)}
                    variant="outlined"
                    placeholder="smtp.example.com"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover fieldset": {
                          borderColor: "#0288d1",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#0288d1",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#0288d1",
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="SMTP Port"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover fieldset": {
                          borderColor: "#0288d1",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#0288d1",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#0288d1",
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="SMTP Username"
                    value={smtpUsername}
                    onChange={(e) => setSmtpUsername(e.target.value)}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover fieldset": {
                          borderColor: "#0288d1",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#0288d1",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#0288d1",
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="SMTP Password / App Password"
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    variant="outlined"
                    autoComplete="new-password"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover fieldset": {
                          borderColor: "#0288d1",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#0288d1",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#0288d1",
                      },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#0288d1",
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#0288d1",
                          },
                        }}
                      />
                    }
                    label="Use secure connection (SSL/TLS)"
                    sx={{ ml: 0 }}
                  />
                  <TextField
                    fullWidth
                    label="Sender display name"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="QQ Store"
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        "&:hover fieldset": {
                          borderColor: "#0288d1",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#0288d1",
                        },
                      },
                      "& .MuiInputLabel-root.Mui-focused": {
                        color: "#0288d1",
                      },
                    }}
                    helperText="Hiển thị cùng email gửi đi"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {/* Announcement Broadcast Card */}
          <Grid size={{ xs: 12 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                background: "white",
                border: "1px solid",
                borderColor: alpha("#0288d1", 0.1),
                mt: 1,
              }}
            >
              <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${alpha("#ff9800", 0.2)}, ${alpha("#ff9800", 0.05)})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <EmailIcon sx={{ fontSize: 28, color: "#fb8c00" }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="#fb8c00">
                      Gửi thông báo toàn hệ thống
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gửi nhanh đến toàn bộ user, seller hoặc shipper
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Tiêu đề thông báo"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      select
                      fullWidth
                      label="Đối tượng nhận"
                      value={announcementAudience}
                      onChange={(e) =>
                        setAnnouncementAudience(e.target.value as AnnouncementAudience)
                      }
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    >
                      {AUDIENCE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={handleSendAnnouncement}
                      disabled={announcementLoading}
                      sx={{
                        height: "100%",
                        borderRadius: 3,
                        fontWeight: 700,
                        textTransform: "none",
                        background: "linear-gradient(135deg, #fb8c00 0%, #ef6c00 100%)",
                        "&:hover": {
                          background: "linear-gradient(135deg, #f57c00 0%, #e65100 100%)",
                        },
                        "&:disabled": {
                          background: alpha("#fb8c00", 0.3),
                        },
                      }}
                    >
                      {announcementLoading ? "Đang gửi..." : "Gửi thông báo"}
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      label="Nội dung thông báo"
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Grid>
                </Grid>

                <Box>
                  <Typography variant="subtitle1" fontWeight={700} mb={2}>
                    Lịch sử thông báo gần đây
                  </Typography>
                  {announcementHistory.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      Chưa có thông báo nào được gửi.
                    </Typography>
                  ) : (
                    <Box display="flex" flexDirection="column" gap={2}>
                      {announcementHistory.map((item) => {
                        const audienceLabel =
                          AUDIENCE_OPTIONS.find((opt) => opt.value === item.audience)?.label ||
                          "Không xác định";
                        return (
                          <Box
                            key={item._id}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              border: "1px solid",
                              borderColor: alpha("#0288d1", 0.15),
                              backgroundColor: alpha("#0288d1", 0.02),
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography fontWeight={700}>{item.title}</Typography>
                                <Chip label={audienceLabel} size="small" color="primary" />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(item.createdAt).toLocaleString()}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                              {item.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {`Số người nhận: ${item.metadata?.recipientCount ?? "-"}`}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Save Button */}
        <Box display="flex" justifyContent="flex-end" mt={4}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
            sx={{
              background: "linear-gradient(135deg, #0288d1 0%, #01579b 100%)",
              px: 5,
              py: 1.5,
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 700,
              fontSize: "1.1rem",
              boxShadow: "0 4px 12px rgba(2, 136, 209, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #0277bd 0%, #014a7f 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 6px 20px rgba(2, 136, 209, 0.4)",
              },
              "&:disabled": {
                background: alpha("#0288d1", 0.3),
              },
              transition: "all 0.3s ease",
            }}
          >
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default SettingsPage;