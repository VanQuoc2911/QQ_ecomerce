import {
    Alert,
    Box,
    Button,
    Divider,
    FormControlLabel,
    Paper,
    Switch,
    TextField,
    Typography
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import React, { useState } from "react";

const SettingsPage: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [email, setEmail] = useState("");
  const [smtpServer, setSmtpServer] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setSuccess(true);

    const payload = {
      darkMode,
      autoApprove,
      smtp: {
        email,
        smtpServer,
        smtpPort: Number(smtpPort),
      },
    };

    console.log("Saving settings:", payload);

    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <Box>
      <Typography variant="h5" mb={2} fontWeight={700}>
        System Settings ⚙️
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          Saved successfully! 🚀
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography fontSize={18} fontWeight={600} mb={2}>
          Display Settings
        </Typography>
        <FormControlLabel
          control={<Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />}
          label="Enable Dark Mode 🌙"
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography fontSize={18} fontWeight={600} mb={2}>
          Product Moderation
        </Typography>
        <FormControlLabel
          control={<Switch checked={autoApprove} onChange={() => setAutoApprove(!autoApprove)} />}
          label="Auto-Approve New Products ✅"
        />
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography fontSize={18} fontWeight={600} mb={2}>
          Email SMTP Settings ✉️
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SMTP Server"
              value={smtpServer}
              onChange={(e) => setSmtpServer(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="SMTP Port"
              type="number"
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Button variant="contained" size="large" onClick={handleSave}>
        Save Settings ✅
      </Button>
    </Box>
  );
};

export default SettingsPage;
