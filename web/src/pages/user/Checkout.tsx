/* eslint-disable no-useless-escape */
import AllInboxOutlinedIcon from '@mui/icons-material/AllInboxOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import PublicIcon from '@mui/icons-material/Public';
import SatelliteAltOutlinedIcon from '@mui/icons-material/SatelliteAltOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import LinearProgress from "@mui/material/LinearProgress";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { addressService } from "../../api/addressService";
import { cartService, type CartResponse, type CheckoutResult, type PaymentMethod } from "../../api/cartService";
import { paymentService } from "../../api/paymentService";
import { productService, type ApiProduct } from "../../api/productService";
import { userService } from "../../api/userService";
import { voucherService, type AppliedVoucherResult, type UserVoucher, type VoucherSuggestion } from "../../api/voucherService";
import { useAuth } from "../../context/AuthContext";
import type { Address } from "../../types/User";
import {
  buildShippingSummary,
  describeShippingMethod,
  type SellerShippingContext,
  type ShippingMethod,
  type ShippingSummary
} from "../../utils/shippingFee";

const AI_IMAGE_ENDPOINT = "https://image.pollinations.ai/prompt/";
interface CheckoutItem {
  productId: {
    _id: string;
    title: string;
    price: number;
    images: string[];
    sellerId?: string;
    shopId?:
      | string
      | {
          _id: string;
          shopName?: string;
          province?: string;
          address?: string;
          lat?: number;
          lng?: number;
        };
  };
  quantity: number;
  price: number;
}

const SHIPPING_METHOD_OPTIONS: Array<{
  value: ShippingMethod;
  title: string;
  badge: string;
  badgeColor: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
}> = [
  { value: "standard", title: "Tiêu chuẩn", badge: "3-5 ngày", badgeColor: "success" },
  { value: "express", title: "Nhanh", badge: "24-48h", badgeColor: "info" },
  { value: "rush", title: "Hỏa tốc", badge: "Trong ngày", badgeColor: "warning" },
];

const PLACE_TYPE_LABELS: Record<string, string> = {
  restaurant: "Nhà hàng",
  cafe: "Quán cà phê",
  fast_food: "Đồ ăn nhanh",
  bar: "Quán bar",
  pub: "Pub",
  shop: "Cửa hàng",
  supermarket: "Siêu thị",
  convenience: "Cửa hàng tiện lợi",
  pharmacy: "Hiệu thuốc",
  bakery: "Tiệm bánh",
  beauty: "Làm đẹp",
  hairdresser: "Tiệm tóc",
  fashion: "Thời trang",
  electronics: "Điện máy",
  kiosk: "Ki-ốt",
};

const prettifyPlaceType = (raw?: string) => {
  if (!raw) return undefined;
  const normalized = raw.toLowerCase();
  return PLACE_TYPE_LABELS[normalized] ?? raw.replace(/_/g, " ");
};

const buildAddressLineFromTags = (tags?: Record<string, string>) => {
  if (!tags) return undefined;
  const street = tags["addr:street"] || tags.street;
  const house = tags["addr:housenumber"] || tags.housenumber;
  const alley =
    tags["addr:alley"] ||
    tags["addr:hamlet"] ||
    tags["addr:quarter"] ||
    tags["addr:neighbourhood"] ||
    tags["addr:suburb"] ||
    tags.alley ||
    tags.hamlet ||
    tags.quarter ||
    tags.neighbourhood ||
    tags.suburb;

  const detailParts: string[] = [];
  if (house && street) detailParts.push(`${house} ${street}`);
  else if (street) detailParts.push(street);
  else if (house) detailParts.push(house);
  if (alley) detailParts.push(alley);

  const detail = detailParts.join(", ").trim();
  return detail || undefined;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Remove province/district/ward names from a detail string to keep 'Địa chỉ cụ thể' concise
const sanitizeDetail = (raw?: string | null, province?: string, district?: string, ward?: string) => {
  if (!raw) return raw ?? undefined;
  let out = String(raw);
  const parts = [ward, district, province].filter(Boolean).map(String);
  for (const p of parts) {
    try {
      const pattern = "\\s*,?\\s*" + escapeRegExp(p) + "\\s*,?\\s*";
      const re = new RegExp(pattern, "gi");
      out = out.replace(re, ", ");
    } catch {
      // ignore
    }
  }
  // Strip common country names (e.g., 'Việt Nam', 'Vietnam', 'VN') to keep the detail concise
  const countries = ['Việt Nam', 'Viet Nam', 'Vietnam', 'VN', 'ViệtNam', 'Cộng hòa xã hội chủ nghĩa Việt Nam'];
  for (const c of countries) {
    try {
      const pattern = "\\s*,?\\s*" + escapeRegExp(c) + "\\s*,?\\s*";
      const reC = new RegExp(pattern, "gi");
      out = out.replace(reC, ", ");
    } catch {
      // ignore
    }
  }
  // Remove generic province/city phrases like 'Thành phố X', 'TP. X', 'Tỉnh X'
  try {
    out = out.replace(/\b(thành phố|thanh pho|tp\.?|tinh|tỉnh)\s+[^,;]+/gi, "");
  } catch {
    // ignore
  }
  // Remove a short list of common province/city names that might appear standalone
    const provinces = ['Thành phố Hồ Chí Minh', 'Hồ Chí Minh', 'Ho Chi Minh', 'TP Hồ Chí Minh', 'HCM', 'Hà Nội', 'Ha Noi', 'Đà Nẵng', 'Da Nang', 'Hải Phòng', 'Hai Phong', 'Cần Thơ', 'Can Tho'];
    for (const p of provinces) {
      try {
        const pattern = "\\s*,?\\s*" + escapeRegExp(p) + "\\s*,?\\s*";
        const reP = new RegExp(pattern, "gi");
        out = out.replace(reP, ", ");
      } catch {
        // ignore
      }
    }
  // collapse multiple commas and trim
  out = out.replace(/\s*,\s*,+/g, ",").replace(/^,\s*/, "").replace(/,\s*$/, "").trim();
  return out || undefined;
};

// Ensure the specific address only contains house number, street name, and alley/hẻm when possible
const formatSpecificAddress = (raw?: string | null) => {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  // split into parts by commas or dash-like separators
  const parts = s.split(/[,;|/]+/).map(p => p.trim()).filter(Boolean);
  // Detect Plus Code / Open Location Code (e.g., "27M4+P57") and return it as highest priority
  const plusCodeMatch = s.match(/\b[A-Z0-9]{2,}\+[A-Z0-9]{2,}\b/i);
  if (plusCodeMatch) return plusCodeMatch[0];
  const keywords = /(hẻm|hem|ngõ|ngách|ngõ|đường|duong|phố|pho|lộ|hem|hẻm|alley)/i;
  const houseNumRegex = /\b\d{1,4}(?:[/-]\d{1,4})?\b/;

  const chosen: string[] = [];
  for (const p of parts) {
    if (keywords.test(p) || houseNumRegex.test(p)) {
      chosen.push(p);
    }
    if (chosen.length >= 3) break;
  }

  if (chosen.length === 0) {
    // fallback: take first part (which often contains street/house)
    return parts.slice(0, 1).join(', ');
  }

  return chosen.join(', ');
};

// More detailed formatter: keep more parts (street, house, premise, sublocality, neighborhood)
const formatDetailedAddress = (raw?: string | null, province?: string, district?: string, ward?: string) => {
  if (!raw) return undefined;
  const sanitized = sanitizeDetail(raw, province, district, ward) || String(raw);
  // If a Plus Code exists, keep it as the first part
  const plusCodeMatch = sanitized.match(/\b[A-Z0-9]{2,}\+[A-Z0-9]{2,}\b/i);
  if (plusCodeMatch) {
    const rest = sanitized.replace(plusCodeMatch[0], '').split(/[,;|\/]+/).map(p => p.trim()).filter(Boolean);
    return [plusCodeMatch[0], ...rest.slice(0, 4)].join(', ');
  }
  const parts = sanitized.split(/[,;|\/]+/).map(p => p.trim()).filter(Boolean);
  // Keep up to 5 parts to provide richer detail (but still avoid admin-level names due to sanitizeDetail)
  return parts.slice(0, 5).join(', ');
};

const formatPlaceDetail = (place: { name?: string; type?: string; addressLine?: string }) => {
  const typeLabel = prettifyPlaceType(place.type);
  const meta = [typeLabel, place.addressLine].filter(Boolean).join(" • ");
  if (place.name && meta) {
    return `${place.name} – ${meta}`;
  }
  return place.name || meta || "Địa điểm gần đây";
};

const formatDistanceLabel = (distance?: number) => {
  if (distance === undefined || Number.isNaN(distance)) return null;
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} km`;
  }
  return `${Math.round(distance)} m`;
};

type GoogleAddressComponent = { long_name?: string; short_name?: string; types?: string[] };

type GoogleRawAddress = {
  formatted_address?: string;
  address_components?: GoogleAddressComponent[];
};

type GoogleAddressResult = {
  formatted?: string;
  specificDetail?: string;
  plusCode?: string;
  raw?: GoogleRawAddress | null;
  components?: GoogleAddressComponent[];
};

type NearbyPlace = {
  id: string;
  name?: string;
  type?: string;
  lat: number;
  lng: number;
  distance?: number;
  addressLine?: string;
};

interface CheckoutPayload {
  userId: string;
  fullName: string;
  email: string;
  address: string;
  paymentMethod: PaymentMethod;
  items: CheckoutItem[];
  total: number;
  voucherCode?: string | null;
  mode: "buy-now" | "cart";
  productId?: string;
  shippingAddress?: Address;
  shippingOption: { method: ShippingMethod; rushDistanceKm?: number };
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartId, productId } = useParams<{ cartId?: string; productId?: string }>();

  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("payos");
  const [processing, setProcessing] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("standard");
  const { user } = useAuth();

  // derived total price must be declared before hooks that reference it
  const totalPrice = items.reduce((acc, item) => acc + item.productId.price * item.quantity, 0);
  const [userVouchers, setUserVouchers] = useState<UserVoucher[]>([]);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherDetail, setVoucherDetail] = useState<UserVoucher | null>(null);
  const [applyingVoucherCode, setApplyingVoucherCode] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<AppliedVoucherResult | null>(null);
  const [initialVoucherFetched, setInitialVoucherFetched] = useState(false);
  const [bestVoucher, setBestVoucher] = useState<VoucherSuggestion | null>(null);
  const [bestVoucherLoading, setBestVoucherLoading] = useState(false);
  const [bestVoucherError, setBestVoucherError] = useState<string | null>(null);
  const [manualVoucherCode, setManualVoucherCode] = useState("");
  const [manualVoucherError, setManualVoucherError] = useState<string | null>(null);
  const selectedVoucherCode = selectedVoucher?.code ?? null;
  const voucherDiscount = selectedVoucher?.discount ?? 0;
  const freeShippingVoucherApplied = Boolean(selectedVoucher?.freeShipping);

  const formatCurrency = useCallback((value: number) => `${value.toLocaleString("vi-VN")}₫`, []);
  const formatDate = useCallback((value?: string | null) => {
    if (!value) return "Không giới hạn";
    return new Date(value).toLocaleDateString("vi-VN");
  }, []);

  const buildVoucherPrompt = useCallback((voucher: { code?: string; type?: string; value?: number; highlightText?: string }) => {
    const discountText = voucher.type === "percent" ? `${voucher.value}% off` : `giảm ${formatCurrency(voucher.value ?? 0)}`;
    return [
      "poster flash sale",
      `voucher ${voucher.code || "QQSALE"}`,
      discountText,
      voucher.highlightText || "ưu đãi hấp dẫn",
      "gradient neon background, shopping icons, confetti, 3d lighting, no people"
    ].join(", ");
  }, [formatCurrency]);

  const getVoucherImageUrl = useCallback((voucher: { code?: string; highlightText?: string; type?: string; value?: number }) => {
    const prompt = encodeURIComponent(buildVoucherPrompt(voucher));
    const seed = voucher.code ? voucher.code.length * 7919 : Date.now();
    return `${AI_IMAGE_ENDPOINT}${prompt}?width=640&height=360&seed=${seed}&nologo=true`;
  }, [buildVoucherPrompt]);

  const describeVoucherDetail = useCallback(
    (voucher?: Partial<UserVoucher>) => {
      if (!voucher) return "";
      const segments: string[] = [];

      if (voucher.freeShipping) {
        segments.push("Voucher freeship: QQ Commerce sẽ chi trả toàn bộ phí vận chuyển cho đơn đáp ứng điều kiện.");
      }

      switch (voucher.targetType) {
        case "category":
          if (voucher.targetCategories?.length) {
            segments.push(`Áp dụng cho danh mục: ${voucher.targetCategories.join(", ")}`);
          } else {
            segments.push("Áp dụng cho một số danh mục cụ thể");
          }
          break;
        case "product":
          if (voucher.targetProducts?.length) {
            segments.push(`Áp dụng cho ${voucher.targetProducts.length} sản phẩm được chỉ định`);
          } else {
            segments.push("Áp dụng cho một số sản phẩm cụ thể");
          }
          break;
        default:
          segments.push("Áp dụng cho toàn bộ sản phẩm hợp lệ");
          break;
      }

      if (voucher.minOrderValue) {
        segments.push(`Đơn tối thiểu ${formatCurrency(voucher.minOrderValue)}`);
      }
      if (voucher.maxDiscount) {
        segments.push(`Giảm tối đa ${formatCurrency(voucher.maxDiscount)}`);
      }
      if (voucher.stackable !== undefined) {
        segments.push(voucher.stackable ? "Có thể gộp với voucher khác" : "Không thể gộp cùng voucher khác");
      }

      return segments.join(". ");
    },
    [formatCurrency],
  );

  const voucherDetailDescription = voucherDetail ? describeVoucherDetail(voucherDetail) : "";

  // Toggle to enable/disable toast notifications in this component
  const toastEnabled = false; // set to true to re-enable toasts
  useEffect(() => {
    if (!toastEnabled) {
      // mute common toast methods using a narrow type to avoid `any`
      type MuteableToast = {
        info: (...args: unknown[]) => void;
        success: (...args: unknown[]) => void;
        error: (...args: unknown[]) => void;
        warn: (...args: unknown[]) => void;
        warning: (...args: unknown[]) => void;
      };
      const t = toast as unknown as MuteableToast;
      t.info = () => {};
      t.success = () => {};
      t.error = () => {};
      t.warn = () => {};
      t.warning = () => {};
    }
    // no cleanup necessary
  }, [toastEnabled]);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new" | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const loadUserVouchers = useCallback(
    async (total: number) => {
      try {
        setVoucherError(null);
        setVoucherLoading(true);
        const vouchers = await voucherService.getMyVouchers(total > 0 ? { total } : undefined);
        setUserVouchers(vouchers);
      } catch (err) {
        console.error("Failed to load vouchers", err);
        setVoucherError("Không tải được voucher. Vui lòng thử lại.");
        setUserVouchers([]);
      } finally {
        setVoucherLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialVoucherFetched) return;
    if (totalPrice <= 0) return;
    setInitialVoucherFetched(true);
    void loadUserVouchers(totalPrice);
  }, [initialVoucherFetched, totalPrice, loadUserVouchers]);

  useEffect(() => {
    if (!voucherDialogOpen) return;
    void loadUserVouchers(totalPrice);
  }, [voucherDialogOpen, loadUserVouchers, totalPrice]);

  useEffect(() => {
    if (!items.length || totalPrice <= 0) {
      setBestVoucher(null);
      return;
    }
    const normalizedItems = items
      .map((item) => {
        const productId = item.productId?._id;
        if (!productId) return null;
        return {
          productId,
          quantity: item.quantity || 1,
          price: item.price ?? item.productId.price ?? 0,
        };
      })
      .filter((entry): entry is { productId: string; quantity: number; price: number } => Boolean(entry));

    if (!normalizedItems.length) {
      setBestVoucher(null);
      return;
    }

    let cancelled = false;
    setBestVoucherLoading(true);
    setBestVoucherError(null);

    voucherService
      .getBestVoucherSuggestion(normalizedItems)
      .then((suggestion) => {
        if (cancelled) return;
        setBestVoucher(suggestion);
      })
      .catch((err) => {
        console.error("Failed to load best voucher", err);
        if (cancelled) return;
        setBestVoucher(null);
        setBestVoucherError("Không tìm được voucher phù hợp cho giỏ hàng hiện tại");
      })
      .finally(() => {
        if (cancelled) return;
        setBestVoucherLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [items, totalPrice]);

  useEffect(() => {
    if (!selectedVoucherCode) return;
    const revalidateVoucher = async () => {
      try {
        const refreshed = await voucherService.applyVoucher({ code: selectedVoucherCode, total: totalPrice });
        setSelectedVoucher(refreshed);
      } catch (err) {
        console.warn("Voucher no longer valid", err);
        setSelectedVoucher(null);
      }
    };
    void revalidateVoucher();
  }, [selectedVoucherCode, totalPrice]);

  const applyVoucherCode = async (code: string, options?: { closeDialog?: boolean }) => {
    try {
      setApplyingVoucherCode(code);
      const applied = await voucherService.applyVoucher({ code, total: totalPrice });
      setSelectedVoucher(applied);
      toast.success(`✅ Đã áp dụng voucher ${code}!`, {
        position: "top-center",
        autoClose: 2000,
      });
      if (options?.closeDialog ?? true) {
        setVoucherDialogOpen(false);
      }
    } catch (err) {
      console.error("Failed to apply voucher", err);
      const message = err instanceof Error ? err.message : "Không thể áp dụng voucher";
      toast.error(`❌ ${message}`, {
        position: "top-center",
        autoClose: 3000,
      });
    } finally {
      setApplyingVoucherCode(null);
    }
  };

  const handleApplyVoucher = async (voucher: UserVoucher) => {
    await applyVoucherCode(voucher.code, { closeDialog: true });
  };

  const handleApplyBestVoucher = async (code: string) => {
    await applyVoucherCode(code, { closeDialog: false });
  };

  const handleApplyManualVoucher = async () => {
    const raw = manualVoucherCode.trim().toUpperCase();
    if (!raw) {
      setManualVoucherError("Vui lòng nhập mã voucher");
      return;
    }
    setManualVoucherError(null);
    await applyVoucherCode(raw, { closeDialog: false });
    setManualVoucherCode("");
  };

  const showVoucherDetail = (voucher: Partial<UserVoucher> & { code: string }) => {
    setVoucherDetail(voucher as UserVoucher);
  };

  const handleRemoveVoucher = () => {
    setSelectedVoucher(null);
    toast.info("Đã bỏ voucher đang áp dụng", {
      position: "top-center",
      autoClose: 2000,
    });
  };

  const [addressForm, setAddressForm] = useState<Address>({
    id: undefined,
    name: "",
    phone: "",
    province: "",
    district: "",
    ward: "",
    detail: "",
    lat: undefined,
    lng: undefined,
    type: "home",
    isDefault: false,
  });

  // Toggle: if true, produce a more detailed 'Địa chỉ cụ thể' (more parts kept)
  const [detailedAddressMode] = useState<boolean>(false);

  const sellerShippingContext = useMemo<SellerShippingContext[]>(() => {
    if (!items.length) return [];
    const grouped = new Map<string, SellerShippingContext>();
    items.forEach((item) => {
      const sellerId =
        item.productId?.sellerId ||
        (typeof item.productId?.shopId === "string"
          ? item.productId.shopId
          : item.productId?.shopId?._id) ||
        item.productId?._id;
      if (!sellerId || grouped.has(sellerId)) return;

      let shop: SellerShippingContext["shop"] | null = null;
      const rawShop = item.productId?.shopId;
      if (rawShop && typeof rawShop === "object") {
        shop = {
          _id: rawShop._id,
          province: rawShop.province ?? null,
          lat:
            typeof rawShop.lat === "number"
              ? rawShop.lat
              : rawShop.lat != null
                ? Number(rawShop.lat)
                : null,
          lng:
            typeof rawShop.lng === "number"
              ? rawShop.lng
              : rawShop.lng != null
                ? Number(rawShop.lng)
                : null,
        };
      }

      grouped.set(sellerId, { sellerId, shop });
    });
    return Array.from(grouped.values());
  }, [items]);

  const shippingDestination = useMemo(() => {
    const hasProvince = Boolean(addressForm.province);
    const latValue =
      typeof addressForm.lat === "number" && !Number.isNaN(addressForm.lat)
        ? addressForm.lat
        : undefined;
    const lngValue =
      typeof addressForm.lng === "number" && !Number.isNaN(addressForm.lng)
        ? addressForm.lng
        : undefined;

    if (!hasProvince && latValue == null && lngValue == null) {
      return undefined;
    }

    return {
      province: addressForm.province,
      lat: latValue,
      lng: lngValue,
    };
  }, [addressForm.province, addressForm.lat, addressForm.lng]);

  const shippingSummary = useMemo<ShippingSummary>(() => {
    if (!sellerShippingContext.length) {
      return { method: shippingMethod, totalShippingFee: 0, breakdown: [] };
    }

    const needsAddressDetails = shippingMethod === "standard" || shippingMethod === "express";
    const hasProvince = Boolean(shippingDestination?.province);
    const hasCoordinates =
      shippingDestination?.lat != null && shippingDestination?.lng != null;
    if (needsAddressDetails && !hasProvince && !hasCoordinates) {
      return { method: shippingMethod, totalShippingFee: 0, breakdown: [] };
    }

    return buildShippingSummary({
      sellers: sellerShippingContext,
      destination: shippingDestination,
      method: shippingMethod,
    });
  }, [sellerShippingContext, shippingDestination, shippingMethod]);

  const shippingFee = shippingSummary.totalShippingFee || 0;

  const currentShippingOption = SHIPPING_METHOD_OPTIONS.find(
    (option) => option.value === shippingMethod,
  );
  const shippingMethodTitle = currentShippingOption?.title ?? shippingMethod;
  const requiresAddressForShipping =
    (shippingMethod === "standard" || shippingMethod === "express") &&
    !(shippingDestination?.province ||
      (shippingDestination?.lat != null && shippingDestination?.lng != null));
  const shippingDiscount =
    freeShippingVoucherApplied && !requiresAddressForShipping ? shippingFee : 0;
  const effectiveShippingFee = Math.max(0, shippingFee - shippingDiscount);
  const shippingFeeLabel = requiresAddressForShipping
    ? "Chưa xác định"
    : effectiveShippingFee > 0
      ? formatCurrency(effectiveShippingFee)
      : freeShippingVoucherApplied
        ? "Được freeship"
        : "Miễn phí";
  const rushDistanceOverride =
    shippingMethod === "rush"
      ? shippingSummary.breakdown.find(
          (entry) => typeof entry.distanceKm === "number" && !Number.isNaN(entry.distanceKm),
        )?.distanceKm ?? undefined
      : undefined;

  const finalTotal = useMemo(
    () => Math.max(0, totalPrice + effectiveShippingFee - voucherDiscount),
    [totalPrice, voucherDiscount, effectiveShippingFee],
  );

  const cartItemCount = items.length;
  const totalQuantity = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);
  const FREE_SHIPPING_THRESHOLD = 500000;
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - finalTotal);
  const shippingProgress = freeShippingVoucherApplied ? 100 : Math.min(100, (finalTotal / FREE_SHIPPING_THRESHOLD) * 100);
  const freeShippingMessage = freeShippingVoucherApplied
    ? `Voucher ${selectedVoucher?.code ?? "FREESHIP"} đang miễn toàn bộ phí vận chuyển cho đơn này.`
    : finalTotal >= FREE_SHIPPING_THRESHOLD
      ? "Bạn đã đủ điều kiện miễn phí vận chuyển cho đơn này."
      : `Mua thêm ${formatCurrency(amountToFreeShipping)} để đạt ưu đãi miễn phí ship.`;

  const voucherValueDisplay = (() => {
    if (!selectedVoucher) return "Chưa áp dụng";
    if (selectedVoucher.freeShipping) {
      if (requiresAddressForShipping) return "Freeship (chờ địa chỉ)";
      return shippingDiscount > 0 ? `-${formatCurrency(shippingDiscount)}` : "Freeship";
    }
    return `-${formatCurrency(voucherDiscount)}`;
  })();
  const voucherCaption = selectedVoucher
    ? selectedVoucher.freeShipping
      ? shippingDiscount > 0
        ? `Tiết kiệm phí ship ${formatCurrency(shippingDiscount)}`
        : "Sẽ miễn phí khi có địa chỉ"
      : selectedVoucher.code
    : "Thêm voucher để tiết kiệm";

  const heroStats = [
    {
      label: "Sản phẩm",
      value: cartItemCount,
      caption: `${items.length} mặt hàng trong giỏ`,
      icon: ShoppingBagOutlinedIcon,
      color: "#f97316",
    },
    {
      label: "Số lượng",
      value: totalQuantity,
      caption: "Tổng số sản phẩm",
      icon: AllInboxOutlinedIcon,
      color: "#14b8a6",
    },
    {
      label: "Ưu đãi",
      value: voucherValueDisplay,
      caption: voucherCaption,
      icon: SavingsOutlinedIcon,
      color: "#facc15",
    },
    {
      label: "Vận chuyển",
      value: requiresAddressForShipping ? "Chờ địa chỉ" : shippingFeeLabel,
      caption: shippingMethodTitle,
      icon: LocalShippingOutlinedIcon,
      color: "#38bdf8",
    },
  ];

  const checkoutSteps: Array<{ label: string; status: "done" | "current" | "next" }> = [
    { label: "Giỏ hàng", status: "done" },
    { label: "Thông tin & vận chuyển", status: "current" },
    { label: "Thanh toán", status: "next" },
  ];

  const [provinces, setProvinces] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [wards, setWards] = useState<string[]>([]);

  const [coordLat, setCoordLat] = useState<string>(addressForm.lat ? String(addressForm.lat) : "");
  const [coordLng, setCoordLng] = useState<string>(addressForm.lng ? String(addressForm.lng) : "");
  const [useRawCoords, setUseRawCoords] = useState<boolean>(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState<number>(500);
  const [mapStyle, setMapStyle] = useState<"m" | "y" | "s">("m");
  const [dialogMapStyle, setDialogMapStyle] = useState<"m" | "y" | "s">("m");
  const [googleFullAddress, setGoogleFullAddress] = useState<string>("");

  const mapLayerOptions = useMemo(
    () => [
      { value: "m" as const, label: "Đường", icon: <MapOutlinedIcon fontSize="small" /> },
      { value: "y" as const, label: "Hybrid", icon: <LayersOutlinedIcon fontSize="small" /> },
      { value: "s" as const, label: "Vệ tinh", icon: <SatelliteAltOutlinedIcon fontSize="small" /> },
    ],
    []
  );

  const fancyPinIcon = useMemo(() => {
    const pinHtml = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-80%);">
        <div style="width:26px;height:26px;border-radius:14px;border:3px solid #fff;background:linear-gradient(140deg,#ec4899,#8b5cf6);box-shadow:0 10px 24px rgba(99,102,241,0.45);"></div>
        <div style="width:10px;height:10px;border-radius:999px;margin-top:4px;background:rgba(236,72,153,0.35);box-shadow:0 0 15px rgba(236,72,153,0.6);"></div>
      </div>`;
    return L.divIcon({ html: pinHtml, className: "", iconSize: [32, 42], iconAnchor: [16, 32] });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const provincesData = await addressService.getProvinces();
        setProvinces(provincesData);
      } catch (err) {
        console.error("Error loading provinces:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0) {
      setAddresses(user.addresses);
      setSelectedAddressId(user.addresses[0]?.id || null);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const state = location.state as { quantity?: number } | null;
        const stateData = state as unknown as Record<string, unknown> | null;
        const buyNowProductId = productId || (stateData?.productId as string | undefined);

        if (buyNowProductId) {
          const product: ApiProduct = await productService.getProductById(buyNowProductId);
          setItems([
            {
              productId: {
                _id: product._id,
                title: product.title,
                price: product.price,
                images: product.images,
              },
              quantity: state?.quantity || 1,
              price: product.price,
            },
          ]);
        } else if (cartId) {
          const cart: CartResponse = await cartService.getCart();
          if (cart._id !== cartId) {
            throw new Error("Cart ID không khớp!");
          }
          setItems(cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })));
        } else {
          throw new Error("Không xác định được chế độ thanh toán!");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không lấy được dữ liệu sản phẩm/giỏ hàng!", {
          position: "top-center",
          autoClose: 3000,
        });
        setTimeout(() => navigate("/cart"), 2000);
      } finally {
        setLoading(false);
      }
    })();
  }, [location.state, cartId, productId, navigate]);

  useEffect(() => {
    if (!selectedAddressId || selectedAddressId === "new") return;
    const found = addresses.find(a => a.id === selectedAddressId);
    if (found) {
      setAddressForm({ ...found });
      setCoordLat(found.lat ? String(found.lat) : "");
      setCoordLng(found.lng ? String(found.lng) : "");
      if (found.province) {
        (async () => {
          const districtsList = await addressService.getDistricts(found.province);
          setDistricts(districtsList);
        })();
      }
      if (found.province && found.district) {
        (async () => {
          const wardsList = await addressService.getWards(found.province, found.district);
          setWards(wardsList);
        })();
      }
    }
  }, [selectedAddressId, addresses]);

  const googleMapsKey =
    import.meta.env.VITE_GOOGLE_MAPS_KEY ||
    import.meta.env.REACT_APP_GOOGLE_MAPS_KEY ||
    "";

  const buildGoogleTileUrl = (style = "m") => {
    const suffix = googleMapsKey ? `&key=${googleMapsKey}` : "";
    return `https://mt1.google.com/vt/lyrs=${style}&x={x}&y={y}&z={z}${suffix}`;
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setAddressForm(a => ({ ...a, lat, lng, isPinned: true }));
        setCoordLat(String(lat));
        setCoordLng(String(lng));
        toast.success("✅ Đã ghim vị trí trên bản đồ");

        (async () => {
          try {
            toast.info("⏳ Đang truy xuất địa chỉ...", { autoClose: 2000 });
            const result = await addressService.reverseGeocode(lat, lng);
            console.debug("[reverseGeocode] click result:", result);
            if (result) {
              // When user clicks on the map to pin a location, DO NOT overwrite province/district/ward
              await applyMatchedLocation(result.province, result.district, result.ward, result.detail, lat, lng, false, result.plusCode);
              toast.info("ℹ️ Bạn có thể tiếp tục thay đổi vị trí hoặc click 'Hoàn thành'");
            }
            await autofillDetailFromGoogle(lat, lng);
            // fetch nearby POIs for user convenience
            void fetchNearbyPlaces(lat, lng, nearbyRadius);
          } catch (err) {
            console.error("reverse geocode failed:", err);
            toast.error("❌ Lỗi truy xuất địa chỉ");
          }
        })();
      },
    });
    return addressForm.lat && addressForm.lng ? (
      <Marker position={[addressForm.lat, addressForm.lng]} icon={fancyPinIcon} />
    ) : null;
  }

  function DraggablePin({ lat, lng }: { lat?: number; lng?: number }) {
    const [pos, setPos] = useState<[number, number] | null>(
      typeof lat === "number" && typeof lng === "number" ? [lat, lng] : null
    );

    useEffect(() => {
      if (typeof lat === "number" && typeof lng === "number") {
        setPos([lat, lng]);
      } else {
        setPos(null);
      }
    }, [lat, lng]);

    if (!pos) return null;

    return (
      <Marker
        position={pos}
        draggable
        icon={fancyPinIcon}
        eventHandlers={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dragend(e: any) {
            const { lat, lng } = e.target.getLatLng();
            setPos([lat, lng]);
            setAddressForm(a => ({ ...a, lat, lng, isPinned: true }));
            setCoordLat(String(lat));
            setCoordLng(String(lng));
            toast.success("✅ Đã cập nhật vị trí ghim");
            void fetchNearbyPlaces(lat, lng, nearbyRadius);
            void autofillDetailFromGoogle(lat, lng);
          },
        }}
      />
    );
  }

  function MapPanner({ lat, lng }: { lat?: number; lng?: number }) {
    const map = useMapEvents({});
    useEffect(() => {
      if (lat != null && lng != null && map) {
        const panes = typeof map.getPanes === "function" ? map.getPanes() : null;
        if (!panes || !panes.mapPane) {
          return;
        }
        try {
          map.setView([lat, lng], 16, { animate: true });
        } catch (error) {
          console.warn("Map recenter failed, retrying without animation", error);
          try {
            map.setView([lat, lng], 16, { animate: false });
          } catch {
            // ignore final failure
          }
        }
      }
    }, [lat, lng, map]);
    return null;
  }

  // Fetch POIs around a coordinate using Overpass API (OSM)
  const fetchNearbyPlaces = async (lat?: number, lng?: number, radius = 500) => {
    if (!lat || !lng) return;
    setLoadingNearby(true);
    try {
      const q = `[out:json][timeout:25];(node["shop"](around:${radius},${lat},${lng});way["shop"](around:${radius},${lat},${lng});node["amenity"~"restaurant|cafe|fast_food|bar|pub"](around:${radius},${lat},${lng});way["amenity"~"restaurant|cafe|fast_food|bar|pub"](around:${radius},${lat},${lng}););out center 30;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: q,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Overpass API error ${res.status}: ${errorText.slice(0, 120)}`);
      }

      let data: unknown = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Overpass API returned non-JSON payload", jsonErr);
        throw new Error("Overpass API trả về dữ liệu không hợp lệ, vui lòng thử lại sau");
      }
      if (!data || typeof data !== "object") {
        throw new Error("Overpass API không trả dữ liệu hợp lệ");
      }
      const elements = (data as { elements?: unknown[] }).elements;
      const elems: RawElem[] = Array.isArray(elements) ? (elements as RawElem[]) : [];

      const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const toRad = (v: number) => (v * Math.PI) / 180;
        const R = 6371e3; // metres
        const φ1 = toRad(lat1);
        const φ2 = toRad(lat2);
        const Δφ = toRad(lat2 - lat1);
        const Δλ = toRad(lon2 - lon1);
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      type RawElem = Record<string, unknown>;
      type PlaceWithDistance = { id: string; name?: string; type?: string; lat: number; lng: number; distance: number; addressLine?: string };

      const places: PlaceWithDistance[] = elems
        .map((e) => {
          const center = (e["center"] as Record<string, unknown> | undefined) ?? undefined;
          const latP = (e["lat"] as number | string | undefined) ?? (center ? (center["lat"] as number | string | undefined) : undefined) ?? null;
          const lngP = (e["lon"] as number | string | undefined) ?? (center ? (center["lon"] as number | string | undefined) : undefined) ?? null;
          const tags = (e["tags"] as Record<string, string> | undefined) ?? {};
          const brand = tags.brand || tags["brand:vi"] || tags["brand:en"];
          const operator = tags.operator || tags["operator:vi"] || tags["operator:en"];
          const houseName = tags["addr:housename"];
          const streetLabel = tags["addr:street"] || tags.street;
          const houseNumber = tags["addr:housenumber"] || tags.housenumber;

          const clean = (value?: string) => (value ? value.trim() : undefined);
          let displayName = clean(tags.name);
          const cleanBrand = clean(brand);
          const cleanOperator = clean(operator);
          const cleanHouseName = clean(houseName);

          if (displayName && cleanBrand && !displayName.toLowerCase().includes(cleanBrand.toLowerCase())) {
            displayName = `${displayName} (${cleanBrand})`;
          }

          if (!displayName && cleanHouseName) {
            displayName = cleanHouseName;
          }
          if (!displayName && cleanBrand) {
            displayName = cleanBrand;
          }
          if (!displayName && cleanOperator) {
            displayName = cleanOperator;
          }
          if (!displayName && houseNumber) {
            displayName = streetLabel ? `${houseNumber} ${streetLabel}` : `Số ${houseNumber}`;
          }

          const name = displayName;
          const type = tags && (tags.shop || tags.amenity) ? (tags.shop || tags.amenity) : undefined;
          const id = `${(e["type"] as string) || "node"}_${String(e["id"] ?? "")}`;
          return {
            id,
            name,
            type,
            lat: Number(latP),
            lng: Number(lngP),
            distance: latP && lngP ? haversine(lat, lng, Number(latP), Number(lngP)) : Infinity,
            addressLine: buildAddressLineFromTags(tags),
          };
        })
        .filter((p: PlaceWithDistance | undefined): p is PlaceWithDistance => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng));

      places.sort((a: PlaceWithDistance, b: PlaceWithDistance) => (a.distance || 0) - (b.distance || 0));
      setNearbyPlaces(places.map((p: PlaceWithDistance) => ({ id: p.id, name: p.name, type: p.type, lat: p.lat, lng: p.lng, distance: p.distance, addressLine: p.addressLine })));
    } catch (err) {
      console.error('fetchNearbyPlaces failed', err);
      toast.error(err instanceof Error ? err.message : '❌ Không thể tìm địa điểm gần đây');
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleApplyNearbyPlace = (place: NearbyPlace) => {
    // Prefer OSM-derived addressLine (street/premise/sublocality). Format to specific house/street/alley or detailed depending on toggle.
    const candidate = place.addressLine || place.name || formatPlaceDetail(place);
    const detail = (detailedAddressMode ? formatDetailedAddress(candidate) : formatSpecificAddress(candidate)) || (place.addressLine || place.name || formatPlaceDetail(place));
    setAddressForm((a) => ({ ...a, detail, lat: place.lat, lng: place.lng, isPinned: true }));
    setGoogleFullAddress("");
    setCoordLat(String(place.lat));
    setCoordLng(String(place.lng));
    setSelectedAddressId("new");
    toast.success(`✅ Đã chọn ${detail}`);
  };

  const handlePreviewNearbyPlace = (place: NearbyPlace) => {
    const detail = formatPlaceDetail(place);
    setAddressForm((a) => ({ ...a, lat: place.lat, lng: place.lng, isPinned: true }));
    setCoordLat(String(place.lat));
    setCoordLng(String(place.lng));
    toast.info(`🔎 Đã di chuyển tới ${detail}`);
  };

  const copyGoogleAddress = useCallback(async () => {
    if (!googleFullAddress) {
      toast.info('Chưa có địa chỉ Google để sao chép');
      return;
    }
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(googleFullAddress);
      toast.success('Đã sao chép địa chỉ Google Maps');
    } catch (err) {
      console.error('copy google address failed', err);
      toast.error('Không thể sao chép địa chỉ Google');
    }
  }, [googleFullAddress]);

  // Forward geocode helper (Nominatim) - usable by button or auto-search
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const forwardGeocode = async (query: string) => {
    if (!query) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}&accept-language=vi`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const hit = data[0];
        const lat = parseFloat(hit.lat);
        const lng = parseFloat(hit.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          toast.error('Không lấy được toạ độ từ kết quả');
          return;
        }
        setAddressForm(a => ({ ...a, lat, lng, isPinned: true }));
        setCoordLat(String(lat));
        setCoordLng(String(lng));
        toast.success('✅ Đã tìm và ghim vị trí trên bản đồ');
        // fetch nearby places automatically after forward geocode
        void fetchNearbyPlaces(lat, lng, nearbyRadius);
      } else {
        toast.error('Không tìm thấy vị trí cho địa chỉ này');
      }
    } catch (err) {
      console.error('Geocode search failed:', err);
      toast.error('Lỗi khi tìm địa chỉ. Vui lòng thử lại.');
    }
  };

  // Auto-search when address details change (debounced)
  useEffect(() => {
    const parts = [addressForm.detail, addressForm.ward, addressForm.district].filter(Boolean).join(', ');
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    if (!parts) return;
    geocodeTimerRef.current = setTimeout(() => {
      void forwardGeocode(parts);
    }, 800);
    return () => {
      if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressForm.detail, addressForm.ward, addressForm.district, addressForm.province]);

  const applyMatchedLocation = async (
    geocodedProvince: string,
    geocodedDistrict: string,
    geocodedWard: string,
    detail: string,
    lat?: number,
    lng?: number,
    updateAdminFields = true,
    plusCode?: string,
  ) => {
    try {
      console.debug("[Geocoded]", { province: geocodedProvince, district: geocodedDistrict, ward: geocodedWard, plusCode });
      
      if (!geocodedProvince && !geocodedDistrict && !geocodedWard) {
        console.log("[applyMatchedLocation] Coordinate-only response, updating detail only");
        const sanitized = sanitizeDetail(detail, geocodedProvince, geocodedDistrict, geocodedWard);
        const specific = (detailedAddressMode
          ? formatDetailedAddress(sanitized || detail, geocodedProvince, geocodedDistrict, geocodedWard)
          : formatSpecificAddress(sanitized || detail)
        );
        setAddressForm((a) => ({
          ...a,
          detail: plusCode || specific || sanitized || detail || `Vị trí: ${a.lat?.toFixed(4)}, ${a.lng?.toFixed(4)}`,
          lat: typeof lat === "number" ? lat : a.lat,
          lng: typeof lng === "number" ? lng : a.lng,
          isPinned: !!(typeof lat === "number" ? lat : a.lat) && !!(typeof lng === "number" ? lng : a.lng),
        }));
        setGoogleFullAddress("");
        setCoordLat(typeof lat === "number" ? String(lat) : addressForm.lat ? String(addressForm.lat) : "");
        setCoordLng(typeof lng === "number" ? String(lng) : addressForm.lng ? String(addressForm.lng) : "");
        toast.info("ℹ️ Không thể xác định tỉnh/quận/phường. Vui lòng chọn thủ công từ danh sách.");
        return;
      }

      // If caller doesn't want admin fields changed (map pin / GPS pinning), only update detail/coords
      if (!updateAdminFields) {
        const sanitized = sanitizeDetail(detail, geocodedProvince, geocodedDistrict, geocodedWard);
        const specific = (detailedAddressMode
          ? formatDetailedAddress(sanitized || detail, geocodedProvince, geocodedDistrict, geocodedWard)
          : formatSpecificAddress(sanitized || detail)
        );
        setAddressForm((a) => ({
          ...a,
          detail: plusCode || specific || sanitized || detail || a.detail || `Vị trí: ${a.lat?.toFixed(4)}, ${a.lng?.toFixed(4)}`,
          lat: typeof lat === "number" ? lat : a.lat,
          lng: typeof lng === "number" ? lng : a.lng,
          isPinned: !!(typeof lat === "number" ? lat : a.lat) && !!(typeof lng === "number" ? lng : a.lng),
        }));
        setGoogleFullAddress("");
        setCoordLat(typeof lat === "number" ? String(lat) : addressForm.lat ? String(addressForm.lat) : "");
        setCoordLng(typeof lng === "number" ? String(lng) : addressForm.lng ? String(addressForm.lng) : "");
        setSelectedAddressId("new");
        toast.info("ℹ️ Đã cập nhật mô tả địa chỉ và toạ độ (không thay đổi Tỉnh/Quận/Phường)");
        return;
      }

      const matched = await addressService.matchLocation(geocodedProvince, geocodedDistrict, geocodedWard);
      
      console.debug("[Matched Location]", matched);

      if (matched.province) {
        const districtsList = await addressService.getDistricts(matched.province);
        setDistricts(districtsList);
      }

      if (matched.province && matched.district) {
        const wardsList = await addressService.getWards(matched.province, matched.district);
        setWards(wardsList);
      }

      const sanitized = sanitizeDetail(detail, matched.province || geocodedProvince, matched.district || geocodedDistrict, matched.ward || geocodedWard);
      const specific = (detailedAddressMode
        ? formatDetailedAddress(sanitized || detail, matched.province || geocodedProvince, matched.district || geocodedDistrict, matched.ward || geocodedWard)
        : formatSpecificAddress(sanitized || detail)
      );
      setAddressForm((a) => ({
        ...a,
        name: a.name || (user?.name as string) || "",
        phone: a.phone || (user?.phone as string) || "",
        province: matched.province || geocodedProvince,
        district: matched.district || geocodedDistrict,
        ward: matched.ward || geocodedWard,
        detail: specific || sanitized || detail,
        lat: typeof lat === "number" ? lat : a.lat,
        lng: typeof lng === "number" ? lng : a.lng,
        isPinned: !!(typeof lat === "number" ? lat : a.lat) && !!(typeof lng === "number" ? lng : a.lng),
      }));
      setGoogleFullAddress("");

      setCoordLat(typeof lat === "number" ? String(lat) : addressForm.lat ? String(addressForm.lat) : "");
      setCoordLng(typeof lng === "number" ? String(lng) : addressForm.lng ? String(addressForm.lng) : "");

      setSelectedAddressId("new");

      if (matched.confidence === 1) {
        toast.success("✅ Đã tự động điền đầy đủ Tỉnh/Quận/Phường và địa chỉ chi tiết");
      } else if (matched.confidence >= 0.66) {
        const missingField = !matched.district ? "Quận/Huyện" : !matched.ward ? "Phường/Xã" : "";
        toast.warning(`⚠️ Tìm thấy ${matched.province ? "Tỉnh" : ""}${matched.district ? " / Quận" : ""}${matched.ward ? " / Phường" : ""}. ${missingField ? `Vui lòng chọn ${missingField}` : ""}`);
      } else if (matched.confidence > 0) {
        const found = [matched.province && "Tỉnh", matched.district && "Quận", matched.ward && "Phường"].filter(Boolean).join(" / ");
        toast.warning(`⚠️ Tìm thấy: ${found}. Vui lòng bổ sung thông tin còn lại`);
      } else if (geocodedProvince || geocodedDistrict || geocodedWard) {
        const found = [geocodedProvince && "Tỉnh", geocodedDistrict && "Quận", geocodedWard && "Phường"].filter(Boolean).join(" / ");
        toast.info(`ℹ️ Lấy được: ${found}. Vui lòng chọn từ danh sách hoặc cập nhật thủ công.`);
      } else {
        toast.info("ℹ️ Không tìm thấy tỉnh/quận/phường chi tiết. Vui lòng chọn thủ công từ danh sách.");
      }
    } catch (err) {
      console.error("Failed to match location:", err);
      toast.error("❌ Lỗi khi khớp địa chỉ. Vui lòng thử lại hoặc chọn thủ công.");
    }
  };

  // Use Google Geocoding API to fetch a human-friendly address detail for given coords.
  const fetchGoogleAddress = useCallback(async (lat?: number, lng?: number): Promise<GoogleAddressResult | null> => {
    if (!lat || !lng) return null;
    try {
      const result = await addressService.reverseGeocode(lat, lng);
      if (!result || (!result.detail && !result.plusCode)) {
        toast.info('⚠️ Không lấy được địa chỉ chi tiết, vui lòng nhập thủ công.');
        return null;
      }
      const formattedBase = result.detail || result.plusCode || '';
      const formatted = result.plusCode && formattedBase && !formattedBase.startsWith(result.plusCode)
        ? `${result.plusCode}, ${formattedBase}`
        : formattedBase;

      const rawComponents = Array.isArray(result.raw?.address_components)
        ? result.raw?.address_components
        : undefined;

      return {
        formatted,
        specificDetail: result.detail,
        plusCode: result.plusCode,
        raw: result.raw,
        components: rawComponents,
      };
    } catch (err) {
      console.error('Backend reverseGeocode failed', err);
      toast.error('❌ Không thể truy xuất địa chỉ từ server');
      return null;
    }
  }, []);

  const autofillDetailFromGoogle = useCallback(async (lat?: number, lng?: number, preset?: GoogleAddressResult | null) => {
    if (!lat || !lng || useRawCoords) return false;
    const googleResult = preset ?? (await fetchGoogleAddress(lat, lng));
    if (!googleResult) return false;
    setAddressForm((prev) => {
      const rawDetail = googleResult.specificDetail || googleResult.formatted;
      const sanitized = sanitizeDetail(rawDetail, prev.province, prev.district, prev.ward) || rawDetail;
      const formattedDetail = detailedAddressMode
        ? formatDetailedAddress(sanitized, prev.province, prev.district, prev.ward)
        : formatSpecificAddress(sanitized);
      const preferredDetail = googleResult.plusCode || formattedDetail || sanitized || prev.detail;
      return {
        ...prev,
        detail: preferredDetail,
        lat,
        lng,
        isPinned: true,
      };
    });
    setGoogleFullAddress(googleResult.formatted || googleResult.raw?.formatted_address || "");
    return true;
  }, [detailedAddressMode, fetchGoogleAddress, useRawCoords]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("❌ Trình duyệt của bạn không hỗ trợ GPS");
      return;
    }
    
    toast.info("⏳ Đang lấy vị trí...", { autoClose: 1000 });
    
    const timeoutId = setTimeout(() => {
      toast.error("❌ Lấy vị trí quá lâu. Vui lòng kiểm tra GPS hoặc thử lại.");
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = position.coords;
        const accuracy = position.coords.accuracy;
        
        console.log(`[GPS] Got location: lat=${latitude}, lng=${longitude}, accuracy=${accuracy}m`);
        const prevUseRaw = useRawCoords;
        if (prevUseRaw) setUseRawCoords(false);

        setAddressForm(a => ({ ...a, lat: latitude, lng: longitude, isPinned: true }));
        setCoordLat(String(latitude));
        setCoordLng(String(longitude));
        toast.success(`✅ Đã lấy vị trí hiện tại (Độ chính xác: ${accuracy.toFixed(0)}m)`);

        (async () => {
          try {
            toast.info("⏳ Đang truy xuất địa chỉ...", { autoClose: 2000 });
            const result = await addressService.reverseGeocode(latitude, longitude);
            console.debug("[reverseGeocode] current location result:", result);

            if (result) {
              // GPS pinning should not override the manual province/district/ward selections
              await applyMatchedLocation(result.province, result.district, result.ward, result.detail, latitude, longitude, false, result.plusCode);
            }
            await autofillDetailFromGoogle(latitude, longitude);
            if (prevUseRaw) setUseRawCoords(true);
            // fetch nearby POIs after getting GPS
            void fetchNearbyPlaces(latitude, longitude, nearbyRadius);
          } catch (err) {
            console.error("reverse geocode failed:", err);
            toast.error("❌ Lỗi truy xuất địa chỉ. Toạ độ đã được lưu, vui lòng chọn thủ công nếu cần.");
          }
        })();
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error("[GPS Error]", error.code, error.message);
        
        let errorMsg = "❌ Lỗi lấy vị trí. ";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += "Vui lòng cấp quyền truy cập GPS cho ứng dụng.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += "Không thể xác định vị trí. Vui lòng kiểm tra GPS.";
            break;
          case error.TIMEOUT:
            errorMsg += "Lấy vị trí quá lâu. Vui lòng thử lại.";
            break;
          default:
            errorMsg += "Vui lòng thử lại hoặc sử dụng chế độ thủ công.";
        }
        toast.error(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const applyCoordinates = async () => {
    const lat = parseFloat(coordLat);
    const lng = parseFloat(coordLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Vui lòng nhập toạ độ hợp lệ (lat, lng)");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Toạ độ ngoài phạm vi hợp lệ. Latitude: -90..90, Longitude: -180..180");
      return;
    }

    setAddressForm(a => ({ ...a, lat, lng, isPinned: true }));
    toast.info(`⏳ Áp dụng toạ độ: ${lat.toFixed(6)}, ${lng.toFixed(6)} ...`);

    if (useRawCoords) {
      setAddressForm(a => ({ ...a, detail: `Toạ độ gốc: ${lat.toFixed(6)}, ${lng.toFixed(6)}` }));
      toast.success("✅ Đã áp dụng toạ độ gốc (không tự động ghép)");
      return;
    }

    try {
      const result = await addressService.reverseGeocode(lat, lng);
      console.debug("[reverseGeocode] applyCoordinates result:", result);
    if (result) {
      // Applying raw coords (manual input) should update only detail/coords unless user explicitly wants admin fields changed
      await applyMatchedLocation(result.province, result.district, result.ward, result.detail, lat, lng, false, result.plusCode);
      await autofillDetailFromGoogle(lat, lng);
      toast.success("✅ Đã cập nhật địa chỉ từ toạ độ (không thay đổi Tỉnh/Quận/Phường)");
      // fetch nearby POIs when user applies coordinates
      void fetchNearbyPlaces(lat, lng, nearbyRadius);
    }
    } catch (err) {
      console.error("applyCoordinates reverse geocode failed:", err);
      toast.error("❌ Lỗi khi truy xuất địa chỉ từ toạ độ");
    }
  };

  const handleSaveAddressToProfile = async () => {
    if (!user) {
      toast.warning("Vui lòng đăng nhập để lưu địa chỉ.");
      return;
    }
    const toSave: Address = { ...addressForm, id: addressForm.id || Date.now().toString() };
    const newList = [...addresses.filter(a => a.id !== toSave.id), toSave];
    try {
      await userService.updateProfile({ addresses: newList });
      setAddresses(newList);
      setSelectedAddressId(toSave.id as string);
      toast.success("Đã lưu địa chỉ vào hồ sơ.");
    } catch (err) {
      console.error(err);
      toast.error("Lưu địa chỉ thất bại.");
    }
  };

  // delete address helper
  const deleteAddress = async (addrId: string) => {
    try {
      const newList = addresses.filter((a) => a.id !== addrId);
      await userService.updateProfile({ addresses: newList });
      setAddresses(newList);
      if (selectedAddressId === addrId) {
        setSelectedAddressId(newList[0]?.id || null);
      }
      toast.success("Đã xoá địa chỉ");
    } catch (err) {
      console.error(err);
      toast.error("Xoá địa chỉ thất bại");
    }
  };

  // Confirmation handlers
  const confirmSaveAction = async () => {
    setConfirmSaveOpen(false);
    // persist address to profile when user confirms saving
    await handleSaveAddressToProfile();
  };

  const confirmDeleteAction = async () => {
    setConfirmDeleteOpen(false);
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    await deleteAddress(id);
  };

  // totalPrice moved earlier next to items state to avoid TDZ / "used before declaration" errors

  const redirectToPayos = async (orderId: string) => {
    try {
      toast.info("🔁 Đang tạo liên kết PayOS...", { autoClose: 1500 });
      const link = await paymentService.createPayosLink(orderId);
      if (!link.checkoutUrl) {
        throw new Error("Không lấy được liên kết PayOS");
      }
      window.location.href = link.checkoutUrl;
    } catch (err) {
      console.error("PayOS link error:", err);
      type MaybeAxiosError = { response?: { status?: number; data?: { message?: string } } };
      const anyErr = err as unknown as MaybeAxiosError;
      if (anyErr?.response?.status === 409) {
        const srvMsg = anyErr.response?.data?.message || "Xung đột khi tạo PayOS link";
        toast.error(srvMsg, { position: "top-center", autoClose: 3000 });
        if (/(đã được thanh toán|Đơn hàng đã được thanh toán|processing|completed)/i.test(String(srvMsg))) {
          setTimeout(() => navigate(`/checkout-success/${orderId}`), 1200);
          return;
        }
        return;
      }

      const message = anyErr instanceof Error ? anyErr.message : "Không tạo được liên kết PayOS.";
      toast.error(message, {
        position: "top-center",
        autoClose: 3000,
      });
    }
  };

  const handleCheckout = async () => {
    const finalAddress = addressForm.detail || "";
    if (!finalAddress) {
      toast.warning("⚠️ Vui lòng điền đầy đủ thông tin địa chỉ!", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (!addressForm.province || !addressForm.district || !addressForm.ward) {
      toast.warning("⚠️ Vui lòng chọn Tỉnh/Thành, Quận/Huyện, Phường/Xã!", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    setProcessing(true);

    if (!user) {
      toast.warning("Vui lòng đăng nhập trước khi thanh toán.");
      setProcessing(false);
      return;
    }

    const resolvedProductId = cartId
      ? undefined
      : items[0]
      ? typeof items[0].productId === "string"
        ? items[0].productId
        : items[0].productId._id
      : undefined;
    const payload: CheckoutPayload = {
      userId: user?._id ? String(user._id) : String(user?.id),
      fullName: user.name || "",
      email: user.email || "",
      address: finalAddress,
      paymentMethod,
      items,
      total: totalPrice,
      voucherCode: selectedVoucher?.code,
      mode: cartId ? "cart" : "buy-now",
      productId: resolvedProductId,
      shippingAddress: { ...addressForm },
      shippingOption: {
        method: shippingMethod,
        rushDistanceKm: rushDistanceOverride,
      },
    };

    console.log("📤 Checkout payload:", {
      userId: payload.userId,
      itemsCount: payload.items.length,
      items: payload.items,
      shippingAddress: payload.shippingAddress,
      shippingOption: payload.shippingOption,
      totalPrice: payload.total,
    });

    try {
      const res: CheckoutResult = await cartService.checkout(payload);
      if (paymentMethod === "cod") {
        toast.success(`✅ Đặt hàng thành công! Mã đơn: ${res.orderId}`, {
          position: "top-center",
          autoClose: 2000,
        });
        setTimeout(() => navigate(`/checkout-success/${res.orderId}`), 1200);
      } else {
        toast.info("📄 Đơn hàng đã tạo. Vui lòng hoàn tất thanh toán PayOS.", {
          position: "top-center",
          autoClose: 3000,
        });
        await redirectToPayos(res.orderId);
      }

      try {
        window.dispatchEvent(new CustomEvent("orderPlaced", { detail: { orderId: res.orderId } }));
      } catch {
        // ignore
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Thanh toán thất bại!";
      toast.error(`❌ ${message}`, {
        position: "top-center",
        autoClose: 2000,
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: "100vh", 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <CircularProgress sx={{ color: 'white' }} size={60} />
      </Box>
    );
  }

  return (
    <>
      <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #fff9f5 0%, #f3f7ff 45%, #f7fbff 100%)",
        py: { xs: 4, md: 6 },
        px: { xs: 2, md: 0 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Paper
            sx={{
              borderRadius: 5,
              p: { xs: 3.5, md: 5 },
              background: "linear-gradient(120deg, rgba(255,255,255,0.95), rgba(255,250,244,0.95))",
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow: "0 40px 90px rgba(15,23,42,0.12)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 20% 10%, rgba(255,144,94,0.15), transparent 45%), radial-gradient(circle at 80% 0%, rgba(99,102,241,0.12), transparent 40%)",
              }}
            />
            <Stack spacing={3.5} sx={{ position: "relative", zIndex: 1 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3} justifyContent="space-between">
                <Box>
                  <Typography variant="overline" sx={{ letterSpacing: 8, color: "#94a3b8" }}>
                    CHECKOUT FLOW
                  </Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ color: "#0f172a", mb: 1 }}>
                    Hoàn thiện đơn hàng sang xịn mịn
                  </Typography>
                  <Typography sx={{ color: "#475569", maxWidth: 520 }}>
                    Soát lại sản phẩm, ưu đãi và địa chỉ trước khi đặt. Tất cả các bước được gom vào một bảng điều khiển nhẹ nhàng.
                  </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" flexWrap="wrap">
                  {checkoutSteps.map((step, index) => (
                    <Box key={step.label} sx={{ display: "flex", alignItems: "center", width: { xs: "100%", md: "auto" } }}>
                      <Chip
                        label={step.label}
                        color={step.status === "done" ? "success" : step.status === "current" ? "primary" : "default"}
                        variant={step.status === "next" ? "outlined" : "filled"}
                        sx={{ fontWeight: 600, minWidth: 160, justifyContent: "center" }}
                      />
                      {index < checkoutSteps.length - 1 && (
                        <Box
                          sx={{
                            flex: 1,
                            height: 2,
                            mx: 1,
                            background: "rgba(15,23,42,0.12)",
                            display: { xs: "none", md: "block" },
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Stack>
              </Stack>

              <Grid container spacing={2}>
                {heroStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Grid item xs={12} sm={6} md={3} key={stat.label}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          background: "rgba(255,255,255,0.8)",
                          border: "1px solid rgba(15,23,42,0.06)",
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 3,
                            background: `${stat.color}22`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: stat.color,
                          }}
                        >
                          <Icon />
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                            {stat.label}
                          </Typography>
                          <Typography variant="h5" fontWeight={800} sx={{ color: "#0f172a" }}>
                            {stat.value}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748b" }}>
                            {stat.caption}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>

              <Box
                sx={{
                  p: { xs: 2.5, md: 3 },
                  borderRadius: 4,
                  background: "linear-gradient(135deg, #fff7ed, #e0f2fe)",
                  border: "1px solid rgba(15,23,42,0.05)",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography fontWeight={700} color="#0f172a">
                    Ưu đãi vận chuyển
                  </Typography>
                  <Typography variant="caption" color="#475569">
                    Mục tiêu {formatCurrency(FREE_SHIPPING_THRESHOLD)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={shippingProgress}
                  sx={{
                    height: 12,
                    borderRadius: 999,
                    backgroundColor: "rgba(15,23,42,0.08)",
                    mb: 1,
                    "& .MuiLinearProgress-bar": {
                      background: "linear-gradient(90deg, #fb923c, #f43f5e)",
                    },
                  }}
                />
                <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>
                  {freeShippingMessage}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                <Paper
                  sx={{
                    borderRadius: 4,
                    p: { xs: 3, md: 4 },
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(15,23,42,0.06)",
                    boxShadow: "0 35px 80px rgba(15,23,42,0.08)",
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ sm: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4338ca" }}>
                        <ShoppingBagOutlinedIcon />
                      </Box>
                      <Box>
                        <Typography fontWeight={700}>Danh sách sản phẩm</Typography>
                        <Typography variant="body2" color="text.secondary">Tối ưu từng item trước khi đặt</Typography>
                      </Box>
                    </Box>
                    <Chip label={`${cartItemCount} sản phẩm`} color="primary" variant="outlined" />
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  <Stack spacing={2.5}>
                    {items.map((item) => (
                      <Paper
                        key={item.productId._id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          borderColor: "rgba(15,23,42,0.08)",
                          background: "linear-gradient(120deg, rgba(248,250,252,0.9), rgba(255,255,255,0.9))",
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          {item.productId.images && item.productId.images[0] && (
                            <Avatar src={item.productId.images[0]} variant="rounded" sx={{ width: 64, height: 64 }} />
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={700}>{item.productId.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Số lượng: {item.quantity} × {formatCurrency(item.productId.price)}
                            </Typography>
                          </Box>
                          <Typography fontWeight={700} color="primary">
                            {formatCurrency(item.productId.price * item.quantity)}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  <Stack spacing={2}>
                    <Button
                      variant={selectedVoucher ? "contained" : "outlined"}
                      startIcon={<LocalOfferIcon />}
                      onClick={() => setVoucherDialogOpen(true)}
                      sx={{
                        alignSelf: "flex-start",
                        textTransform: "none",
                        fontWeight: 700,
                        background: selectedVoucher ? "linear-gradient(120deg, #f97316, #fb7185)" : undefined,
                        color: selectedVoucher ? "white" : undefined,
                      }}
                    >
                      {selectedVoucher ? "Đổi voucher" : "Áp dụng voucher"}
                    </Button>
                    {selectedVoucher && (
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderColor: "rgba(249,115,22,0.4)" }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                          <Chip label={selectedVoucher.code} color="primary" />
                          <Typography color="success.main" fontWeight={700}>
                            {selectedVoucher.freeShipping
                              ? requiresAddressForShipping
                                ? "Freeship (chờ địa chỉ)"
                                : shippingDiscount > 0
                                  ? `- ${formatCurrency(shippingDiscount)}`
                                  : "Freeship"
                              : `- ${formatCurrency(voucherDiscount)}`}
                          </Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {selectedVoucher.freeShipping
                                ? "Voucher này miễn toàn bộ phí vận chuyển cho đơn hàng."
                                : "Áp dụng cho toàn bộ đơn hàng hiện tại."}
                            </Typography>
                          </Box>
                          <Button size="small" color="error" onClick={handleRemoveVoucher}>
                            Bỏ voucher
                          </Button>
                        </Stack>
                      </Paper>
                    )}
                    {voucherLoading && userVouchers.length === 0 && <LinearProgress sx={{ borderRadius: 999 }} />}
                    {!voucherLoading && userVouchers.length > 0 && (
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Voucher khả dụng cho đơn này
                        </Typography>
                        {userVouchers.slice(0, 3).map((voucher) => {
                          const applicable = voucher.applicable !== false;
                          const isSelected = selectedVoucherCode === voucher.code;
                          const isApplying = applyingVoucherCode === voucher.code;
                          return (
                            <Paper
                              key={voucher._id ?? voucher.code}
                              variant="outlined"
                              sx={{
                                p: 1.75,
                                borderRadius: 3,
                                borderColor: isSelected ? "primary.main" : "rgba(15,23,42,0.08)",
                                background: isSelected ? "rgba(59,130,246,0.06)" : undefined,
                              }}
                            >
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography fontWeight={700}>
                                    {voucher.code}
                                    {isSelected && " • Đang áp dụng"}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {voucher.freeShipping
                                      ? "Miễn phí toàn bộ phí vận chuyển"
                                      : voucher.type === "percent"
                                        ? `${voucher.value}% tối đa ${voucher.maxDiscount ? formatCurrency(voucher.maxDiscount) : "không giới hạn"}`
                                        : `Giảm ${formatCurrency(voucher.value)}`}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Đơn tối thiểu: {voucher.minOrderValue ? formatCurrency(voucher.minOrderValue) : "Không"} • HSD: {formatDate(voucher.expiresAt)}
                                  </Typography>
                                  <Typography variant="caption" color={applicable ? "success.main" : "error.main"} display="block">
                                    {applicable ? "Đủ điều kiện" : voucher.reason || "Chưa đạt điều kiện"}
                                  </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                                  <Tooltip title="Chi tiết">
                                    <IconButton size="small" onClick={() => showVoucherDetail(voucher)}>
                                      <InfoOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Button
                                    variant={isSelected ? "outlined" : "contained"}
                                    color={applicable ? "primary" : "inherit"}
                                    disabled={!applicable || isApplying}
                                    onClick={() => handleApplyVoucher(voucher)}
                                    size="small"
                                    sx={{ minWidth: 120 }}
                                  >
                                    {isApplying ? (
                                      <CircularProgress size={18} sx={{ color: isSelected ? "text.primary" : "white" }} />
                                    ) : isSelected ? (
                                      "Đang dùng"
                                    ) : (
                                      "Dùng mã"
                                    )}
                                  </Button>
                                </Stack>
                              </Stack>
                            </Paper>
                          );
                        })}
                        {userVouchers.length > 3 && (
                          <Button size="small" onClick={() => setVoucherDialogOpen(true)}>
                            Xem thêm {userVouchers.length - 3} voucher khác
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>
                </Paper>

                <Paper
                  sx={{
                    borderRadius: 4,
                    p: { xs: 3, md: 4 },
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(15,23,42,0.06)",
                    boxShadow: "0 35px 80px rgba(15,23,42,0.08)",
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ sm: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2, background: "#ecfeff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0891b2" }}>
                        <LocalShippingOutlinedIcon />
                      </Box>
                      <Box>
                        <Typography fontWeight={700}>Địa chỉ & vận chuyển</Typography>
                        <Typography variant="body2" color="text.secondary">Đảm bảo shipper biết chính xác nơi đến</Typography>
                      </Box>
                    </Box>
                    <Button variant="outlined" size="small" onClick={() => setAddressDialogOpen(true)}>
                      Quản lý địa chỉ
                    </Button>
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: "1px dashed rgba(15,23,42,0.12)",
                    background: "rgba(248,250,252,0.7)",
                  }}>
                    {addresses.length > 0 && selectedAddressId && selectedAddressId !== "new" ? (
                      (() => {
                        const found = addresses.find((a) => a.id === selectedAddressId);
                        return found ? (
                          <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography fontWeight={700}>{found.name} • {found.phone}</Typography>
                              {found.isDefault && <Chip label="Mặc định" size="small" color="primary" />}
                              {found.id === selectedAddressId && <Chip label="Đã chọn" size="small" color="success" />}
                            </Stack>
                            <Typography variant="body2" color="text.secondary">{found.detail}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {[found.ward, found.district, found.province].filter(Boolean).join(", ")}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.secondary">Chưa chọn địa chỉ</Typography>
                        );
                      })()
                    ) : (
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          Vui lòng chọn hoặc thêm địa chỉ giao hàng để ước tính phí chính xác.
                        </Typography>
                        <Button variant="contained" size="small" onClick={() => setAddressDialogOpen(true)}>
                          Chọn/Thêm địa chỉ
                        </Button>
                      </Stack>
                    )}
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Phương thức vận chuyển</Typography>
                  <RadioGroup value={shippingMethod} onChange={(event) => setShippingMethod(event.target.value as ShippingMethod)}>
                    <Grid container spacing={1.5}>
                      {SHIPPING_METHOD_OPTIONS.map((option) => {
                        const isActive = option.value === shippingMethod;
                        return (
                          <Grid item xs={12} sm={12} key={option.value}>
                            <Paper
                              elevation={0}
                              sx={{
                                p: 2,
                                borderRadius: 3,
                                border: isActive ? "2px solid rgba(79,70,229,0.6)" : "1px solid rgba(15,23,42,0.08)",
                                background: isActive ? "rgba(79,70,229,0.04)" : "rgba(255,255,255,0.8)",
                                transition: "all 0.3s",
                              }}
                            >
                              <FormControlLabel
                                value={option.value}
                                control={<Radio sx={{ color: "#4338ca" }} />}
                                label={
                                  <Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Typography fontWeight={700}>{option.title}</Typography>
                                      <Chip label={option.badge} size="small" color={option.badgeColor} />
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">
                                      {describeShippingMethod(option.value)}
                                    </Typography>
                                  </Box>
                                }
                                sx={{ width: "100%", m: 0 }}
                              />
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </RadioGroup>
                  <Typography variant="body2" color={requiresAddressForShipping ? "warning.main" : "text.secondary"} sx={{ mt: 2 }}>
                    {requiresAddressForShipping ? "Vui lòng hoàn tất tỉnh/thành để ước tính phí." : `Ước tính phí: ${shippingFeeLabel}`}
                  </Typography>
                </Paper>

                <Paper
                  sx={{
                    borderRadius: 4,
                    p: { xs: 3, md: 4 },
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(15,23,42,0.06)",
                    boxShadow: "0 35px 80px rgba(15,23,42,0.08)",
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ sm: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", color: "#0f766e" }}>
                        <PaymentOutlinedIcon />
                      </Box>
                      <Box>
                        <Typography fontWeight={700}>Phương thức thanh toán</Typography>
                        <Typography variant="body2" color="text.secondary">Chọn lựa phù hợp với thói quen của bạn</Typography>
                      </Box>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                    <Stack spacing={1.5}>
                      {[{
                        value: "payos",
                        title: "PayOS (QR / Ngân hàng)",
                        description: "Thanh toán qua mã QR hoặc liên kết ngân hàng",
                        badge: "Nhanh chóng",
                        icon: "⚡",
                      }, {
                        value: "cod",
                        title: "Thanh toán khi nhận hàng (COD)",
                        description: "Thanh toán bằng tiền mặt khi nhận hàng",
                        badge: "Tiện lợi",
                        icon: "📦",
                      }].map((method) => {
                        const isActive = paymentMethod === method.value;
                        return (
                          <Paper
                            key={method.value}
                            elevation={0}
                            sx={{
                              p: 2.5,
                              borderRadius: 3,
                              border: isActive ? "2px solid rgba(16,185,129,0.6)" : "1px solid rgba(15,23,42,0.08)",
                              background: isActive ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.85)",
                              transition: "all 0.3s",
                            }}
                          >
                            <FormControlLabel
                              value={method.value}
                              control={<Radio sx={{ color: "#0f766e" }} />}
                              label={
                                <Stack spacing={0.5}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography fontWeight={700}>{method.icon} {method.title}</Typography>
                                    <Chip label={method.badge} size="small" color={method.value === "payos" ? "primary" : "success"} />
                                  </Stack>
                                  <Typography variant="caption" color="text.secondary">
                                    {method.description}
                                  </Typography>
                                </Stack>
                              }
                              sx={{ width: "100%", m: 0 }}
                            />
                          </Paper>
                        );
                      })}
                    </Stack>
                  </RadioGroup>
                </Paper>
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper
                sx={{
                  borderRadius: 4,
                  position: "sticky",
                  top: 120,
                  p: { xs: 3, md: 4 },
                  background: "linear-gradient(180deg, #ffffff, #f8fbff)",
                  border: "1px solid rgba(15,23,42,0.08)",
                  boxShadow: "0 40px 90px rgba(15,23,42,0.12)",
                }}
              >
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4338ca" }}>
                      <ShoppingBagOutlinedIcon />
                    </Box>
                    <Box>
                      <Typography fontWeight={700}>Đơn hàng của bạn</Typography>
                      <Typography variant="body2" color="text.secondary">Kiểm tra lại trước khi đặt</Typography>
                    </Box>
                  </Box>

                  <Divider />

                  <Stack spacing={1.5}>
                    {items.map((item) => (
                      <Stack key={item.productId._id} direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography fontWeight={600}>{item.productId.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Số lượng: {item.quantity}
                          </Typography>
                        </Box>
                        <Typography fontWeight={700}>{formatCurrency(item.productId.price * item.quantity)}</Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Divider />

                  <Stack spacing={1.25}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">Tạm tính</Typography>
                      <Typography fontWeight={600}>{formatCurrency(totalPrice)}</Typography>
                    </Box>
                    {selectedVoucher && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          {selectedVoucher.freeShipping ? `Voucher freeship (${selectedVoucher.code})` : `Voucher (${selectedVoucher.code})`}
                        </Typography>
                        <Typography fontWeight={600} color={selectedVoucher.freeShipping ? "success.main" : "error"}>
                          {selectedVoucher.freeShipping
                            ? requiresAddressForShipping
                              ? "Chờ địa chỉ"
                              : shippingDiscount > 0
                                ? `-${formatCurrency(shippingDiscount)}`
                                : "Freeship"
                            : `-${formatCurrency(voucherDiscount)}`}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">Phí vận chuyển ({shippingMethodTitle})</Typography>
                      <Typography fontWeight={600} color={
                        requiresAddressForShipping ? "warning.main" : effectiveShippingFee > 0 ? "text.primary" : "success.main"
                      }>
                        {requiresAddressForShipping ? "Cập nhật địa chỉ" : shippingFeeLabel}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider />

                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 3,
                      background: "linear-gradient(120deg, #dbeafe, #ede9fe)",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Tổng cộng
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="primary">
                      {formatCurrency(finalTotal)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Đã gồm ưu đãi và phí vận chuyển
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleCheckout}
                    disabled={processing}
                    sx={{
                      py: 1.5,
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      background: processing ? "grey" : "linear-gradient(120deg, #ec4899, #f97316)",
                      boxShadow: "0 20px 45px rgba(249,115,22,0.35)",
                      "&:hover": {
                        background: processing ? "grey" : "linear-gradient(120deg, #db2777, #ea580c)",
                      },
                      "&:disabled": {
                        background: "grey",
                        color: "white",
                      },
                    }}
                  >
                    {processing ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CircularProgress size={20} sx={{ color: "white" }} />
                        Đang xử lý...
                      </Box>
                    ) : paymentMethod === "cod" ? (
                      "📦 Đặt Hàng COD"
                    ) : (
                      "⚡ Thanh Toán PayOS"
                    )}
                  </Button>

                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                    🔒 Thông tin của bạn được bảo mật tuyệt đối.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>

      {/* Address Management Dialog */}
      <Dialog
        open={addressDialogOpen}
        onClose={() => setAddressDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 5,
            overflow: "hidden",
            background: "linear-gradient(135deg, #fdf2f8, #eef2ff)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(120deg, #ec4899, #6366f1)",
            color: "white",
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          📍 Trung Tâm Quản Lý Địa Chỉ
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 4,
                    background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={800} color="#312e81" sx={{ mb: 0.5 }}>
                      Đồng bộ toàn bộ địa chỉ giao hàng
                    </Typography>
                    <Typography variant="body2" color="#4338ca">
                      Chọn nhanh địa chỉ đã lưu hoặc cập nhật thông tin mới để đảm bảo shipper đến đúng nơi.
                    </Typography>
                  </Box>
                  <Chip label={`${addresses.length} địa chỉ đã lưu`} color="primary" variant="outlined" />
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={2.5}>
                  <Paper sx={{ p: 2.5, borderRadius: 4, background: "#fff", border: "1px solid rgba(15,23,42,0.08)" }}>
                    <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                      Địa chỉ đã lưu
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Chạm để xem nhanh hoặc chỉnh sửa.
                    </Typography>
                  </Paper>

                  {addresses.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: "center", borderRadius: 4, border: "1px dashed rgba(148,163,184,0.6)", background: "rgba(248,250,252,0.8)" }}>
                      <Typography fontWeight={600}>Bạn chưa có địa chỉ nào.</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Dùng bảng bên phải để thêm địa chỉ đầu tiên.
                      </Typography>
                    </Paper>
                  ) : (
                    <Paper sx={{ p: 2, borderRadius: 4, border: "1px solid rgba(148,163,184,0.4)", background: "white" }}>
                      <Stack spacing={1.5} sx={{ maxHeight: 420, overflowY: "auto", pr: 1 }}>
                        {addresses.map((a) => {
                          const isActive = a.id === selectedAddressId;
                          return (
                            <Paper
                              key={a.id}
                              variant="outlined"
                              sx={{
                                p: 1.75,
                                borderRadius: 3,
                                borderColor: isActive ? "rgba(79,70,229,0.6)" : "rgba(226,232,240,0.8)",
                                background: isActive ? "rgba(79,70,229,0.05)" : "rgba(248,250,252,0.8)",
                                transition: "all 0.3s",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                if (a.id) {
                                  setSelectedAddressId(a.id);
                                } else {
                                  setSelectedAddressId("new");
                                }
                                setAddressForm(a);
                              }}
                            >
                              <Stack spacing={0.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography fontWeight={700}>{a.name} • {a.phone}</Typography>
                                  {a.isDefault && <Chip label="Mặc định" size="small" color="primary" />}
                                  {isActive && <Chip label="Đang chỉnh" size="small" color="success" />}
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                  {a.detail}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {[a.ward, a.district].filter(Boolean).join(", ")}
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                  <Button size="small" variant="outlined" onClick={(event) => {
                                    event.stopPropagation();
                                    if (a.id) {
                                      setSelectedAddressId(a.id);
                                      setAddressForm(a);
                                    }
                                  }}>
                                    Sửa
                                  </Button>
                                  <Button size="small" variant="contained" onClick={(event) => {
                                    event.stopPropagation();
                                    if (a.id) {
                                      setSelectedAddressId(a.id);
                                      setAddressForm(a);
                                      setAddressDialogOpen(false);
                                    }
                                  }}>
                                    Dùng địa chỉ
                                  </Button>
                                  <Button size="small" color="error" onClick={(event) => {
                                    event.stopPropagation();
                                    if (a.id) {
                                      setDeleteTargetId(a.id);
                                      setConfirmDeleteOpen(true);
                                    }
                                  }}>
                                    Xoá
                                  </Button>
                                </Stack>
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Paper>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<MyLocationIcon />}
                    onClick={() => {
                      setSelectedAddressId("new");
                      setAddressForm({
                        id: undefined,
                        name: "",
                        phone: "",
                        province: "",
                        district: "",
                        ward: "",
                        detail: "",
                        lat: undefined,
                        lng: undefined,
                        type: "home",
                        isDefault: false,
                      });
                    }}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Thêm địa chỉ mới
                  </Button>
                </Stack>
              </Grid>

              <Grid item xs={12} md={8}>
                <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid rgba(15,23,42,0.08)", background: "white" }}>
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography fontWeight={800} sx={{ mb: 0.5 }}>
                        Cập nhật chi tiết địa chỉ
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Điền đủ các trường để tối ưu ước tính phí ship.
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Người nhận" value={addressForm.name} onChange={e => setAddressForm(s => ({ ...s, name: e.target.value }))} fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Số điện thoại" value={addressForm.phone} onChange={e => setAddressForm(s => ({ ...s, phone: e.target.value }))} fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                          <InputLabel>Tỉnh/Thành</InputLabel>
                          <Select value={addressForm.province} label="Tỉnh/Thành" onChange={async (e) => { const province = e.target.value; setAddressForm(s => ({ ...s, province, district: '', ward: '' })); const districtsList = await addressService.getDistricts(province); setDistricts(districtsList); }}>
                            <MenuItem value="">-- Chọn Tỉnh/Thành --</MenuItem>
                            {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth disabled={!addressForm.province}>
                          <InputLabel>Quận/Huyện</InputLabel>
                          <Select value={addressForm.district} label="Quận/Huyện" onChange={async (e) => { const d = e.target.value; setAddressForm(s => ({ ...s, district: d, ward: '' })); const wardsList = await addressService.getWards(addressForm.province, d); setWards(wardsList); }}>
                            <MenuItem value="">-- Chọn Quận/Huyện --</MenuItem>
                            {districts.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth disabled={!addressForm.district}>
                          <InputLabel>Phường/Xã</InputLabel>
                          <Select value={addressForm.ward} label="Phường/Xã" onChange={e => setAddressForm(s => ({ ...s, ward: e.target.value }))}>
                            <MenuItem value="">-- Chọn Phường/Xã --</MenuItem>
                            {wards.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Địa chỉ cụ thể"
                          placeholder="Ví dụ: 7P26+GH Quận 1, Thành phố Hồ Chí Minh"
                          value={addressForm.detail}
                          onChange={e => {
                            setGoogleFullAddress("");
                            setAddressForm(s => ({ ...s, detail: e.target.value }));
                          }}
                          onBlur={() => {
                            const raw = addressForm.detail;
                            const sanitized = sanitizeDetail(raw, addressForm.province, addressForm.district, addressForm.ward) || raw;
                            const formatted = detailedAddressMode
                              ? formatDetailedAddress(sanitized, addressForm.province, addressForm.district, addressForm.ward)
                              : formatSpecificAddress(sanitized);
                            if (formatted && formatted !== raw) {
                              setAddressForm(s => ({ ...s, detail: formatted }));
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const text = e.clipboardData?.getData('text') || '';
                            const sanitized = sanitizeDetail(text, addressForm.province, addressForm.district, addressForm.ward) || text;
                            const formatted = detailedAddressMode
                              ? formatDetailedAddress(sanitized, addressForm.province, addressForm.district, addressForm.ward)
                              : formatSpecificAddress(sanitized);
                            setGoogleFullAddress("");
                            setAddressForm(s => ({ ...s, detail: formatted || sanitized }));
                          }}
                          fullWidth
                          multiline
                          rows={2}
                        />
                      </Grid>
                      {googleFullAddress && (
                        <Grid item xs={12}>
                          <Alert
                            severity="info"
                            icon={<PublicIcon fontSize="small" />}
                            action={
                              <Button size="small" color="inherit" onClick={() => copyGoogleAddress()}>
                                Sao chép
                              </Button>
                            }
                            sx={{ alignItems: 'center' }}
                          >
                            <Stack spacing={0.5}>
                              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.3 }}>
                                Google Maps đề xuất
                              </Typography>
                              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                {googleFullAddress}
                              </Typography>
                            </Stack>
                          </Alert>
                        </Grid>
                      )}
                    </Grid>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 4,
                        background: 'linear-gradient(140deg, #eef2ff 0%, #e0f2fe 100%)',
                        border: '1px solid rgba(79,70,229,0.15)',
                        boxShadow: '0 30px 70px rgba(148,163,184,0.35)'
                      }}
                    >
                      <Stack spacing={2.5}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                            Bản đồ trực quan
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Kéo thả ghim hoặc chọn một gợi ý gần đó để cập nhật toạ độ chính xác nhất.
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            position: 'relative',
                            borderRadius: 4,
                            overflow: 'hidden',
                            background: 'radial-gradient(circle at top, rgba(238,242,255,0.85), rgba(224,242,254,0.4))',
                            border: '1px solid rgba(99,102,241,0.25)',
                            boxShadow: '0 25px 60px rgba(79,70,229,0.25)',
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              pointerEvents: 'none',
                              background: 'linear-gradient(120deg, rgba(236,72,153,0.08), rgba(59,130,246,0.08))'
                            }}
                          />

                          <Box sx={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1200, pointerEvents: 'none' }}>
                            <Chip
                              label={`${nearbyPlaces.length} gợi ý quanh đây`}
                              color="primary"
                              sx={{ bgcolor: 'rgba(37,99,235,0.9)', color: 'white', fontWeight: 700 }}
                            />
                          </Box>

                          <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1300, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                            <ToggleButtonGroup
                              size="small"
                              exclusive
                              value={mapStyle}
                              onChange={(_, value) => {
                                if (value) setMapStyle(value);
                              }}
                              sx={{
                                background: 'rgba(15,23,42,0.85)',
                                borderRadius: 999,
                                '& .MuiToggleButton-root': {
                                  color: 'rgba(255,255,255,0.75)',
                                  border: 'none',
                                  textTransform: 'none',
                                  px: 1.5,
                                  '&.Mui-selected': {
                                    background: 'linear-gradient(120deg,#a855f7,#ec4899)',
                                    color: '#fff',
                                  },
                                },
                              }}
                            >
                              {mapLayerOptions.map((option) => (
                                <ToggleButton key={option.value} value={option.value}>
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    {option.icon}
                                    <Typography variant="caption">{option.label}</Typography>
                                  </Stack>
                                </ToggleButton>
                              ))}
                            </ToggleButtonGroup>
                            <Tooltip title="Lấy vị trí hiện tại">
                              <IconButton
                                onClick={handleGetCurrentLocation}
                                size="small"
                                sx={{ bgcolor: 'white', boxShadow: 2, '&:hover': { bgcolor: '#e0f2fe' } }}
                              >
                                <MyLocationIcon sx={{ color: '#0ea5e9' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Lấy địa chỉ từ Google Maps">
                              <IconButton
                                onClick={async () => {
                                  if (!addressForm.lat || !addressForm.lng) {
                                    toast.warning('Vui lòng ghim vị trí trước khi lấy địa chỉ từ Google Maps');
                                    return;
                                  }
                                  const lat = addressForm.lat as number;
                                  const lng = addressForm.lng as number;
                                  const res = await fetchGoogleAddress(lat, lng);
                                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                                  try { window.open(mapsUrl, '_blank'); } catch (err) { console.warn('Failed to open Google Maps tab', err); }
                                  if (!res) {
                                    toast.info('Không lấy được địa chỉ chi tiết từ Google. Đã mở Google Maps để bạn kiểm tra.');
                                    return;
                                  }
                                  setAddressForm(a => ({ ...a, lat, lng, isPinned: true }));
                                  setCoordLat(String(lat));
                                  setCoordLng(String(lng));
                                  setSelectedAddressId('new');
                                  await autofillDetailFromGoogle(lat, lng, res);
                                  toast.success('✅ Đã lấy địa chỉ chi tiết từ Google Maps');
                                }}
                                size="small"
                                sx={{ bgcolor: 'white', boxShadow: 2, '&:hover': { bgcolor: '#fff1f2' } }}
                              >
                                <PublicIcon sx={{ color: '#ef4444' }} />
                              </IconButton>
                            </Tooltip>
                            <Chip
                              icon={<ExploreOutlinedIcon fontSize="small" />}
                              label={`Bán kính ${nearbyRadius >= 1000 ? `${(nearbyRadius / 1000).toFixed(1)} km` : `${nearbyRadius} m`}`}
                              variant="outlined"
                              sx={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white', bgcolor: 'rgba(15,23,42,0.65)' }}
                            />
                          </Box>

                          <MapContainer
                            center={addressForm.lat && addressForm.lng ? [addressForm.lat, addressForm.lng] : [21.0278, 105.8342]}
                            zoom={14}
                            style={{ height: 360, width: '100%', filter: 'saturate(1.1) contrast(1.04)' }}
                          >
                            <TileLayer url={buildGoogleTileUrl(mapStyle)} />
                            <LocationMarker />
                            <DraggablePin lat={addressForm.lat} lng={addressForm.lng} />
                            <MapPanner lat={addressForm.lat} lng={addressForm.lng} />
                          </MapContainer>
                        </Box>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              if (addressForm.lat && addressForm.lng) {
                                void fetchNearbyPlaces(addressForm.lat, addressForm.lng, nearbyRadius);
                              } else {
                                toast.warning('Vui lòng ghim vị trí trước');
                              }
                            }}
                          >
                            Làm mới gợi ý
                          </Button>
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Khoảng cách</InputLabel>
                            <Select
                              value={nearbyRadius}
                              label="Khoảng cách"
                              onChange={(e) => {
                                const r = Number(e.target.value);
                                setNearbyRadius(r);
                                if (addressForm.lat && addressForm.lng) {
                                  void fetchNearbyPlaces(addressForm.lat, addressForm.lng, r);
                                }
                              }}
                            >
                              <MenuItem value={200}>200 m</MenuItem>
                              <MenuItem value={500}>500 m</MenuItem>
                              <MenuItem value={1000}>1 km</MenuItem>
                            </Select>
                          </FormControl>
                          <Typography variant="caption" color="text.secondary">
                            {loadingNearby ? 'Đang tìm địa điểm...' : `${nearbyPlaces.length} địa điểm khả dụng`}
                          </Typography>
                        </Stack>

                        <Box>
                          {loadingNearby ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CircularProgress size={18} />
                              <Typography variant="body2">Đang tải địa điểm gần đây...</Typography>
                            </Box>
                          ) : nearbyPlaces.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              Chưa có gợi ý quanh vị trí này. Hãy thử kéo ghim hoặc tăng bán kính tìm kiếm.
                            </Typography>
                          ) : (
                            <Box sx={{ position: 'relative' }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const el = document.getElementById('nearby-scroll');
                                  if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                                }}
                                sx={{ position: 'absolute', left: -8, top: '40%', zIndex: 20, bgcolor: 'white', boxShadow: 1 }}
                              >
                                <ChevronLeftIcon />
                              </IconButton>

                              <Box
                                id="nearby-scroll"
                                sx={{
                                  display: 'flex',
                                  gap: 1.25,
                                  overflowX: 'auto',
                                  py: 1,
                                  px: 0,
                                  scrollSnapType: 'x mandatory',
                                  '&::-webkit-scrollbar': { height: 8 },
                                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(148,163,184,0.4)', borderRadius: 2 }
                                }}
                              >
                                {nearbyPlaces.map((p) => {
                                  const distanceLabel = formatDistanceLabel(p.distance);
                                  const subtitle = [p.addressLine, prettifyPlaceType(p.type)].filter(Boolean).join(' • ') || 'Gợi ý gần vị trí ghim';
                                  return (
                                    <Paper
                                      key={p.id}
                                      sx={{
                                        p: 1.5,
                                        minWidth: { xs: '100%', sm: 300 },
                                        borderRadius: 3,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        gap: 1.5,
                                        border: '1px solid rgba(148,163,184,0.4)',
                                        background: 'rgba(255,255,255,0.95)',
                                        scrollSnapAlign: 'start'
                                      }}
                                    >
                                      <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                          <Typography fontWeight={700}>{p.name || p.addressLine || prettifyPlaceType(p.type) || 'Địa điểm'}</Typography>
                                          {distanceLabel && (
                                            <Chip
                                              size="small"
                                              icon={<ExploreOutlinedIcon fontSize="small" />}
                                              label={distanceLabel}
                                              sx={{ bgcolor: 'rgba(59,130,246,0.1)', borderRadius: 1 }}
                                            />
                                          )}
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                          {subtitle}
                                        </Typography>
                                      </Box>
                                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                        <Button size="small" variant="contained" onClick={() => handleApplyNearbyPlace(p)}>
                                          Dùng vị trí
                                        </Button>
                                        <Button size="small" variant="outlined" onClick={() => handlePreviewNearbyPlace(p)}>
                                          Xem bản đồ
                                        </Button>
                                      </Stack>
                                    </Paper>
                                  );
                                })}
                              </Box>

                              <IconButton
                                size="small"
                                onClick={() => {
                                  const el = document.getElementById('nearby-scroll');
                                  if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                                }}
                                sx={{ position: 'absolute', right: -8, top: '40%', zIndex: 20, bgcolor: 'white', boxShadow: 1 }}
                              >
                                <ChevronRightIcon />
                              </IconButton>
                            </Box>
                          )}
                        </Box>
                      </Stack>
                    </Paper>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <Button variant="contained" onClick={() => setConfirmSaveOpen(true)} sx={{ flex: 1, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(120deg, #22d3ee, #3b82f6)' }}>Lưu thay đổi</Button>
                      <Button variant="outlined" onClick={() => setAddressDialogOpen(false)} sx={{ flex: 1 }}>Đóng</Button>
                      {selectedAddressId && selectedAddressId !== 'new' && (
                        <Button color="error" onClick={() => { if (selectedAddressId) { setDeleteTargetId(selectedAddressId); setConfirmDeleteOpen(true); } }} sx={{ flex: 1 }}>Xoá địa chỉ</Button>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
      </Dialog>

        {/* Confirm Save Dialog */}
        <Dialog open={confirmSaveOpen} onClose={() => setConfirmSaveOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Xác nhận lưu địa chỉ</DialogTitle>
          <DialogContent>
            <Typography>Bạn có chắc muốn lưu địa chỉ này vào hồ sơ?</Typography>
            <Typography variant="caption" color="text.secondary">Địa chỉ sẽ được lưu và có thể sử dụng cho đơn hàng tiếp theo.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmSaveOpen(false)}>Huỷ</Button>
            <Button variant="contained" onClick={confirmSaveAction}>Xác nhận</Button>
          </DialogActions>
        </Dialog>

        {/* Confirm Delete Dialog */}
        <Dialog open={confirmDeleteOpen} onClose={() => { setConfirmDeleteOpen(false); setDeleteTargetId(null); }} maxWidth="xs" fullWidth>
          <DialogTitle>Xác nhận xoá địa chỉ</DialogTitle>
          <DialogContent>
            <Typography>Bạn có chắc muốn xoá địa chỉ này? Hành động không thể hoàn tác.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setConfirmDeleteOpen(false); setDeleteTargetId(null); }}>Huỷ</Button>
            <Button variant="contained" color="error" onClick={confirmDeleteAction}>Xoá</Button>
          </DialogActions>
        </Dialog>


      {/* Voucher Dialog */}
      <Dialog
        open={voucherDialogOpen}
        onClose={() => setVoucherDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
            background: "linear-gradient(180deg, #fff7ed, #f5f3ff)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(120deg, #f97316, #ec4899)",
            color: "white",
            fontWeight: 800,
            letterSpacing: 1,
          }}
        >
          🎟️ Trung Tâm Voucher
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            {voucherError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {voucherError}
              </Alert>
            )}

            <Stack spacing={4}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background: "linear-gradient(135deg, #fff7ed, #fee2e2)",
                  border: "1px solid rgba(251,146,60,0.3)",
                }}
              >
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700} color="#c2410c">
                      Nhập mã riêng của bạn
                    </Typography>
                    <Typography variant="body2" color="#9a3412">
                      Thử mã nội bộ hoặc mã quà tặng để nhận ưu đãi bổ sung.
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ width: { xs: "100%", md: "auto" } }}>
                    <TextField
                      fullWidth
                      label="Mã voucher"
                      size="small"
                      value={manualVoucherCode}
                      onChange={(e) => {
                        setManualVoucherCode(e.target.value.toUpperCase());
                        if (manualVoucherError) setManualVoucherError(null);
                      }}
                      error={Boolean(manualVoucherError)}
                      helperText={manualVoucherError || ""}
                    />
                    <Button
                      variant="contained"
                      onClick={handleApplyManualVoucher}
                      disabled={!manualVoucherCode.trim() || applyingVoucherCode === manualVoucherCode.trim().toUpperCase()}
                      sx={{ minWidth: 140, height: 40, fontWeight: 700 }}
                    >
                      {applyingVoucherCode === manualVoucherCode.trim().toUpperCase() ? (
                        <CircularProgress size={18} sx={{ color: "white" }} />
                      ) : (
                        "Áp dụng"
                      )}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  border: "1px solid rgba(14,165,233,0.2)",
                  background: "linear-gradient(135deg, #ecfeff, #e0f2fe)",
                }}
              >
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700} color="#0f172a">Gợi ý tốt nhất</Typography>
                    <Typography variant="body2" color="#475569">
                      Công cụ AI đề xuất voucher phù hợp nhất với giỏ hàng hiện tại của bạn.
                    </Typography>
                  </Box>
                  {bestVoucherLoading ? (
                    <LinearProgress sx={{ width: { xs: "100%", md: 240 }, borderRadius: 999 }} />
                  ) : bestVoucher ? (
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ width: { xs: "100%", md: 'auto' } }}>
                      <Box>
                        <Typography fontWeight={800}>{bestVoucher.code}</Typography>
                        <Typography color="text.secondary">
                          Giảm {formatCurrency(bestVoucher.discount)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={applyingVoucherCode === bestVoucher.code}
                          onClick={() => handleApplyBestVoucher(bestVoucher.code)}
                        >
                          {applyingVoucherCode === bestVoucher.code ? (
                            <CircularProgress size={18} sx={{ color: "white" }} />
                          ) : (
                            "Áp dụng"
                          )}
                        </Button>
                        {bestVoucher.voucher && (
                          <Button variant="outlined" size="small" onClick={() => showVoucherDetail(bestVoucher.voucher!)}>
                            Chi tiết
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">Không có gợi ý nào phù hợp.</Typography>
                  )}
                  {bestVoucherError && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
                      {bestVoucherError}
                    </Typography>
                  )}
                </Stack>
              </Paper>

              {voucherLoading ? (
                <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                  <CircularProgress />
                </Box>
              ) : userVouchers.length ? (
                <Stack spacing={2.5}>
                  {userVouchers.map((voucher) => {
                    const applicable = voucher.applicable !== false;
                    const discountPreview = voucher.discount ?? 0;
                    return (
                      <Paper
                        key={voucher._id ?? voucher.code}
                        sx={{
                          p: 2.5,
                          borderRadius: 4,
                          border: `1px solid ${applicable ? 'rgba(16,185,129,0.25)' : 'rgba(248,113,113,0.25)'}`,
                          background: applicable ? "rgba(16,185,129,0.06)" : "rgba(248,113,113,0.06)",
                        }}
                      >
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                              <Typography variant="h6" fontWeight={800}>
                                {voucher.code}
                              </Typography>
                              {voucher.freeShipping ? (
                                <Chip label="Freeship" color="info" size="small" />
                              ) : (
                                discountPreview > 0 && (
                                <Chip label={`Ưu đãi ~ ${formatCurrency(discountPreview)}`} color={applicable ? "success" : "default"} size="small" />
                                )
                              )}
                            </Stack>
                            <Typography color="text.secondary">
                              {voucher.freeShipping
                                ? "Miễn phí toàn bộ phí vận chuyển"
                                : `Giá trị: ${voucher.type === "percent" ? `${voucher.value}%` : formatCurrency(voucher.value)}`}
                            </Typography>
                            <Typography color="text.secondary">
                              Đơn tối thiểu: {voucher.minOrderValue ? formatCurrency(voucher.minOrderValue) : "Không"}
                            </Typography>
                            <Typography color="text.secondary">
                              Hạn sử dụng: {formatDate(voucher.expiresAt)}
                            </Typography>
                            {voucher.reason && !applicable && (
                              <Typography color="error" variant="body2" sx={{ mt: 0.5 }}>
                                {voucher.reason}
                              </Typography>
                            )}
                          </Box>
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                            <Button variant="outlined" startIcon={<InfoOutlinedIcon />} onClick={() => setVoucherDetail(voucher)}>
                              Chi tiết
                            </Button>
                            <Tooltip title={!applicable ? voucher.reason || "Không đủ điều kiện" : ""} disableHoverListener={applicable}>
                              <span>
                                <Button variant="contained" onClick={() => handleApplyVoucher(voucher)} disabled={!applicable || applyingVoucherCode === voucher.code}>
                                  {applyingVoucherCode === voucher.code ? (
                                    <CircularProgress size={18} color="inherit" />
                                  ) : (
                                    "Áp dụng"
                                  )}
                                </Button>
                              </span>
                            </Tooltip>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <Paper sx={{ p: 3, textAlign: "center", borderRadius: 4, border: "1px dashed rgba(148,163,184,0.6)", background: "rgba(255,255,255,0.65)" }}>
                  <Typography color="text.secondary">
                    Bạn chưa có voucher cá nhân. Nhập mã hoặc theo dõi các sự kiện để nhận ưu đãi mới.
                  </Typography>
                </Paper>
              )}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 4, py: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            {selectedVoucher ? `Voucher đang dùng: ${selectedVoucher.code}` : "Chưa chọn voucher"}
          </Typography>
          <Stack direction="row" spacing={1}>
            {selectedVoucher && (
              <Button color="error" onClick={handleRemoveVoucher}>
                Bỏ voucher
              </Button>
            )}
            <Button variant="contained" onClick={() => setVoucherDialogOpen(false)}>
              Hoàn tất
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog
          open={Boolean(voucherDetail)}
          onClose={() => setVoucherDetail(null)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Chi tiết voucher</DialogTitle>
          <DialogContent dividers>
            {voucherDetail && (
              <Stack spacing={1.5}>
                <Box
                  component="img"
                  src={getVoucherImageUrl(voucherDetail)}
                  alt={`Voucher ${voucherDetail.code}`}
                  sx={{
                    width: "100%",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    maxHeight: 180,
                    objectFit: "cover",
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Hình minh hoạ được tạo tự động bằng AI cho voucher này.
                </Typography>
                <Typography variant="h6" fontWeight={800}>
                  {voucherDetail.code}
                </Typography>
                {voucherDetail.highlightText && (
                  <Typography color="primary">{voucherDetail.highlightText}</Typography>
                )}
                {voucherDetailDescription && (
                  <Typography variant="body2" color="text.secondary">
                    {voucherDetailDescription}
                  </Typography>
                )}
                {voucherDetail.freeShipping ? (
                  <>
                    <Typography>Loại ưu đãi: Miễn phí toàn bộ phí vận chuyển</Typography>
                    <Typography>Giảm tối đa: Theo phí vận chuyển thực tế của đơn hàng</Typography>
                  </>
                ) : (
                  <>
                    <Typography>
                      Loại ưu đãi: {voucherDetail.type === "percent" ? `${voucherDetail.value}%` : formatCurrency(voucherDetail.value)}
                    </Typography>
                    <Typography>
                      Giảm tối đa: {voucherDetail.maxDiscount ? formatCurrency(voucherDetail.maxDiscount) : "Không giới hạn"}
                    </Typography>
                  </>
                )}
                <Typography>
                  Đơn tối thiểu: {voucherDetail.minOrderValue ? formatCurrency(voucherDetail.minOrderValue) : "Không"}
                </Typography>
                <Typography>Hạn sử dụng: {formatDate(voucherDetail.expiresAt)}</Typography>
                <Typography>
                  Lượt sử dụng: {voucherDetail.usageLimit ? `${voucherDetail.usedCount ?? 0}/${voucherDetail.usageLimit}` : "Không giới hạn"}
                </Typography>
                {voucherDetail.reason && (
                  <Typography color="error">{voucherDetail.reason}</Typography>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVoucherDetail(null)}>Đóng</Button>
          </DialogActions>
        </Dialog>

      {/* Map Dialog */}
      <Dialog 
          open={showMap} 
          onClose={() => setShowMap(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: 'white',
            fontWeight: 700
          }}>
            📍 Chọn Vị Trí Trên Bản Đồ
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Nhấp vào bản đồ để ghim vị trí giao hàng của bạn
            </Typography>

            <Box
              sx={{
                position: 'relative',
                borderRadius: 3,
                overflow: 'hidden',
                border: '2px solid #e3f2fd',
                boxShadow: '0 25px 60px rgba(23,43,77,0.25)',
              }}
            >
              <MapContainer 
                center={addressForm.lat && addressForm.lng ? [addressForm.lat, addressForm.lng] : [21.0278, 105.8342]} 
                zoom={13} 
                style={{ height: 400, width: '100%' }}
              >
                <TileLayer url={buildGoogleTileUrl(dialogMapStyle)} />
                <LocationMarker />
                <DraggablePin />
              </MapContainer>

              <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={dialogMapStyle}
                  onChange={(_, value) => {
                    if (value) setDialogMapStyle(value);
                  }}
                  sx={{
                    background: 'rgba(15,23,42,0.85)',
                    borderRadius: 999,
                    '& .MuiToggleButton-root': {
                      color: 'rgba(255,255,255,0.75)',
                      border: 'none',
                      textTransform: 'none',
                      px: 1.5,
                      '&.Mui-selected': {
                        background: 'linear-gradient(120deg,#2563eb,#7c3aed)',
                        color: '#fff',
                      },
                    },
                  }}
                >
                  {mapLayerOptions.map((option) => (
                    <ToggleButton key={option.value} value={option.value}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {option.icon}
                        <Typography variant="caption">{option.label}</Typography>
                      </Stack>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

            </Box>

            <Paper elevation={0} sx={{ p: 2, mt: 2, background: '#f8fbff', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                Hoặc nhập toạ độ thủ công:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  label="Latitude"
                  value={coordLat}
                  onChange={(e) => setCoordLat(e.target.value)}
                  size="small"
                  placeholder="10.123456"
                  sx={{ flex: 1, minWidth: 120, background: 'white' }}
                />
                <TextField
                  label="Longitude"
                  value={coordLng}
                  onChange={(e) => setCoordLng(e.target.value)}
                  size="small"
                  placeholder="106.123456"
                  sx={{ flex: 1, minWidth: 120, background: 'white' }}
                />
                <Button 
                  variant="contained" 
                  onClick={applyCoordinates}
                  sx={{
                    minWidth: 100,
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  }}
                >
                  Áp dụng
                </Button>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox 
                    checked={useRawCoords} 
                    onChange={(e) => setUseRawCoords(e.target.checked)}
                    sx={{ color: '#1976d2' }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption">Dùng toạ độ gốc (không tự động ghép)</Typography>
                    <Tooltip title="Lưu toạ độ gốc; không tự động ghép Tỉnh/Quận/Phường.">
                      <IconButton size="small">
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{ mt: 1 }}
              />
            </Paper>

            <Box sx={{ display: 'flex', gap: 1.5, mt: 2 }}>
              <Button 
                variant="outlined"
                startIcon={<MyLocationIcon />}
                onClick={handleGetCurrentLocation}
                fullWidth
                sx={{
                  borderColor: '#1976d2',
                  color: '#1976d2',
                  '&:hover': {
                    borderColor: '#1565c0',
                    background: '#e3f2fd'
                  }
                }}
              >
                Định vị GPS
              </Button>
              <Button 
                variant="contained"
                onClick={() => setShowMap(false)}
                fullWidth
                sx={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #388e3c 0%, #66bb6a 100%)',
                  }
                }}
              >
                ✓ Hoàn thành
              </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setShowMap(false)} sx={{ color: '#1976d2' }}>
              Đóng
            </Button>
          </DialogActions>
        </Dialog>
    </>
  );
}