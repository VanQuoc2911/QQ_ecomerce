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
  Snackbar,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import axios, { type AxiosResponse } from "axios";
import React, { useEffect, useState } from "react";
import api from "../../api/axios";

interface SmtpSettings {
  email: string;
  smtpServer: string;
  smtpPort: number;
}

interface SystemSettings {
  autoApproveProducts: boolean;
  autoApproveSellers: boolean;
  smtp: SmtpSettings;
}

const SettingsPage: React.FC = () => {
  const [autoApproveProducts, setAutoApproveProducts] = useState<boolean>(false);
  const [autoApproveSellers, setAutoApproveSellers] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [smtpServer, setSmtpServer] = useState<string>("");
  const [smtpPort, setSmtpPort] = useState<string>("587");
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error(err.message);
        }
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const payload: Partial<SystemSettings> = {
        autoApproveProducts,
        autoApproveSellers,
        smtp: {
          email,
          smtpServer,
          smtpPort: Number(smtpPort),
        },
      };

      await api.post("/api/admin/settings", payload);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
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
          open={success} 
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          onClose={() => setSuccess(false)}
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
            Settings saved successfully!
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