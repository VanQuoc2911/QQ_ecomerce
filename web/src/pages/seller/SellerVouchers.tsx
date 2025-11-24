import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { sellerService, type Voucher } from "../../api/sellerService";

const AI_IMAGE_ENDPOINT = "https://image.pollinations.ai/prompt/";

const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number") return "0₫";
  return `${value.toLocaleString("vi-VN")}₫`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Không giới hạn";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const hashCode = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildAiPrompt = (params: {
  code?: string;
  type: "amount" | "percent";
  value: number;
  minOrderValue?: number;
  highlightText?: string;
}) => {
  const { code, type, value, minOrderValue, highlightText } = params;
  const discountText =
    type === "percent" ? `${value}% off mega sale` : `giảm ${formatCurrency(value)}`;
  const minText = minOrderValue
    ? `áp dụng cho đơn từ ${formatCurrency(minOrderValue)}`
    : "cho mọi đơn hàng";
  const parts = [
    "poster cho sự kiện khuyến mãi thương mại điện tử QQ",
    `mã voucher ${code || "QQSALE"}`,
    discountText,
    minText,
    "phông nền gradient neon, icon túi mua sắm, pháo giấy, font đậm",
    "illustration theo phong cách 3D vaporwave, không có người, tỷ lệ ngang",
  ];
  if (highlightText) parts.push(`nhấn mạnh thông điệp: ${highlightText}`);
  return parts.join(", ");
};

const buildAiImageUrl = (prompt: string, seed?: number | string) => {
  const safePrompt = encodeURIComponent(prompt.trim());
  const suffix = `?width=640&height=360&nologo=true&seed=${seed ?? Date.now()}`;
  return `${AI_IMAGE_ENDPOINT}${safePrompt}${suffix}`;
};

const getVoucherPreviewUrl = (voucher: Voucher) => {
  const prompt = buildAiPrompt({
    code: voucher.code,
    type: voucher.type,
    value: voucher.value,
    minOrderValue: voucher.minOrderValue || undefined,
    highlightText: voucher.highlightText,
  });
  return buildAiImageUrl(prompt, hashCode(voucher._id || voucher.code));
};

export default function SellerVouchers() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"amount" | "percent">("amount");
  const [value, setValue] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<number | undefined>(undefined);
  const [minOrderValue, setMinOrderValue] = useState<number | undefined>(undefined);
  const [usageLimit, setUsageLimit] = useState<number | undefined>(undefined);
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);
  const [highlightText, setHighlightText] = useState("");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const aiPrompt = useMemo(
    () =>
      buildAiPrompt({
        code,
        type,
        value,
        minOrderValue,
        highlightText,
      }),
    [code, type, value, minOrderValue, highlightText],
  );

  const stats = useMemo(() => {
    const total = vouchers.length;
    const active = vouchers.filter((v) => v.active !== false).length;
    const upcomingExpiry = vouchers.filter((v) => {
      if (!v.expiresAt) return false;
      const diff = new Date(v.expiresAt).getTime() - Date.now();
      const days = diff / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7;
    }).length;
    return { total, active, upcomingExpiry };
  }, [vouchers]);

  const filteredVouchers = useMemo(() => {
    if (!searchTerm.trim()) return vouchers;
    const keyword = searchTerm.toLowerCase();
    return vouchers.filter((v) =>
      [v.code, v.highlightText, v.type]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(keyword)),
    );
  }, [searchTerm, vouchers]);

  useEffect(() => {
    (async () => {
      try {
        setFetching(true);
        const shop = await sellerService.getShopInfo();
        setShopId(shop._id);
        const list = await sellerService.getMyVouchers();
        setVouchers(list || []);
      } catch (err) {
        console.error(err);
        setFeedback({ type: "error", message: "Không thể tải danh sách voucher" });
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  const resetForm = () => {
    setCode("");
    setType("amount");
    setValue(0);
    setMaxDiscount(undefined);
    setMinOrderValue(undefined);
    setUsageLimit(undefined);
    setExpiresAt(undefined);
    setHighlightText("");
    setEditingId(null);
    setAiPreviewUrl(null);
    setFeedback(null);
  };

  const refreshVouchers = async () => {
    try {
      const list = await sellerService.getMyVouchers();
      setVouchers(list || []);
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Không thể đồng bộ voucher" });
    }
  };

  const handleCreate = async () => {
    try {
      if (!code.trim()) {
        setFeedback({ type: "info", message: "Vui lòng nhập mã voucher" });
        return;
      }
      if (value <= 0) {
        setFeedback({ type: "info", message: "Giá trị ưu đãi phải lớn hơn 0" });
        return;
      }

      setSaving(true);
      setFeedback(null);
      const payload = {
        code: code.trim().toUpperCase(),
        type,
        value,
        maxDiscount,
        minOrderValue,
        usageLimit,
        expiresAt,
        shopId: shopId ?? undefined,
        highlightText: highlightText.trim() || undefined,
      };

      if (editingId) {
        const updated = await sellerService.updateVoucher(editingId, payload);
        setVouchers((prev) => prev.map((v) => (String(v._id) === String(editingId) ? updated : v)));
        setFeedback({ type: "success", message: `Voucher ${payload.code} đã được cập nhật.` });
      } else {
        await sellerService.createVoucher(payload);
        await refreshVouchers();
        setFeedback({ type: "success", message: `Đã tạo voucher ${payload.code}!` });
      }

      resetForm();
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Không thể lưu voucher. Vui lòng thử lại!" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: Voucher) => {
    setEditingId(String(v._id));
    setCode(v.code || "");
    setType(v.type || "amount");
    setValue(v.value ?? 0);
    setMaxDiscount(v.maxDiscount ?? undefined);
    setMinOrderValue(v.minOrderValue ?? undefined);
    setUsageLimit(v.usageLimit ?? undefined);
    setHighlightText(v.highlightText || "");
    setExpiresAt(v.expiresAt ? new Date(v.expiresAt).toISOString().slice(0, 10) : undefined);
    setFeedback({ type: "info", message: `Đang chỉnh sửa voucher ${v.code}` });
    setAiPreviewUrl(getVoucherPreviewUrl(v));
  };

  const handleDelete = async (v: Voucher) => {
    const ok = window.confirm(`Xoá voucher ${v.code}?`);
    if (!ok) return;
    try {
      await sellerService.deleteVoucher(String(v._id));
      setVouchers((prev) => prev.filter((p) => String(p._id) !== String(v._id)));
      setFeedback({ type: "success", message: `Đã xoá ${v.code}` });
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", message: "Xoá voucher thất bại" });
    }
  };

  const handleGenerateAiPreview = () => {
    if (!code.trim()) {
      setAiError("Nhập mã voucher trước khi tạo ảnh");
      return;
    }
    setAiError(null);
    setAiGenerating(true);
    const nextUrl = buildAiImageUrl(aiPrompt, Date.now());
    setAiPreviewUrl(nextUrl);
  };

  const renderVoucherCard = (voucher: Voucher) => {
    const usagePercent = voucher.usageLimit
      ? Math.min(100, Math.round(((voucher.usedCount || 0) / voucher.usageLimit) * 100))
      : null;
    const imageUrl = getVoucherPreviewUrl(voucher);
    return (
      <Grid item xs={12} sm={6} lg={4} key={voucher._id}>
        <Card sx={{ borderRadius: 4, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ position: "relative", height: 170, overflow: "hidden" }}>
            <Box
              component="img"
              src={imageUrl}
              alt={`AI banner for ${voucher.code}`}
              loading="lazy"
              sx={{ width: "100%", height: "100%", objectFit: "cover", filter: "saturate(1.05)" }}
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=60";
              }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.65) 100%)",
                color: "white",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                p: 2,
              }}
            >
              <Typography variant="subtitle2">{voucher.code}</Typography>
              <Typography variant="h5" fontWeight={800}>
                {voucher.type === "percent"
                  ? `${voucher.value}% OFF`
                  : `-${formatCurrency(voucher.value)}`}
              </Typography>
              {voucher.highlightText && (
                <Typography variant="body2" color="grey.100">
                  {voucher.highlightText}
                </Typography>
              )}
            </Box>
          </Box>
          <CardContent sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1} mb={1} alignItems="center" flexWrap="wrap">
              <Chip size="small" color={voucher.type === "percent" ? "secondary" : "primary"} label={voucher.type === "percent" ? "Phần trăm" : "Số tiền"} />
              <Chip size="small" color={voucher.active === false ? "default" : "success"} label={voucher.active === false ? "Đã khoá" : "Hoạt động"} />
              {voucher.expiresAt && <Chip size="small" label={`Hết hạn ${formatDate(voucher.expiresAt)}`} />}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Đơn tối thiểu: {voucher.minOrderValue ? formatCurrency(voucher.minOrderValue) : "Không"}
            </Typography>
            {voucher.maxDiscount && voucher.type === "percent" && (
              <Typography variant="body2" color="text.secondary">
                Giảm tối đa: {formatCurrency(voucher.maxDiscount)}
              </Typography>
            )}
            {usagePercent !== null && (
              <Box sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption">Số lượt dùng</Typography>
                  <Typography variant="caption">
                    {voucher.usedCount || 0}/{voucher.usageLimit}
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={usagePercent} sx={{ borderRadius: 99, height: 6 }} />
              </Box>
            )}
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => handleEdit(voucher)}>
                Sửa
              </Button>
              <Button
                variant="text"
                size="small"
                color="error"
                startIcon={<DeleteIcon fontSize="small" />}
                onClick={() => handleDelete(voucher)}
              >
                Xoá
              </Button>
            </Stack>
            <Tooltip title="Xem ảnh AI ở preview">
              <IconButton
                size="small"
                onClick={() => {
                  setAiPreviewUrl(imageUrl);
                  setAiGenerating(true);
                }}
              >
                <ImageIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  return (
    <Box sx={{ background: "#f4f7fb", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 4,
            background: "radial-gradient(circle at top, #e3f2fd, #f4f7fb 60%)",
          }}
        >
          <Stack spacing={1} alignItems="flex-start">
            <Chip label="Voucher Studio" color="primary" variant="outlined" />
            <Typography variant="h4" fontWeight={800}>
              Thiết kế voucher sinh động bằng AI
            </Typography>
            <Typography color="text.secondary" maxWidth={600}>
              Tạo mã giảm giá, xem preview poster AI và quản lý toàn bộ voucher của cửa hàng trong một màn hình duy nhất.
            </Typography>
          </Stack>

          <Grid container spacing={2} sx={{ mt: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e3f2fd" }}>
                <Typography variant="h6">Tổng voucher</Typography>
                <Typography variant="h3" fontWeight={800}>{stats.total}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Bao gồm {stats.active} đang hoạt động
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e3f2fd" }}>
                <Typography variant="h6">Đang hoạt động</Typography>
                <Typography variant="h3" fontWeight={800} color="success.main">
                  {stats.active}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.total - stats.active} voucher đã khoá
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e3f2fd" }}>
                <Typography variant="h6">Sắp hết hạn (7 ngày)</Typography>
                <Typography variant="h3" fontWeight={800} color="warning.main">
                  {stats.upcomingExpiry}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Chủ động gia hạn hoặc tạo mã mới
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 4, height: "100%" }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={700}>
                  {editingId ? "Cập nhật voucher" : "Tạo voucher mới"}
                </Typography>
                {editingId && (
                  <Button startIcon={<RestartAltIcon />} onClick={resetForm} variant="text">
                    Huỷ chỉnh sửa
                  </Button>
                )}
              </Stack>

              <Stack spacing={2}>
                <TextField label="Mã voucher" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} fullWidth />
                <TextField
                  select
                  label="Loại"
                  value={type}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    setType(event.target.value as "amount" | "percent")
                  }
                  fullWidth
                >
                  <MenuItem value="percent">Giảm %</MenuItem>
                </TextField>
                <TextField
                  label={type === "amount" ? "Giá trị (VND)" : "Giá trị (%)"}
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  fullWidth
                  inputProps={{ min: 0 }}
                />

                {type === "percent" && (
                  <TextField
                    label="Giảm tối đa (VND)"
                    type="number"
                    value={maxDiscount ?? ""}
                    onChange={(e) => setMaxDiscount(e.target.value ? Number(e.target.value) : undefined)}
                    fullWidth
                  />
                )}

                <TextField
                  label="Đơn tối thiểu (VND)"
                  type="number"
                  value={minOrderValue ?? ""}
                  onChange={(e) => setMinOrderValue(e.target.value ? Number(e.target.value) : undefined)}
                  fullWidth
                />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Số lượt sử dụng (0 = không giới hạn)"
                      type="number"
                      value={usageLimit ?? ""}
                      onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : undefined)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Ngày hết hạn"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={expiresAt ?? ""}
                      onChange={(e) => setExpiresAt(e.target.value || undefined)}
                      fullWidth
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Thông điệp nổi bật (hiển thị trên banner)"
                  value={highlightText}
                  onChange={(e) => setHighlightText(e.target.value)}
                  fullWidth
                />

                {feedback && (
                  <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
                    {feedback.message}
                  </Alert>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleCreate}
                    disabled={saving}
                  >
                    {saving ? <CircularProgress size={20} color="inherit" /> : editingId ? "Lưu thay đổi" : "Tạo voucher"}
                  </Button>
                  <Button variant="outlined" color="inherit" fullWidth onClick={resetForm} startIcon={<RestartAltIcon />}>
                    Đặt lại
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 4, height: "100%" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>
                  Preview poster AI
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleGenerateAiPreview}
                  disabled={aiGenerating}
                >
                  {aiGenerating ? "Đang tạo..." : "Tạo ảnh AI"}
                </Button>
              </Stack>

              <Box
                sx={{
                  borderRadius: 4,
                  overflow: "hidden",
                  position: "relative",
                  minHeight: 260,
                  background: "linear-gradient(135deg,#cfd9ff,#f5f7ff)",
                  mb: 2,
                }}
              >
                {aiPreviewUrl ? (
                  <Box
                    component="img"
                    src={aiPreviewUrl}
                    alt="AI voucher preview"
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onLoad={() => setAiGenerating(false)}
                    onError={() => {
                      setAiGenerating(false);
                      setAiError("Không tải được ảnh AI, thử lại nhé!");
                      setAiPreviewUrl(null);
                    }}
                  />
                ) : (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      color: "text.secondary",
                      textAlign: "center",
                      px: 4,
                    }}
                    spacing={1}
                  >
                    <ImageIcon fontSize="large" />
                    <Typography>
                      Nhập thông tin voucher rồi nhấn "Tạo ảnh AI" để xem gợi ý banner.
                    </Typography>
                  </Stack>
                )}
                {aiGenerating && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(0,0,0,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CircularProgress sx={{ color: "white" }} />
                  </Box>
                )}
              </Box>

              {aiError && (
                <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setAiError(null)}>
                  {aiError}
                </Alert>
              )}

              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  Prompt AI:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, fontFamily: "monospace", fontSize: 13, backgroundColor: "#fafbff" }}>
                  {aiPrompt}
                </Paper>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            Danh sách voucher ({filteredVouchers.length})
          </Typography>
          <TextField
            placeholder="Tìm theo mã, mô tả"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <ImageIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", md: 320 } }}
          />
        </Stack>

        {fetching ? (
          <Stack spacing={2}>
            {[1, 2, 3].map((key) => (
              <Paper key={key} sx={{ p: 3, borderRadius: 3 }}>
                <LinearProgress />
              </Paper>
            ))}
          </Stack>
        ) : filteredVouchers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 4 }}>
            <Typography color="text.secondary">
              Chưa có voucher nào phù hợp. Hãy tạo mã mới để thu hút người mua!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3} alignItems="stretch">
            {filteredVouchers.map((voucher) => renderVoucherCard(voucher))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
