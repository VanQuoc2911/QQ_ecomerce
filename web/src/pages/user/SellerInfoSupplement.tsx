import { Box, Button, TextField, Typography } from "@mui/material";
import { useState } from "react";

export default function SellerInfoSupplement() {
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // TODO: Call API to submit info for seller request id
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
    }, 1200);
  };

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 6, p: 3, boxShadow: 2, borderRadius: 2, bgcolor: "#fff" }}>
      <Typography variant="h5" fontWeight={800} mb={2}>
        Bổ sung thông tin đăng ký bán hàng
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Admin yêu cầu bạn bổ sung thêm thông tin cho yêu cầu đăng ký. Vui lòng nhập thông tin cần bổ sung bên dưới.
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Thông tin bổ sung"
          multiline
          minRows={3}
          fullWidth
          value={info}
          onChange={e => setInfo(e.target.value)}
          required
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" color="primary" disabled={submitting || success} fullWidth>
          {submitting ? "Đang gửi..." : success ? "Đã gửi thành công" : "Gửi bổ sung"}
        </Button>
      </form>
      {success && (
        <Typography color="success.main" mt={2}>
          Thông tin bổ sung đã được gửi thành công!
        </Typography>
      )}
    </Box>
  );
}