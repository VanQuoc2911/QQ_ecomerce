// src/seller/pages/SellerShopInfo.tsx
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import LanguageIcon from "@mui/icons-material/Language";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LogoutIcon from "@mui/icons-material/Logout";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import PhoneIcon from "@mui/icons-material/Phone";
import SaveIcon from "@mui/icons-material/Save";
import StoreIcon from "@mui/icons-material/Store";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useEffect, useState, type ReactNode } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { sellerService, type ShopInfo } from "../../api/sellerService";
import { useAuth } from "../../context/AuthContext";

type SectionCardProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

const SectionCard = ({ icon, title, subtitle, children }: SectionCardProps) => (
  <Box
    sx={{
      p: { xs: 2.5, md: 3 },
      borderRadius: 3,
      border: '1px solid rgba(102, 126, 234, 0.15)',
      backgroundColor: '#fff',
      boxShadow: '0 12px 40px rgba(15, 23, 56, 0.08)',
    }}
  >
    <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 2,
          background: 'linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#667eea',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Box>
);

export default function SellerShopInfo() {
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [initialShop, setInitialShop] = useState<ShopInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dialogGpsLoading, setDialogGpsLoading] = useState(false);
  const [pinnedAddressText, setPinnedAddressText] = useState("");
  const [pinnedAddressLoading, setPinnedAddressLoading] = useState(false);
  const [tempAddressText, setTempAddressText] = useState("");
  const [tempAddressLoading, setTempAddressLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    sellerService
      .getShopInfo()
      .then((d) => {
        setShop(d);
        setInitialShop(d);
        setLoading(false);
      })
      .catch((e) => {
        console.error("getShopInfo", e);
        setShop(null);
        setInitialShop(null);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!shop || !isEditing) return;
    try {
      setSaving(true);
      await sellerService.updateShopInfo(shop);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
      setInitialShop({ ...shop });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("❌ Lỗi khi lưu thông tin");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditing = () => {
    if (!shop) return;
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (!isEditing) return;
    if (initialShop) {
      setShop({ ...initialShop });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/home");
    } catch (err) {
      console.error("Logout failed:", err);
      alert("❌ Lỗi khi đăng xuất");
    }
  };

  useEffect(() => {
    if (!mapDialogOpen) return;
    if (shop?.lat && shop?.lng) {
      setTempCoords({ lat: shop.lat, lng: shop.lng });
    } else {
      setTempCoords(null);
    }
  }, [mapDialogOpen, shop?.lat, shop?.lng]);

  const fetchLocationName = async (lat: number, lng: number) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`
    );
    const data = await response.json();
    return (data?.display_name as string | undefined) ?? "";
  };

  const requestGpsCoordinates = (
    onSuccess: (lat: number, lng: number) => void,
    setLoadingState: (value: boolean) => void,
  ) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ GPS");
      return;
    }
    setLoadingState(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onSuccess(latitude, longitude);
        setLoadingState(false);
      },
      (error) => {
        console.error("GPS error", error);
        alert("Không thể lấy vị trí GPS. Vui lòng thử lại hoặc bật GPS.");
        setLoadingState(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClearLocation = () => {
    if (!isEditing) return;
    setShop((prev) => (prev ? { ...prev, lat: null, lng: null } : prev));
    setPinnedAddressText("");
  };

  const handleSaveLocation = () => {
    if (!isEditing) {
      setMapDialogOpen(false);
      return;
    }
    if (tempCoords) {
      const resolvedAddress = tempAddressText.trim();
      setShop((prev) =>
        prev
          ? {
              ...prev,
              lat: tempCoords.lat,
              lng: tempCoords.lng,
              address: resolvedAddress || prev.address,
            }
          : prev,
      );
      if (resolvedAddress) {
        setPinnedAddressText(resolvedAddress);
      }
    }
    setMapDialogOpen(false);
  };

  const handleMapGps = () => {
    if (!isEditing) return;
    requestGpsCoordinates(
      (latitude, longitude) => {
        setTempCoords({ lat: latitude, lng: longitude });
      },
      setDialogGpsLoading,
    );
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setTempCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    if (!tempCoords) return null;
    return <Marker position={[tempCoords.lat, tempCoords.lng]} />;
  };

  useEffect(() => {
    if (!shop?.lat || !shop?.lng) {
      setPinnedAddressText("");
      setPinnedAddressLoading(false);
      return;
    }
    let cancelled = false;
    setPinnedAddressLoading(true);
    fetchLocationName(shop.lat, shop.lng)
      .then((name) => {
        if (!cancelled) {
          setPinnedAddressText(name);
        }
      })
      .catch((err) => {
        console.error("reverse geocode shop", err);
        if (!cancelled) setPinnedAddressText("");
      })
      .finally(() => {
        if (!cancelled) setPinnedAddressLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shop?.lat, shop?.lng]);

  useEffect(() => {
    if (!tempCoords) {
      setTempAddressText("");
      setTempAddressLoading(false);
      return;
    }
    let cancelled = false;
    setTempAddressLoading(true);
    fetchLocationName(tempCoords.lat, tempCoords.lng)
      .then((name) => {
        if (!cancelled) {
          setTempAddressText(name);
        }
      })
      .catch((err) => {
        console.error("reverse geocode temp", err);
        if (!cancelled) setTempAddressText("");
      })
      .finally(() => {
        if (!cancelled) setTempAddressLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tempCoords]);

  useEffect(() => {
    if (!isEditing) {
      setMapDialogOpen(false);
      setTempCoords(null);
    }
  }, [isEditing]);


  if (loading) {
    return (
      <Box 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="60vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress sx={{ color: '#667eea' }} size={48} />
        <Typography color="text.secondary">Đang tải thông tin cửa hàng...</Typography>
      </Box>
    );
  }

  if (!shop) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Không thể tải thông tin cửa hàng. Vui lòng thử lại sau.
        </Alert>
      </Box>
    );
  }

  const infoComplete = Boolean(shop.shopName && shop.address && shop.phone);
  const locationReady = Boolean(shop.lat && shop.lng);
  const completionSlots = [Boolean(shop.logo), Boolean(shop.description), Boolean(shop.website), locationReady, infoComplete];
  const completionPercent = Math.round(
    (completionSlots.filter(Boolean).length / completionSlots.length) * 100,
  );
  const editHint = isEditing
    ? "Bạn đang ở chế độ chỉnh sửa. Đừng quên lưu lại các thay đổi."
    : "Nhấn \"Chỉnh sửa thông tin\" để cập nhật hồ sơ cửa hàng của bạn.";
  const locationStatusLabel = locationReady ? 'Đã ghim vị trí cửa hàng' : 'Chưa ghim vị trí cửa hàng';
  const quickFacts = [
    { label: 'Tên thương hiệu', value: shop.shopName || 'Chưa cập nhật' },
    { label: 'Địa điểm hiển thị', value: pinnedAddressText || shop.address || 'Chưa xác định' },
    { label: 'Chế độ', value: isEditing ? 'Đang chỉnh sửa' : 'Đang xem trước' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        p: { xs: 2, md: 4 },
        background: 'linear-gradient(180deg,#f6f8ff 0%,#ffffff 50%,#f6f8ff 100%)',
        backgroundImage:
          'radial-gradient(circle at 10% 15%, rgba(102,126,234,0.18), transparent 40%), radial-gradient(circle at 80% 5%, rgba(118,75,162,0.15), transparent 35%)',
      }}
    >
      <Box
        sx={{
          mb: 4,
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(9,18,54,0.95), rgba(76,56,196,0.92))',
          color: '#fff',
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          alignItems: 'stretch',
          boxShadow: '0 35px 90px rgba(12,22,73,0.45)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box flex={1} position="relative" zIndex={1}>
          <Typography variant="overline" sx={{ letterSpacing: 3, opacity: 0.7 }}>
            Trang quản lý thương hiệu
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
            Làm mới hồ sơ cửa hàng của bạn
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, mt: 1.5 }}>
            Hoàn thiện thông tin giúp khách hàng hiểu rõ hơn về thương hiệu và tăng niềm tin khi mua sắm.
          </Typography>
          <Box mt={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                Mức độ hoàn thiện hồ sơ
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {completionPercent}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={completionPercent}
              sx={{
                height: 10,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg,#ffce65,#ff8a65)',
                },
              }}
            />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} mt={2.5}>
            <Chip
              label={infoComplete ? 'Thông tin cơ bản đầy đủ' : 'Cần bổ sung thông tin cơ bản'}
              color={infoComplete ? 'success' : 'warning'}
              variant={infoComplete ? 'filled' : 'outlined'}
            />
            <Chip
              label={locationStatusLabel}
              color={locationReady ? 'success' : 'default'}
              variant={locationReady ? 'filled' : 'outlined'}
            />
            <Chip
              label={isEditing ? 'Đang chỉnh sửa' : 'Chế độ xem trước'}
              color={isEditing ? 'info' : 'default'}
              variant="outlined"
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mt={2.5}>
            {quickFacts.map((fact) => (
              <Box
                key={fact.label}
                sx={{
                  flex: 1,
                  px: 2,
                  py: 1.5,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.25)',
                  backgroundColor: 'rgba(5,10,40,0.45)',
                }}
              >
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {fact.label}
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {fact.value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
        <Stack spacing={2} width={{ xs: '100%', lg: 320 }} position="relative" zIndex={1}>
          <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={1.2}>
            {isEditing ? (
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={handleCancelEdit}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.5)',
                }}
              >
                Đóng chỉnh sửa
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={<EditIcon />}
                onClick={handleStartEditing}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  background: 'linear-gradient(120deg,#ffd465,#ff8a65)',
                  boxShadow: '0 20px 45px rgba(0,0,0,0.35)',
                }}
              >
                Chỉnh sửa thông tin
              </Button>
            )}
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              Đăng xuất
            </Button>
          </Stack>
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.2)',
              backgroundColor: 'rgba(2,5,27,0.4)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {editHint}
            </Typography>
            <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} />
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Mẹo nhanh
            </Typography>
            <Typography variant="body2">
              • Điền đủ các trường bắt buộc<br />• Ghim vị trí chính xác để tối ưu giao hàng<br />• Nhấn "Lưu thay đổi" sau khi chỉnh sửa
            </Typography>
          </Box>
        </Stack>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.08), transparent 55%)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      {/* Success Message */}
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setSuccessMessage(false)}
        >
          ✓ Cập nhật thông tin cửa hàng thành công!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Shop Preview Card */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'linear-gradient(140deg, #262e6a, #4b2798 70%)',
              color: '#fff',
              position: 'sticky',
              top: 28,
              overflow: 'hidden',
              minHeight: 520,
              boxShadow: '0 30px 70px rgba(18,20,66,0.45)',
              '&:before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                opacity: 0.2,
                background:
                  'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.25), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255,204,128,0.25), transparent 45%)',
              },
            }}
          >
            <Box position="relative" zIndex={1}>
              <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label="Live Preview"
                  sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}
                />
                <Chip
                  size="small"
                  color={locationReady ? 'success' : 'default'}
                  variant="outlined"
                  label={locationReady ? 'Đã ghim vị trí' : 'Chưa ghim vị trí'}
                  sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}
                />
              </Stack>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <StoreIcon />
                <Typography variant="h6" fontWeight={700}>
                  Xem trước cửa hàng
                </Typography>
              </Box>

              <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" gap={2}>
                <Box position="relative">
                  <Avatar
                    src={shop.logo}
                    sx={{
                      width: 130,
                      height: 130,
                      border: '4px solid rgba(255,255,255,0.35)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.4)'
                    }}
                  >
                    <StoreIcon sx={{ fontSize: 52 }} />
                  </Avatar>
                  <IconButton
                    size="small"
                    onClick={handleStartEditing}
                    disabled={isEditing}
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: '#fff',
                      color: '#5c6ac4',
                      '&:hover': {
                        backgroundColor: '#f5f5f5'
                      }
                    }}
                    title="Chỉnh sửa thông tin"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Box>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                    {shop.shopName || 'Tên cửa hàng'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85, mb: 1 }}>
                    {shop.description || 'Mô tả cửa hàng'}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Hoàn thiện {completionPercent}% hồ sơ thương hiệu
                  </Typography>
                </Box>

                <Divider sx={{ width: '100%', borderColor: 'rgba(255,255,255,0.2)', my: 1 }} />

                <Stack spacing={1.5} width="100%" textAlign="left">
                  {shop.address && (
                    <Box display="flex" gap={1} alignItems="flex-start">
                      <LocationOnIcon sx={{ fontSize: 20, opacity: 0.85 }} />
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {shop.address}
                      </Typography>
                    </Box>
                  )}
                  {shop.phone && (
                    <Box display="flex" gap={1} alignItems="center">
                      <PhoneIcon sx={{ fontSize: 20, opacity: 0.85 }} />
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {shop.phone}
                      </Typography>
                    </Box>
                  )}
                  {shop.website && (
                    <Box display="flex" gap={1} alignItems="center">
                      <LanguageIcon sx={{ fontSize: 20, opacity: 0.85 }} />
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.9,
                          textDecoration: 'underline',
                          cursor: 'pointer'
                        }}
                      >
                        {shop.website}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Edit Form */}
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              borderRadius: 3,
              border: '1px solid #e0e0e0'
            }}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap={1}
              mb={3}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <EditIcon sx={{ color: '#667eea' }} />
                <Typography variant="h6" fontWeight={700}>
                  Chỉnh sửa thông tin
                </Typography>
              </Box>
              {!isEditing ? (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleStartEditing}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  Chỉnh sửa thông tin
                </Button>
              ) : (
                <Button
                  variant="text"
                  color="error"
                  onClick={handleCancelEdit}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Đóng chỉnh sửa
                </Button>
              )}
            </Box>
            {!isEditing && (
              <Typography variant="body2" color="text.secondary" mb={3}>
                Khi shop muốn chỉnh sửa thông tin, hãy chọn nút "Chỉnh sửa thông tin" để mở chế độ chỉnh sửa.
              </Typography>
            )}

            <Grid container spacing={3}>
              {/* Shop Name */}
              <Grid item xs={12}>
                <Typography 
                  variant="body2" 
                  fontWeight={600} 
                  color="text.secondary"
                  mb={1}
                >
                  Tên cửa hàng *
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  placeholder="Nhập tên cửa hàng"
                  value={shop.shopName}
                  onChange={(e) => setShop({ ...shop, shopName: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <StoreIcon sx={{ mr: 1, color: '#667eea' }} />
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#667eea',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#667eea',
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Grid>

              {/* Address */}
              <Grid item xs={12}>
                <Typography 
                  variant="body2" 
                  fontWeight={600} 
                  color="text.secondary"
                  mb={1}
                >
                  Địa chỉ *
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  placeholder="Nhập địa chỉ cửa hàng"
                  value={shop.address}
                  onChange={(e) => setShop({ ...shop, address: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <LocationOnIcon sx={{ mr: 1, color: '#667eea' }} />
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#667eea',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#667eea',
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Grid>

              {/* Phone */}
              <Grid item xs={12} sm={6}>
                <Typography 
                  variant="body2" 
                  fontWeight={600} 
                  color="text.secondary"
                  mb={1}
                >
                  Số điện thoại *
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  placeholder="Nhập số điện thoại"
                  value={shop.phone}
                  onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <PhoneIcon sx={{ mr: 1, color: '#667eea' }} />
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#667eea',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#667eea',
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Grid>

              {/* Website */}
              <Grid item xs={12} sm={6}>
                <Typography 
                  variant="body2" 
                  fontWeight={600} 
                  color="text.secondary"
                  mb={1}
                >
                  Website
                </Typography>
                <TextField
                  fullWidth
                  disabled={!isEditing}
                  placeholder="https://example.com"
                  value={shop.website ?? ""}
                  onChange={(e) => setShop({ ...shop, website: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <LanguageIcon sx={{ mr: 1, color: '#667eea' }} />
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#667eea',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#667eea',
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <Typography 
                  variant="body2" 
                  fontWeight={600} 
                  color="text.secondary"
                  mb={1}
                >
                  Mô tả cửa hàng
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  disabled={!isEditing}
                  placeholder="Nhập mô tả về cửa hàng của bạn..."
                  value={shop.description ?? ""}
                  onChange={(e) => setShop({ ...shop, description: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <DescriptionIcon sx={{ mr: 1, color: '#667eea', alignSelf: 'flex-start', mt: 1 }} />
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#667eea',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#667eea',
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Grid>

              {/* Location Pin Section */}
              <Grid item xs={12}>
                <SectionCard
                  icon={<LocationOnIcon />}
                  title="Ghim vị trí cửa hàng"
                  subtitle="Giúp khách định vị chính xác và hỗ trợ phân bổ giao hàng"
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2}>
                    <Chip
                      size="small"
                      color={locationReady ? 'success' : 'default'}
                      label={locationReady ? 'Đã ghim vị trí' : 'Chưa ghim vị trí'}
                    />
                    <Chip
                      size="small"
                      color={pinnedAddressLoading ? 'warning' : 'info'}
                      label={pinnedAddressLoading ? 'Đang tìm địa chỉ...' : 'Địa chỉ tự động' }
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Ghim trực tiếp trên bản đồ để đồng bộ vị trí giữa các dịch vụ giao hàng và hiển thị uy tín thương hiệu trên trang khách hàng.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      variant="contained"
                      startIcon={<LocationOnIcon />}
                      onClick={() => setMapDialogOpen(true)}
                      disabled={!isEditing}
                      sx={{
                        px: 3,
                        borderRadius: 2,
                        background: 'linear-gradient(130deg,#5f75ff,#9c64f6)',
                        boxShadow: '0 12px 30px rgba(95,117,255,0.35)',
                        '&:hover': {
                          background: 'linear-gradient(130deg,#4c5fcf,#7c43c0)',
                        },
                      }}
                    >
                      Ghim trên bản đồ
                    </Button>
                    {shop.lat && shop.lng && (
                      <Button
                        variant="text"
                        color="error"
                        onClick={handleClearLocation}
                        disabled={!isEditing}
                        sx={{ fontWeight: 600 }}
                      >
                        Xoá vị trí hiện tại
                      </Button>
                    )}
                  </Stack>
                  <Box mt={2}>
                    <Typography variant="body2" fontWeight={600}>
                      Trạng thái ghim
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      {locationReady
                        ? 'Vị trí đã đồng bộ lên hồ sơ cửa hàng.'
                        : 'Chưa có vị trí – khách hàng chưa nhìn thấy vị trí chính xác của bạn.'}
                    </Typography>
                    <Box mt={1.5}>
                      {pinnedAddressLoading ? (
                        <LinearProgress sx={{ borderRadius: 999 }} />
                      ) : pinnedAddressText ? (
                        <Typography variant="body2" color="text.secondary">
                          Địa điểm phát hiện: {pinnedAddressText}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Chưa có mô tả địa điểm – hãy ghim hoặc dùng GPS để cập nhật tên cụ thể.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </SectionCard>
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={handleCancelEdit}
                    disabled={!isEditing || saving}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: '#e0e0e0',
                      color: '#666',
                      '&:hover': {
                        borderColor: '#999',
                        backgroundColor: '#f5f5f5'
                      }
                    }}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={handleSave}
                    disabled={!isEditing || saving}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                        boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                      },
                      '&:disabled': {
                        background: '#ccc'
                      }
                    }}
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Tips Card */}
          <Paper 
            elevation={0}
            sx={{ 
              mt: 3,
              borderRadius: 3,
              border: '1px solid #e3f2fd',
              backgroundColor: '#e3f2fd'
            }}
          >
            <Box p={2.5}>
              <Typography variant="body2" fontWeight={600} color="#1976d2" mb={1}>
                💡 Mẹo tối ưu hóa cửa hàng
              </Typography>
              <Typography variant="body2" color="text.secondary" fontSize={13}>
                • Sử dụng logo rõ ràng, chất lượng cao (khuyến nghị 500x500px)<br />
                • Điền đầy đủ thông tin liên hệ để khách hàng dễ dàng liên lạc<br />
                • Viết mô tả hấp dẫn, thể hiện giá trị cốt lõi của cửa hàng<br />
                • Cập nhật thông tin thường xuyên để duy trì độ tin cậy
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={mapDialogOpen} onClose={() => setMapDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ghim vị trí cửa hàng</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Nhấp vào bản đồ để chọn vị trí chính xác. Hãy phóng to khu vực cửa hàng để ghim chuẩn hơn.
          </Typography>
          <Box display="flex" justifyContent="flex-end" mb={1.5}>
            <Button
              variant="outlined"
              startIcon={!dialogGpsLoading ? <MyLocationIcon /> : undefined}
              onClick={handleMapGps}
              disabled={!isEditing || dialogGpsLoading}
            >
              {dialogGpsLoading ? "Đang lấy GPS..." : "Định vị GPS"}
            </Button>
          </Box>
          <Box sx={{ height: 360, borderRadius: 2, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
            {mapDialogOpen && (
              <MapContainer
                center={tempCoords ? [tempCoords.lat, tempCoords.lng] : [21.0278, 105.8342]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY || 'GHZKttyI4ARcAaCe0j5d'}`} />
                <LocationMarker />
              </MapContainer>
            )}
          </Box>
          {tempCoords ? (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                Bạn đã chọn một vị trí mới trên bản đồ.
              </Typography>
              {tempAddressLoading ? (
                <LinearProgress sx={{ mt: 1, borderRadius: 999 }} />
              ) : tempAddressText ? (
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Địa điểm phát hiện: {tempAddressText}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Đang tìm tên vị trí...
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" mt={2}>
              Chưa ghim vị trí – nhấp lên bản đồ để thêm điểm mới.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapDialogOpen(false)}>Đóng</Button>
          <Button
            variant="contained"
            onClick={handleSaveLocation}
            disabled={!tempCoords || !isEditing}
          >
            Lưu vị trí
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
