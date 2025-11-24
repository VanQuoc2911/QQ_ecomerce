import { Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { uploadService } from "../../api/uploadService";
import { userService } from "../../api/userService";
import { useAuth } from "../../context/AuthContext";

export default function RequestSeller() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shopName: "",
    logo: "",
    address: "",
    phone: "",
    website: "",
    businessLicenseUrl: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleChange = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleFileUpload = async (fieldName: "logo" | "businessLicenseUrl", files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await uploadService.uploadFiles(Array.from(files));
      if (urls.length > 0) {
        setForm((s) => ({ ...s, [fieldName]: urls[0] }));
        toast.success("Tải tệp lên thành công");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Tải tệp lên thất bại");
      } else {
        toast.error("Tải tệp lên thất bại");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return toast.warning("Vui lòng đăng nhập trước khi gửi yêu cầu");
    if (!form.shopName || !form.logo) return toast.warning("Vui lòng điền tên cửa hàng và logo");
    setLoading(true);
    try {
      const res = await userService.requestSeller(form);
      toast.success(res.message || "Gửi yêu cầu thành công");
      navigate("/profile");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message || "Gửi yêu cầu thất bại");
      } else {
        toast.error("Gửi yêu cầu thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={720} mx="auto" p={2}>
      <Typography variant="h5" mb={2}>
        Yêu cầu trở thành người bán
      </Typography>

      <TextField
        fullWidth
        label="Tên cửa hàng"
        margin="normal"
        value={form.shopName}
        onChange={(e) => handleChange("shopName", e.target.value)}
        disabled={loading || uploading}
      />

      <Box mb={2}>
        <Typography variant="body2" mb={1}>
          Logo cửa hàng
        </Typography>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload("logo", e.target.files)}
          disabled={uploading}
        />
        {form.logo && (
          <Box mt={1}>
            <img src={form.logo} alt="logo" style={{ maxWidth: "100px", maxHeight: "100px" }} />
          </Box>
        )}
      </Box>

      <TextField
        fullWidth
        label="Địa chỉ"
        margin="normal"
        value={form.address}
        onChange={(e) => handleChange("address", e.target.value)}
        disabled={loading || uploading}
      />
      <TextField
        fullWidth
        label="Số điện thoại"
        margin="normal"
        value={form.phone}
        onChange={(e) => handleChange("phone", e.target.value)}
        disabled={loading || uploading}
      />
      <TextField
        fullWidth
        label="Website"
        margin="normal"
        value={form.website}
        onChange={(e) => handleChange("website", e.target.value)}
        disabled={loading || uploading}
      />

      <Box mb={2}>
        <Typography variant="body2" mb={1}>
          Giấy phép kinh doanh
        </Typography>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => handleFileUpload("businessLicenseUrl", e.target.files)}
          disabled={uploading}
        />
        {form.businessLicenseUrl && (
          <Box mt={1}>
            <a href={form.businessLicenseUrl} target="_blank" rel="noopener noreferrer">
              Xem giấy phép
            </a>
          </Box>
        )}
      </Box>

      <TextField
        fullWidth
        label="Mô tả"
        margin="normal"
        multiline
        rows={4}
        value={form.description}
        onChange={(e) => handleChange("description", e.target.value)}
        disabled={loading || uploading}
      />

      <Box mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading || uploading}
          startIcon={loading || uploading ? <CircularProgress size={20} /> : undefined}
        >
          {uploading ? "Đang tải..." : loading ? "Đang gửi..." : "Gửi yêu cầu"}
        </Button>
      </Box>
    </Box>
  );
}
