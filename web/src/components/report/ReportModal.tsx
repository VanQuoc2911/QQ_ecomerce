import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { createReport, type ReportRole, type ReportSeverity } from "../../api/reportService";
import { uploadService } from "../../api/uploadService";
import { extractReportErrorMessage, normalizeReportContext, type ReportModalContext } from "./reportHelpers";

interface Props {
  open: boolean;
  onClose: () => void;
  context?: Partial<ReportModalContext>;
}

const ReportModal = ({ open, onClose, context }: Props) => {
  const computedContext = useMemo(() => normalizeReportContext(context), [context]);
  const [form, setForm] = useState<ReportModalContext>(computedContext);
  const [loading, setLoading] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(computedContext);
    setUploadingEvidence(false);
  }, [open, computedContext]);

  const updateForm = <K extends keyof ReportModalContext>(field: K, value: ReportModalContext[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEvidenceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const remainingSlots = Math.max(0, 5 - (form.attachments?.length ?? 0));
    if (remainingSlots === 0) {
      toast.info("Bạn đã đạt giới hạn 5 hình ảnh minh chứng");
      event.target.value = "";
      return;
    }
    setUploadingEvidence(true);
    try {
      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const uploadedUrls = await uploadService.uploadFiles(filesToUpload);
      setForm((prev) => ({
        ...prev,
        attachments: [...(prev.attachments ?? []), ...uploadedUrls],
      }));
      toast.success("Đã tải lên minh chứng");
    } catch (err: unknown) {
      toast.error(extractReportErrorMessage(err));
    } finally {
      setUploadingEvidence(false);
      event.target.value = "";
    }
  };

  const handleRemoveAttachment = (url: string) => {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments ?? []).filter((item) => item !== url),
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.warning("Vui lòng điền tiêu đề và mô tả");
      return;
    }
    setLoading(true);
    try {
      const metadataPayload: Record<string, unknown> = {
        ...(form.metadata ?? {}),
      };
      if ((form.attachments?.length ?? 0) > 0) {
        metadataPayload.attachments = form.attachments;
      }
      await createReport({
        title: form.title.trim(),
        description: form.description.trim(),
        reportedRole: form.role,
        severity: form.severity,
        category: form.category,
        relatedType: form.relatedType,
        relatedId: form.relatedId,
        metadata: Object.keys(metadataPayload).length ? metadataPayload : undefined,
      });
      toast.success("Gửi khiếu nại thành công");
      setForm(normalizeReportContext());
      onClose();
    } catch (err: unknown) {
      toast.error(extractReportErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Khiếu nại / Báo cáo</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
          <TextField label="Tiêu đề" value={form.title} onChange={(e) => updateForm("title", e.target.value)} fullWidth />
          <TextField label="Mô tả" value={form.description} onChange={(e) => updateForm("description", e.target.value)} fullWidth multiline minRows={4} />

          <FormControl fullWidth>
            <InputLabel id="reported-role-label">Đối tượng</InputLabel>
            <Select labelId="reported-role-label" value={form.role} label="Đối tượng" onChange={(e) => updateForm("role", e.target.value as ReportRole)}>
              <MenuItem value="user">Người dùng</MenuItem>
              <MenuItem value="seller">Người bán</MenuItem>
              <MenuItem value="shipper">Shipper</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="severity-label">Mức độ</InputLabel>
            <Select labelId="severity-label" value={form.severity} label="Mức độ" onChange={(e) => updateForm("severity", e.target.value as ReportSeverity)}>
              <MenuItem value="low">Thấp</MenuItem>
              <MenuItem value="medium">Trung bình</MenuItem>
              <MenuItem value="high">Cao</MenuItem>
              <MenuItem value="critical">Nghiêm trọng</MenuItem>
            </Select>
          </FormControl>

          <TextField label="Danh mục (tùy chọn)" value={form.category} onChange={(e) => updateForm("category", e.target.value)} fullWidth />

          <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              <Button
                component="label"
                startIcon={<CloudUploadRoundedIcon />}
                variant="outlined"
                disabled={uploadingEvidence}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                {uploadingEvidence ? "Đang tải lên..." : "Tải hình minh chứng"}
                <input type="file" accept="image/*" multiple hidden onChange={handleEvidenceUpload} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                Tối đa 5 ảnh • Định dạng JPG, PNG
              </Typography>
            </Stack>
            {!!(form.attachments?.length) && (
              <Stack direction="row" spacing={1.5} flexWrap="wrap" mt={2}>
                {(form.attachments ?? []).map((url) => (
                  <Box
                    key={url}
                    sx={{
                      position: "relative",
                      width: 96,
                      height: 72,
                      borderRadius: 2,
                      overflow: "hidden",
                      boxShadow: "0 4px 12px rgba(15,23,42,0.15)",
                    }}
                  >
                    <Box component="img" src={url} alt="Minh chứng" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveAttachment(url)}
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        bgcolor: "rgba(15,23,42,0.6)",
                        color: "#fff",
                        '&:hover': { bgcolor: "rgba(15,23,42,0.85)" },
                      }}
                    >
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Huỷ</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Đang gửi..." : "Gửi khiếu nại"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportModal;
