import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ImageIcon from "@mui/icons-material/Image";
import LoyaltyRoundedIcon from "@mui/icons-material/LoyaltyRounded";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
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
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { sellerService, type Voucher } from "../../api/sellerService";

const AI_IMAGE_ENDPOINT = "https://image.pollinations.ai/prompt/";

const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "0₫";
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
  freeShipping?: boolean;
}) => {
  const { code, type, value, minOrderValue, highlightText, freeShipping } = params;
  const discountText = freeShipping
    ? "FREE SHIPPING toàn quốc"
    : type === "percent"
      ? `${value}% off mega sale`
      : `giảm ${formatCurrency(value)}`;
  const minText = freeShipping
    ? "focus on miễn phí vận chuyển, giao nhanh, icon xe tải"
    : minOrderValue
      ? `áp dụng cho đơn từ ${formatCurrency(minOrderValue)}`
      : "cho mọi đơn hàng";
  const parts = [
    "poster cho chương trình khuyến mãi thương mại điện tử QQ",
    `mã voucher ${code || "QQSALE"}`,
    discountText,
    minText,
    freeShipping
      ? "màu xanh dương neon, icon giao hàng, tia tốc độ, font đậm"
      : "phông nền gradient xanh dương neon, icon túi mua sắm, pháo giấy, font đậm",
    "illustration phong cách 3D futuristic, không có người, tỷ lệ ngang",
  ];
  if (highlightText) parts.push(`nhấn mạnh thông điệp: ${highlightText}`);
  return parts.join(", ");
};

const buildAiImageUrl = (prompt: string, seed?: number | string) => {
  const safePrompt = encodeURIComponent(prompt.trim());
  const suffix = `?width=640&height=360&nologo=true&seed=${seed ?? Date.now()}`;
  return `${AI_IMAGE_ENDPOINT}${safePrompt}${suffix}`;
};

const buildAiDescription = (params: {
  code?: string;
  type?: "amount" | "percent";
  value?: number;
  minOrderValue?: number;
  highlightText?: string;
  usageLimit?: number;
  expiresAt?: string | null;
  freeShipping?: boolean;
}) => {
  const segments: string[] = [];
  if (params.freeShipping) {
    if (params.code) {
      segments.push(`Mã ${params.code} tặng khách miễn phí vận chuyển khi mua sắm tại QQ Commerce.`);
    } else {
      segments.push("Sử dụng voucher freeship này để QQ Commerce chi trả toàn bộ phí giao hàng cho khách.");
    }
  } else {
    const discount = params.type === "percent" ? `${params.value ?? 0}%` : formatCurrency(params.value ?? 0);
    if (params.code) {
      segments.push(`Mã ${params.code} giúp khách tiết kiệm ${discount} khi thanh toán tại QQ Commerce.`);
    } else {
      segments.push(`Tiết kiệm ngay ${discount} khi nhập mã ưu đãi độc quyền trên QQ Commerce.`);
    }
  }

  if (params.highlightText?.trim()) {
    segments.push(params.highlightText.trim());
  }

  if (params.minOrderValue && params.minOrderValue > 0) {
    segments.push(`Áp dụng cho đơn hàng từ ${formatCurrency(params.minOrderValue)} trở lên để đảm bảo biên lợi nhuận.`);
  } else {
    segments.push("Không giới hạn giá trị đơn hàng, phù hợp cho mọi giỏ mua.");
  }

  if (params.usageLimit && params.usageLimit > 0) {
    segments.push(`Số lượt sử dụng có giới hạn (${params.usageLimit} suất), ưu tiên khách chốt đơn sớm.`);
  }

  if (params.expiresAt) {
    segments.push(`Hiệu lực đến ${formatDate(params.expiresAt)}, sau thời gian này hệ thống sẽ tự động khóa mã.`);
  } else {
    segments.push("Mã hiện không thiết lập hạn dùng, có thể tắt bất kỳ lúc nào để kiểm soát ngân sách.");
  }

  segments.push(
    params.freeShipping
      ? "Freeship do AI đề xuất giúp loại bỏ rào cản phí vận chuyển, cải thiện tỉ lệ chuyển đổi ở giai đoạn thanh toán."
      : "Mô tả được AI tối ưu nhằm tăng tỉ lệ chuyển đổi và đảm bảo trải nghiệm chuyên nghiệp cho người mua.",
  );
  return segments.join(" ");
};

const getVoucherPreviewUrl = (voucher: Voucher) => {
  const prompt = buildAiPrompt({
    code: voucher.code,
    type: voucher.type,
    value: voucher.value,
    minOrderValue: voucher.minOrderValue || undefined,
    highlightText: voucher.highlightText,
    freeShipping: voucher.freeShipping,
  });
  return buildAiImageUrl(prompt, hashCode(voucher._id || voucher.code));
};

const getVoucherDescription = (voucher: Voucher) =>
  voucher.aiDescription ||
  buildAiDescription({
    code: voucher.code,
    type: voucher.type,
    value: voucher.value,
    highlightText: voucher.highlightText,
    minOrderValue: voucher.minOrderValue || undefined,
    usageLimit: voucher.usageLimit || undefined,
    expiresAt: voucher.expiresAt || null,
    freeShipping: voucher.freeShipping,
  });

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
  const [freeShipping, setFreeShipping] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");

  const aiPrompt = useMemo(
    () =>
      buildAiPrompt({
        code,
        type,
        value,
        minOrderValue,
        highlightText,
        freeShipping,
      }),
    [code, type, value, minOrderValue, highlightText, freeShipping],
  );

  const aiDescriptionSuggestion = useMemo(
    () =>
      buildAiDescription({
        code,
        type,
        value,
        highlightText,
        minOrderValue,
        usageLimit,
        expiresAt: expiresAt || null,
        freeShipping,
      }),
    [code, type, value, highlightText, minOrderValue, usageLimit, expiresAt, freeShipping],
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
      [v.code, v.highlightText, v.type, v.aiDescription, v.freeShipping ? "freeship" : null]
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
    setFreeShipping(false);
    setEditingId(null);
    setAiPreviewUrl(null);
    setAiDescription("");
    setAiError(null);
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
      if (!freeShipping && value <= 0) {
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
        aiImageUrl: aiPreviewUrl || undefined,
        aiDescription: aiDescription.trim() || aiDescriptionSuggestion,
        freeShipping,
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
    setFreeShipping(Boolean(v.freeShipping));
    setAiPreviewUrl(v.aiImageUrl || getVoucherPreviewUrl(v));
    setAiDescription(v.aiDescription || getVoucherDescription(v));
    setFeedback({ type: "info", message: `Đang chỉnh sửa voucher ${v.code}` });
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
    setAiDescription(aiDescriptionSuggestion);
  };

  const handleCopyDescription = async () => {
    const text = aiDescription.trim() || aiDescriptionSuggestion;
    try {
      await navigator.clipboard?.writeText(text);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1800);
    } catch (err) {
      console.error(err);
    }
  };

  const renderVoucherCard = (voucher: Voucher) => {
    const usagePercent = voucher.usageLimit
      ? Math.min(100, Math.round(((voucher.usedCount || 0) / voucher.usageLimit) * 100))
      : null;
    const imageUrl = voucher.aiImageUrl || getVoucherPreviewUrl(voucher);
    const description = getVoucherDescription(voucher);
    return (
      <Grid item xs={12} sm={6} lg={4} key={voucher._id}>
        <Card
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            border: "1px solid rgba(37,99,235,0.15)",
            boxShadow: "0 25px 50px -30px rgba(15,23,42,0.4)",
          }}
        >
          <Box sx={{ position: "relative", height: 190, overflow: "hidden" }}>
            <Box
              component="img"
              src={imageUrl}
              alt={`AI banner for ${voucher.code}`}
              loading="lazy"
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=60";
              }}
            />
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(15,23,42,0.15) 0%, rgba(15,23,42,0.85) 100%)",
                color: "white",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                p: 2,
                gap: 0.5,
              }}
            >
              <Typography variant="caption" sx={{ letterSpacing: 1.5 }}>
                {voucher.code}
              </Typography>
              <Typography variant="h5" fontWeight={800}>
                {voucher.freeShipping
                  ? "FREE SHIPPING"
                  : voucher.type === "percent"
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
              {voucher.freeShipping && <Chip size="small" color="info" label="Free ship" />}
              {voucher.expiresAt && <Chip size="small" label={`Hết hạn ${formatDate(voucher.expiresAt)}`} />}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {description}
            </Typography>
            {voucher.freeShipping && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Voucher freeship: hệ thống sẽ miễn toàn bộ phí giao hàng cho người mua khi áp dụng mã này.
              </Typography>
            )}
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
              <Button variant="text" size="small" color="error" startIcon={<DeleteIcon fontSize="small" />} onClick={() => handleDelete(voucher)}>
                Xoá
              </Button>
            </Stack>
            <Tooltip title="Mở lại ảnh & mô tả AI">
              <IconButton
                size="small"
                onClick={() => {
                  setAiPreviewUrl(imageUrl);
                  setAiDescription(description);
                  setAiGenerating(false);
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
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #eff6ff 0%, #dbeafe 45%, #ffffff 95%)",
        py: { xs: 4, md: 6 },
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 5,
              background: "linear-gradient(125deg, rgba(37,99,235,0.96), rgba(14,165,233,0.9))",
              color: "#fff",
              boxShadow: "0 35px 80px -45px rgba(15,23,42,0.9)",
            }}
          >
            <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems={{ lg: "center" }}>
              <Stack spacing={1} flex={1}>
                <Typography variant="overline" sx={{ letterSpacing: 2, color: "#bfdbfe" }}>
                  Voucher Studio 2.0
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  Thiết kế, sinh ảnh AI và quản lý voucher tại một nơi
                </Typography>
                <Typography variant="body2" sx={{ color: "#e0f2fe" }}>
                  Hệ thống mới ghi nhớ banner AI và mô tả giúp hiển thị đồng nhất cho người mua.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  sx={{ color: "#e0f2fe", borderColor: "rgba(255,255,255,0.5)", textTransform: "none" }}
                  onClick={() => {
                    setAiPreviewUrl(null);
                    setAiDescription(aiDescriptionSuggestion);
                  }}
                >
                  Xoá preview
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AutoAwesomeIcon />}
                  sx={{
                    backgroundColor: "#1d4ed8",
                    textTransform: "none",
                    px: 3,
                    fontWeight: 600,
                    boxShadow: "0 18px 45px -20px rgba(15,23,42,0.8)",
                  }}
                  onClick={handleGenerateAiPreview}
                  disabled={aiGenerating}
                >
                  {aiGenerating ? "Đang tạo..." : "Sinh ảnh AI"}
                </Button>
              </Stack>
            </Stack>

            <Grid container spacing={2.5} mt={4}>
              {[
                {
                  label: "Tổng voucher",
                  value: stats.total,
                  icon: <LoyaltyRoundedIcon fontSize="large" />,
                  chip: `${stats.active} đang hoạt động`,
                },
                {
                  label: "Lượt sử dụng tối đa",
                  value: stats.active,
                  icon: <TrendingUpRoundedIcon fontSize="large" />,
                  chip: `${stats.total - stats.active} đã khoá`,
                },
                {
                  label: "Sắp hết hạn (7 ngày)",
                  value: stats.upcomingExpiry,
                  icon: <AccessTimeRoundedIcon fontSize="large" />,
                  chip: "Đặt lịch gia hạn",
                },
              ].map((card) => (
                <Grid item xs={12} md={4} key={card.label}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: 4,
                      backgroundColor: "rgba(15,23,42,0.2)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                      height: "100%",
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 54,
                          height: 54,
                          borderRadius: 3,
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: "rgba(255,255,255,0.15)",
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: "#bfdbfe" }}>
                          {card.label}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                          {card.value}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#dbeafe" }}>
                          {card.chip}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Grid container spacing={3} alignItems="stretch">
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, background: "#fff", border: "1px solid rgba(37,99,235,0.2)" }}>
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
                    disabled={freeShipping}
                  >
                    <MenuItem value="amount">Giảm tiền</MenuItem>
                    <MenuItem value="percent">Giảm %</MenuItem>
                  </TextField>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={freeShipping}
                        onChange={(_, checked) => {
                          setFreeShipping(checked);
                          if (checked) {
                            setType("amount");
                            setValue(0);
                            setMaxDiscount(undefined);
                          }
                        }}
                        color="primary"
                      />
                    }
                    label="Miễn phí vận chuyển (Free ship)"
                  />
                  {freeShipping && (
                    <Typography variant="caption" color="text.secondary">
                      Khi bật tuỳ chọn này, QQ Commerce sẽ miễn toàn bộ phí giao hàng khi khách áp dụng voucher này. Bạn vẫn có thể đặt điều kiện về đơn tối thiểu, lượt dùng và hạn.
                    </Typography>
                  )}
                  <TextField
                    label={type === "amount" ? "Giá trị (VND)" : "Giá trị (%)"}
                    type="number"
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    fullWidth
                    inputProps={{ min: 0 }}
                    disabled={freeShipping}
                    helperText={freeShipping ? "Voucher freeship không cần nhập giá trị giảm giá" : undefined}
                  />

                  {type === "percent" && !freeShipping && (
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
                    <Button variant="contained" color="primary" fullWidth onClick={handleCreate} disabled={saving}>
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
              <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid rgba(37,99,235,0.2)", background: "#fff", height: "100%" }}>
                <Stack spacing={2.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={700}>
                      Poster AI & mô tả
                    </Typography>
                    <Button variant="text" startIcon={<ContentCopyRoundedIcon />} onClick={handleCopyDescription} disabled={!aiPreviewUrl && !aiDescription}>
                      {copyStatus === "copied" ? "Đã sao chép" : "Copy mô tả"}
                    </Button>
                  </Stack>

                  <Box
                    sx={{
                      borderRadius: 4,
                      overflow: "hidden",
                      position: "relative",
                      minHeight: 280,
                      background: "linear-gradient(135deg,#dbeafe,#f5f7ff)",
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
                      <Stack alignItems="center" justifyContent="center" sx={{ position: "absolute", inset: 0, color: "text.secondary", textAlign: "center", px: 4 }} spacing={1}>
                        <ImageIcon fontSize="large" />
                        <Typography>Nhập thông tin voucher rồi chọn "Sinh ảnh AI" để xem gợi ý banner.</Typography>
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
                    <Alert severity="warning" onClose={() => setAiError(null)}>
                      {aiError}
                    </Alert>
                  )}

                  <TextField
                    label="Mô tả AI (tự sinh để hiển thị bên user)"
                    multiline
                    minRows={3}
                    maxRows={6}
                    value={aiDescription || aiDescriptionSuggestion}
                    onChange={(e) => setAiDescription(e.target.value)}
                  />

                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Prompt AI hiện tại:
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, fontFamily: "monospace", fontSize: 13, backgroundColor: "#fafbff" }}>
                      {aiPrompt}
                    </Paper>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Divider sx={{ borderColor: "rgba(37,99,235,0.2)" }} />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
            <Typography variant="h5" fontWeight={700}>
              Danh sách voucher ({filteredVouchers.length})
            </Typography>
            <TextField
              placeholder="Tìm theo mã hoặc mô tả"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: "#60a5fa" }} />
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
              <Typography color="text.secondary">Chưa có voucher nào phù hợp. Hãy tạo mã mới để thu hút người mua!</Typography>
            </Paper>
          ) : (
            <Grid container spacing={3} alignItems="stretch">
              {filteredVouchers.map((voucher) => renderVoucherCard(voucher))}
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
