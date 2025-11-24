import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
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
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import IconButton from '@mui/material/IconButton';
import LinearProgress from "@mui/material/LinearProgress";
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
      // mute common toast methods
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = toast as any;
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
  const shippingFeeLabel = requiresAddressForShipping
    ? "Chưa xác định"
    : shippingFee > 0
      ? formatCurrency(shippingFee)
      : "Miễn phí";
  const rushDistanceOverride =
    shippingMethod === "rush"
      ? shippingSummary.breakdown.find(
          (entry) => typeof entry.distanceKm === "number" && !Number.isNaN(entry.distanceKm),
        )?.distanceKm ?? undefined
      : undefined;

  const finalTotal = useMemo(
    () => Math.max(0, totalPrice + shippingFee - voucherDiscount),
    [totalPrice, voucherDiscount, shippingFee],
  );

  const [provinces, setProvinces] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [wards, setWards] = useState<string[]>([]);

  const [coordLat, setCoordLat] = useState<string>(addressForm.lat ? String(addressForm.lat) : "");
  const [coordLng, setCoordLng] = useState<string>(addressForm.lng ? String(addressForm.lng) : "");
  const [useRawCoords, setUseRawCoords] = useState<boolean>(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<Array<{ id: string; name?: string; type?: string; lat: number; lng: number }>>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState<number>(500);

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
              await applyMatchedLocation(result.province, result.district, result.ward, result.detail, lat, lng);
              toast.info("ℹ️ Bạn có thể tiếp tục thay đổi vị trí hoặc click 'Hoàn thành'");
            }
            // fetch nearby POIs for user convenience
            void fetchNearbyPlaces(lat, lng, nearbyRadius);
          } catch (err) {
            console.error("reverse geocode failed:", err);
            toast.error("❌ Lỗi truy xuất địa chỉ");
          }
        })();
      },
    });
    return addressForm.lat && addressForm.lng ? <Marker position={[addressForm.lat, addressForm.lng]} /> : null;
  }

  function DraggablePin() {
    const [pos, setPos] = useState<[number, number] | null>(
      addressForm.lat && addressForm.lng ? [addressForm.lat, addressForm.lng] : null
    );

    useEffect(() => {
      if (addressForm.lat && addressForm.lng) {
        setPos([addressForm.lat, addressForm.lng]);
      }
    }, []);

    if (!pos) return null;

    return (
      <Marker
        position={pos}
        draggable
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
          },
        }}
      />
    );
  }

  function MapPanner({ lat, lng }: { lat?: number; lng?: number }) {
    const map = useMapEvents({});
    useEffect(() => {
      if (lat && lng && map) {
        try {
          map.setView([lat, lng], 16, { animate: true });
        } catch {
          // ignore
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
      const data = await res.json();
      const elems = Array.isArray(data.elements) ? data.elements : [];

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
      type PlaceWithDistance = { id: string; name?: string; type?: string; lat: number; lng: number; distance: number };

      const places: PlaceWithDistance[] = elems
        .map((el: RawElem) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = el as any;
          const latP = e.lat ?? e.center?.lat ?? null;
          const lngP = e.lon ?? e.center?.lon ?? null;
          const name = e.tags && (e.tags.name || e.tags.shop || e.tags.amenity) ? (e.tags.name || e.tags.shop || e.tags.amenity) : undefined;
          const type = e.tags && (e.tags.shop || e.tags.amenity) ? (e.tags.shop || e.tags.amenity) : undefined;
          const id = `${e.type || 'node'}_${e.id}`;
          return {
            id,
            name,
            type,
            lat: Number(latP),
            lng: Number(lngP),
            distance: latP && lngP ? haversine(lat, lng, Number(latP), Number(lngP)) : Infinity,
          };
        })
        .filter((p: PlaceWithDistance | undefined): p is PlaceWithDistance => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng));

      places.sort((a: PlaceWithDistance, b: PlaceWithDistance) => (a.distance || 0) - (b.distance || 0));
      setNearbyPlaces(places.map((p: PlaceWithDistance) => ({ id: p.id, name: p.name, type: p.type, lat: p.lat, lng: p.lng })));
    } catch (err) {
      console.error('fetchNearbyPlaces failed', err);
      toast.error('❌ Không thể tìm địa điểm gần đây');
    } finally {
      setLoadingNearby(false);
    }
  };

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
    const parts = [addressForm.detail, addressForm.ward, addressForm.district, addressForm.province].filter(Boolean).join(', ');
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
    lng?: number
  ) => {
    try {
      console.debug("[Geocoded]", { province: geocodedProvince, district: geocodedDistrict, ward: geocodedWard });
      
      if (!geocodedProvince && !geocodedDistrict && !geocodedWard) {
        console.log("[applyMatchedLocation] Coordinate-only response, updating detail only");
        setAddressForm((a) => ({
          ...a,
          detail: detail || `Vị trí: ${a.lat?.toFixed(4)}, ${a.lng?.toFixed(4)}`,
        }));
        toast.info("ℹ️ Không thể xác định tỉnh/quận/phường. Vui lòng chọn thủ công từ danh sách.");
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

      setAddressForm((a) => ({
        ...a,
        name: a.name || (user?.name as string) || "",
        phone: a.phone || (user?.phone as string) || "",
        province: matched.province || geocodedProvince,
        district: matched.district || geocodedDistrict,
        ward: matched.ward || geocodedWard,
        detail: detail,
        lat: typeof lat === "number" ? lat : a.lat,
        lng: typeof lng === "number" ? lng : a.lng,
        isPinned: !!(typeof lat === "number" ? lat : a.lat) && !!(typeof lng === "number" ? lng : a.lng),
      }));

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
              await applyMatchedLocation(result.province, result.district, result.ward, result.detail, latitude, longitude);
            }
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
        await applyMatchedLocation(result.province, result.district, result.ward, result.detail, lat, lng);
        toast.success("✅ Đã cập nhật địa chỉ từ toạ độ");
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr = err as any;
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
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      py: { xs: 3, md: 6 }
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800,
              color: '#1976d2',
              mb: 1,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Thanh Toán
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Hoàn tất đơn hàng của bạn
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Left Column - Products + Shipping */}
          <Grid item xs={12} md={8}>
            {/* Products (main area) */}
            <Card elevation={3} sx={{ mb: 3, borderRadius: 3, border: '2px solid #e3f2fd' }}>
              <Box sx={{ background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingBagOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>Sản Phẩm</Typography>
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2} sx={{ mb: 2 }}>
                  {items.map(item => (
                    <Paper key={item.productId._id} elevation={0} sx={{ p: 2, background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 100%)', border: '1px solid #e3f2fd', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {item.productId.images && item.productId.images[0] && (
                          <Avatar src={item.productId.images[0]} variant="rounded" sx={{ width: 60, height: 60 }} />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>{item.productId.title}</Typography>
                          <Typography variant="body2" color="text.secondary">Số lượng: {item.quantity}</Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight={700} color="primary">{(item.productId.price * item.quantity).toLocaleString("vi-VN")}₫</Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>

                <Stack spacing={1.5} sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<LocalOfferIcon />}
                    onClick={() => setVoucherDialogOpen(true)}
                  >
                    {selectedVoucher ? "Đổi voucher" : "Áp dụng voucher"}
                  </Button>
                  {selectedVoucher && (
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                      <Chip label={selectedVoucher.code} color="primary" />
                      <Typography color="success.main" fontWeight={700}>
                        - {formatCurrency(voucherDiscount)}
                      </Typography>
                      <Button size="small" color="error" onClick={handleRemoveVoucher}>
                        Bỏ voucher
                      </Button>
                    </Stack>
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
                            sx={{ p: 1.5, borderRadius: 2, borderColor: isSelected ? "primary.main" : undefined }}
                          >
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography fontWeight={700}>
                                  {voucher.code}
                                  {isSelected && " • Đang áp dụng"}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {voucher.type === "percent"
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
              </CardContent>
            </Card>
            {/* Shipping Address Card */}
            <Card 
              elevation={3}
              sx={{ 
                mb: 3,
                borderRadius: 3,
                overflow: 'hidden',
                border: '2px solid #e3f2fd'
              }}
            >
              <Box sx={{ 
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <LocalShippingOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                  Địa Chỉ Giao Hàng
                </Typography>
              </Box>

              <CardContent sx={{ p: 3 }}>
                {/* Compact shipping summary: open dialog to manage addresses */}
                {addresses.length > 0 && selectedAddressId && selectedAddressId !== 'new' ? (
                  (() => {
                    const found = addresses.find(a => a.id === selectedAddressId);
                    return found ? (
                      <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Typography fontWeight={700}>{found.name} • {found.phone}</Typography>
                          {found.isDefault && <Chip label="Mặc định" size="small" color="primary" />}
                          {found.id === selectedAddressId && <Chip label="Đã chọn" size="small" color="success" />}
                        </Box>
                        <Typography variant="body2" color="text.secondary">{found.detail}</Typography>
                        <Typography variant="caption" color="text.secondary">{[found.ward, found.district, found.province].filter(Boolean).join(', ')}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <Button variant="outlined" onClick={() => setAddressDialogOpen(true)}>Thay đổi</Button>
                        </Box>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">Chưa chọn địa chỉ</Typography>
                        <Button variant="outlined" sx={{ mt: 1 }} onClick={() => setAddressDialogOpen(true)}>Quản lý địa chỉ</Button>
                      </Box>
                    );
                  })()
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary">Vui lòng chọn hoặc thêm địa chỉ giao hàng</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button variant="outlined" onClick={() => setAddressDialogOpen(true)}>Chọn/Thêm địa chỉ</Button>
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 3 }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  Phương thức vận chuyển
                </Typography>
                <RadioGroup
                  value={shippingMethod}
                  onChange={(event) => setShippingMethod(event.target.value as ShippingMethod)}
                >
                  {SHIPPING_METHOD_OPTIONS.map((option) => {
                    const isActive = option.value === shippingMethod;
                    return (
                      <Paper
                        key={option.value}
                        elevation={isActive ? 2 : 0}
                        sx={{
                          p: 2,
                          mb: 1.5,
                          borderRadius: 2,
                          border: isActive ? '2px solid #1976d2' : '1px solid #e0e0e0',
                          transition: 'all 0.3s',
                          '&:hover': {
                            boxShadow: 2,
                            borderColor: '#42a5f5',
                          },
                        }}
                      >
                        <FormControlLabel
                          value={option.value}
                          control={<Radio sx={{ color: '#1976d2' }} />}
                          label={
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {option.title}
                                </Typography>
                                <Chip label={option.badge} size="small" color={option.badgeColor} />
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {describeShippingMethod(option.value)}
                              </Typography>
                            </Box>
                          }
                          sx={{ width: '100%', m: 0 }}
                        />
                      </Paper>
                    );
                  })}
                </RadioGroup>
                <Typography
                  variant="body2"
                  color={requiresAddressForShipping ? 'warning.main' : 'text.secondary'}
                  sx={{ mt: 1 }}
                >
                  {requiresAddressForShipping
                    ? 'Vui lòng hoàn tất tỉnh/thành để ước tính phí cho phương thức này.'
                    : `Ước tính phí: ${shippingFeeLabel}`}
                </Typography>
              </CardContent>
            </Card>

            {/* Payment Method Card */}
            <Card 
              elevation={3}
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden',
                border: '2px solid #e3f2fd'
              }}
            >
              <Box sx={{ 
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <PaymentOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                  Phương Thức Thanh Toán
                </Typography>
              </Box>

              <CardContent sx={{ p: 3 }}>
                <RadioGroup 
                  value={paymentMethod} 
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <Paper 
                    elevation={paymentMethod === "payos" ? 2 : 0}
                    sx={{ 
                      p: 2.5, 
                      mb: 2,
                      border: paymentMethod === "payos" ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      borderRadius: 2,
                      transition: 'all 0.3s',
                      '&:hover': {
                        boxShadow: 2,
                        borderColor: '#42a5f5'
                      }
                    }}
                  >
                    <FormControlLabel 
                      value="payos" 
                      control={<Radio sx={{ color: '#1976d2' }} />}
                      label={
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            ⚡ PayOS (QR / Ngân hàng)
                            <Chip label="Nhanh chóng" size="small" color="primary" />
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Thanh toán qua mã QR hoặc liên kết ngân hàng
                          </Typography>
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Paper>

                  <Paper 
                    elevation={paymentMethod === "cod" ? 2 : 0}
                    sx={{ 
                      p: 2.5,
                      border: paymentMethod === "cod" ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      borderRadius: 2,
                      transition: 'all 0.3s',
                      '&:hover': {
                        boxShadow: 2,
                        borderColor: '#42a5f5'
                      }
                    }}
                  >
                    <FormControlLabel 
                      value="cod" 
                      control={<Radio sx={{ color: '#1976d2' }} />}
                      label={
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            📦 Thanh toán khi nhận hàng (COD)
                            <Chip label="Tiện lợi" size="small" color="success" />
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Thanh toán bằng tiền mặt khi nhận hàng
                          </Typography>
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  </Paper>
                </RadioGroup>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Order Summary */}
          <Grid item xs={12} md={4}>
            <Card 
              elevation={3}
              sx={{ 
                borderRadius: 3,
                position: 'sticky',
                top: 20,
                border: '2px solid #e3f2fd'
              }}
            >
              <Box sx={{ 
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <ShoppingBagOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                  Đơn Hàng Của Bạn
                </Typography>
              </Box>

              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2} sx={{ mb: 3 }}>
                  {items.map(item => (
                    <Paper 
                      key={item.productId._id}
                      elevation={0}
                      sx={{ 
                        p: 2,
                        background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 100%)',
                        border: '1px solid #e3f2fd',
                        borderRadius: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {item.productId.images && item.productId.images[0] && (
                          <Avatar
                            src={item.productId.images[0]}
                            variant="rounded"
                            sx={{ width: 60, height: 60 }}
                          />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                            {item.productId.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Số lượng: {item.quantity}
                          </Typography>
                        </Box>
                        <Typography variant="subtitle1" fontWeight={700} color="primary">
                          {(item.productId.price * item.quantity).toLocaleString("vi-VN")}₫
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Tạm tính:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {totalPrice.toLocaleString("vi-VN")}₫
                    </Typography>
                  </Box>
                  {selectedVoucher && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Voucher ({selectedVoucher.code}):</Typography>
                      <Typography variant="body2" fontWeight={600} color="error">
                        -{formatCurrency(voucherDiscount)}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Phí vận chuyển ({shippingMethodTitle}):
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={
                        requiresAddressForShipping
                          ? 'warning.main'
                          : shippingFee > 0
                            ? 'text.primary'
                            : 'success.main'
                      }
                    >
                      {requiresAddressForShipping ? 'Cập nhật địa chỉ' : shippingFeeLabel}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  p: 2,
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  borderRadius: 2,
                  mb: 3
                }}>
                  <Typography variant="h6" fontWeight={700}>Tổng cộng:</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    {formatCurrency(finalTotal)}
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
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    background: processing 
                      ? 'grey'
                      : 'linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%)',
                    boxShadow: 3,
                    '&:hover': {
                      background: processing
                        ? 'grey'
                        : 'linear-gradient(135deg, #ee5a52 0%, #ff6b6b 100%)',
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.3s'
                    },
                    '&:disabled': {
                      background: 'grey',
                      color: 'white'
                    }
                  }}
                >
                  {processing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} sx={{ color: 'white' }} />
                      Đang xử lý...
                    </Box>
                  ) : paymentMethod === "cod" ? (
                    "📦 Đặt Hàng COD"
                  ) : (
                    "⚡ Thanh Toán PayOS"
                  )}
                </Button>

                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ display: 'block', textAlign: 'center', mt: 2 }}
                >
                  🔒 Thông tin của bạn được bảo mật an toàn
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Address Management Dialog */}
        <Dialog open={addressDialogOpen} onClose={() => setAddressDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Quản lý địa chỉ</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Địa chỉ đã lưu</Typography>
                {addresses.length === 0 ? (
                  <Typography color="text.secondary">Bạn chưa có địa chỉ nào.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {addresses.map((a) => (
                      <Paper
                        key={a.id}
                        sx={{
                          p: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: a.id === selectedAddressId ? 'rgba(25,118,210,0.06)' : undefined,
                          border: a.id === selectedAddressId ? '1px solid rgba(25,118,210,0.2)' : undefined,
                        }}
                      >
                        <Box sx={{ cursor: 'pointer' }} onClick={() => { if (a.id) { setSelectedAddressId(a.id); } else { setSelectedAddressId('new'); } setAddressForm(a); setAddressDialogOpen(false); }}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Typography fontWeight={700}>{a.name} • {a.phone}</Typography>
                            {a.isDefault && <Chip label="Mặc định" size="small" color="primary" />}
                            {a.id === selectedAddressId && <Chip label="Đã chọn" size="small" color="success" />}
                          </Box>
                          <Typography variant="body2" color="text.secondary">{a.detail}</Typography>
                        </Box>
                        <Box>
                          <Button size="small" onClick={() => { if (a.id) { setSelectedAddressId(a.id); setAddressForm(a); /* open edit on right side stays */ } }}>Sửa</Button>
                          <Button size="small" onClick={() => { if (a.id) { setSelectedAddressId(a.id); } else { setSelectedAddressId('new'); } setAddressForm(a); setAddressDialogOpen(false); }}>Chọn</Button>
                          <Button size="small" color="error" onClick={() => { if (a.id) { setDeleteTargetId(a.id); setConfirmDeleteOpen(true); } }}>Xoá</Button>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
                <Button sx={{ mt: 2 }} variant="outlined" onClick={() => { setSelectedAddressId('new'); setAddressForm({ id: undefined, name: '', phone: '', province: '', district: '', ward: '', detail: '', lat: undefined, lng: undefined, type: 'home', isDefault: false }); }}>Thêm địa chỉ mới</Button>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Chi tiết địa chỉ</Typography>
                <Stack spacing={2}>
                  <TextField label="Người nhận" value={addressForm.name} onChange={e => setAddressForm(s => ({ ...s, name: e.target.value }))} fullWidth />
                  <TextField label="Số điện thoại" value={addressForm.phone} onChange={e => setAddressForm(s => ({ ...s, phone: e.target.value }))} fullWidth />
                  <FormControl fullWidth>
                    <InputLabel>Tỉnh/Thành</InputLabel>
                    <Select value={addressForm.province} label="Tỉnh/Thành" onChange={async (e) => { const province = e.target.value; setAddressForm(s => ({ ...s, province, district: '', ward: '' })); const districtsList = await addressService.getDistricts(province); setDistricts(districtsList); }}>
                      <MenuItem value="">-- Chọn Tỉnh/Thành --</MenuItem>
                      {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth disabled={!addressForm.province}>
                    <InputLabel>Quận/Huyện</InputLabel>
                    <Select value={addressForm.district} label="Quận/Huyện" onChange={async (e) => { const d = e.target.value; setAddressForm(s => ({ ...s, district: d, ward: '' })); const wardsList = await addressService.getWards(addressForm.province, d); setWards(wardsList); }}>
                      <MenuItem value="">-- Chọn Quận/Huyện --</MenuItem>
                      {districts.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth disabled={!addressForm.district}>
                    <InputLabel>Phường/Xã</InputLabel>
                    <Select value={addressForm.ward} label="Phường/Xã" onChange={e => setAddressForm(s => ({ ...s, ward: e.target.value }))}>
                      <MenuItem value="">-- Chọn Phường/Xã --</MenuItem>
                      {wards.map(w => <MenuItem key={w} value={w}>{w}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Địa chỉ cụ thể"
                    value={addressForm.detail}
                    onChange={e => setAddressForm(s => ({ ...s, detail: e.target.value }))}
                    fullWidth
                    multiline
                    rows={2}
                  />

                  <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 2, background: '#f8fbff' }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Chọn vị trí trên bản đồ (kéo ghim để chỉnh chính xác)
                    </Typography>
                    <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden' }}>
                      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1200 }}>
                        <IconButton
                          onClick={handleGetCurrentLocation}
                          size="small"
                          sx={{ bgcolor: 'white', boxShadow: 1 }}
                        >
                          <MyLocationIcon sx={{ color: '#1976d2' }} />
                        </IconButton>
                      </Box>
                      <MapContainer
                        center={addressForm.lat && addressForm.lng ? [addressForm.lat, addressForm.lng] : [21.0278, 105.8342]}
                        zoom={13}
                        style={{ height: 220, width: '100%' }}
                      >
                        <TileLayer url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY || 'GHZKttyI4ARcAaCe0j5d'}`} />
                        <LocationMarker />
                        <DraggablePin />
                        <MapPanner lat={addressForm.lat} lng={addressForm.lng} />
                      </MapContainer>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Toạ độ: {addressForm.lat ? addressForm.lat.toFixed(6) : '--'}, {addressForm.lng ? addressForm.lng.toFixed(6) : '--'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button variant="outlined" onClick={() => { if (addressForm.lat && addressForm.lng) void fetchNearbyPlaces(addressForm.lat, addressForm.lng, nearbyRadius); else toast.warning('Vui lòng ghim vị trí trước'); }}>Quán / Địa điểm gần đây</Button>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Khoảng cách</InputLabel>
                        <Select value={nearbyRadius} label="Khoảng cách" onChange={(e) => { const r = Number(e.target.value); setNearbyRadius(r); if (addressForm.lat && addressForm.lng) void fetchNearbyPlaces(addressForm.lat, addressForm.lng, r); }}>
                          <MenuItem value={200}>200 m</MenuItem>
                          <MenuItem value={500}>500 m</MenuItem>
                          <MenuItem value={1000}>1 km</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary">{loadingNearby ? 'Đang tìm...' : `${nearbyPlaces.length} địa điểm`}</Typography>
                    </Box>

                    <Box sx={{ mt: 2 }}>
                      {loadingNearby ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={18} /> <Typography variant="body2">Đang tải địa điểm gần đây...</Typography></Box>
                      ) : nearbyPlaces.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">Chưa có địa điểm gần đây. Hãy ghim vị trí hoặc thử khoảng cách khác.</Typography>
                      ) : (
                        <Stack spacing={1}>
                          {nearbyPlaces.map(p => (
                            <Paper key={p.id} sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography fontWeight={700}>{p.name || '(Không tên)'}</Typography>
                                <Typography variant="caption" color="text.secondary">{p.type || 'Địa điểm'}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" onClick={() => { setAddressForm(a => ({ ...a, detail: p.name || a.detail, lat: p.lat, lng: p.lng, isPinned: true })); setCoordLat(String(p.lat)); setCoordLng(String(p.lng)); setSelectedAddressId('new'); toast.success('✅ Đã chọn địa điểm'); }}>Chọn</Button>
                                <Button size="small" onClick={() => { setAddressForm(a => ({ ...a, lat: p.lat, lng: p.lng, isPinned: true })); setCoordLat(String(p.lat)); setCoordLng(String(p.lng)); toast.info('🔎 Đã di chuyển bản đồ tới địa điểm'); }}>Xem</Button>
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                      )}
                    </Box>
                  </Paper>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" onClick={() => setConfirmSaveOpen(true)}>Lưu</Button>
                    <Button variant="outlined" onClick={() => setAddressDialogOpen(false)}>Đóng</Button>
                    {selectedAddressId && selectedAddressId !== 'new' && (
                      <Button color="error" onClick={() => { if (selectedAddressId) { setDeleteTargetId(selectedAddressId); setConfirmDeleteOpen(true); } }}>Xoá</Button>
                    )}
                  </Box>
                </Stack>
              </Box>
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
        <Dialog open={voucherDialogOpen} onClose={() => setVoucherDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Chọn voucher cho đơn hàng</DialogTitle>
          <DialogContent dividers>
            {voucherError && (
              <Typography color="error" align="center" sx={{ mb: 2 }}>
                {voucherError}
              </Typography>
            )}

            <Stack spacing={3} sx={{ mb: 3 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Nhập mã voucher
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
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
                    sx={{ minWidth: 140 }}
                  >
                    {applyingVoucherCode === manualVoucherCode.trim().toUpperCase() ? (
                      <CircularProgress size={18} sx={{ color: "white" }} />
                    ) : (
                      "Áp dụng"
                    )}
                  </Button>
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Gợi ý tốt nhất cho đơn này
                </Typography>
                {bestVoucherLoading ? (
                  <LinearProgress sx={{ borderRadius: 999 }} />
                ) : bestVoucher ? (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={700}>{bestVoucher.code}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Giảm {formatCurrency(bestVoucher.discount)}
                        </Typography>
                        {bestVoucher.voucher?.highlightText && (
                          <Typography variant="caption" color="primary">
                            {bestVoucher.voucher.highlightText}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
                          <Button variant="text" size="small" onClick={() => showVoucherDetail(bestVoucher.voucher!)}>
                            Xem chi tiết
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Không có gợi ý nào phù hợp cho giỏ hàng hiện tại.
                  </Typography>
                )}
                {bestVoucherError && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
                    {bestVoucherError}
                  </Typography>
                )}
              </Box>
            </Stack>

            {voucherLoading ? (
              <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
                <CircularProgress />
              </Box>
            ) : userVouchers.length ? (
              <Stack spacing={2}>
                {userVouchers.map((voucher) => {
                  const applicable = voucher.applicable !== false;
                  const discountPreview = voucher.discount ?? 0;
                  return (
                    <Paper key={voucher._id ?? voucher.code} sx={{ p: 2.5, borderRadius: 3 }} variant="outlined">
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ sm: "center" }}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <Typography variant="h6" fontWeight={800}>
                              {voucher.code}
                            </Typography>
                            {discountPreview > 0 && (
                              <Chip
                                label={`Ưu đãi ~ ${formatCurrency(discountPreview)}`}
                                color="success"
                                size="small"
                              />
                            )}
                          </Stack>
                          <Typography color="text.secondary">
                            Giá trị: {voucher.type === "percent" ? `${voucher.value}%` : formatCurrency(voucher.value)}
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
                          <Button
                            variant="outlined"
                            startIcon={<InfoOutlinedIcon />}
                            onClick={() => setVoucherDetail(voucher)}
                          >
                            Chi tiết
                          </Button>
                          <Tooltip
                            title={!applicable ? voucher.reason || "Không đủ điều kiện" : ""}
                            disableHoverListener={applicable}
                          >
                            <span>
                              <Button
                                variant="contained"
                                onClick={() => handleApplyVoucher(voucher)}
                                disabled={!applicable || applyingVoucherCode === voucher.code}
                              >
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
              <Box sx={{ py: 4 }}>
                <Stack spacing={2} alignItems="center">
                  <Typography color="text.secondary">
                    Bạn chưa có voucher cá nhân. Hãy nhập mã hoặc dùng gợi ý bên trên.
                  </Typography>
                  <Typography color="text.secondary">
                    Hiện chưa có ưu đãi nào phù hợp.
                  </Typography>
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVoucherDialogOpen(false)}>Đóng</Button>
            {selectedVoucher && (
              <Button color="error" onClick={handleRemoveVoucher}>
                Bỏ voucher
              </Button>
            )}
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
                <Typography>
                  Loại ưu đãi: {voucherDetail.type === "percent" ? `${voucherDetail.value}%` : formatCurrency(voucherDetail.value)}
                </Typography>
                <Typography>
                  Giảm tối đa: {voucherDetail.maxDiscount ? formatCurrency(voucherDetail.maxDiscount) : "Không giới hạn"}
                </Typography>
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

            <MapContainer 
              center={addressForm.lat && addressForm.lng ? [addressForm.lat, addressForm.lng] : [21.0278, 105.8342]} 
              zoom={13} 
              style={{ height: 400, width: '100%', borderRadius: 12, border: '2px solid #e3f2fd' }}
            >
              <TileLayer url={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY || 'GHZKttyI4ARcAaCe0j5d'}`} />
              <LocationMarker />
            </MapContainer>

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
      </Container>
    </Box>
  );
}