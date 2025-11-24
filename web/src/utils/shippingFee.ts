export type ShippingMethod = "standard" | "express" | "rush";

const SHIPPING_METHODS: ShippingMethod[] = ["standard", "express", "rush"];

const STANDARD_FEES = Object.freeze({
  inProvince: 12000,
  outProvince: 28000,
});

const EXPRESS_FEES = Object.freeze({
  inProvince: 22000,
  outProvince: 42000,
});

const RUSH_RULES = Object.freeze({
  baseFee: 30000,
  includedKm: 3,
  perKm: 7000,
  defaultDistanceKm: 8,
  minDistanceKm: 1,
  maxDistanceKm: 150,
});

const DISTANCE_SCOPE_THRESHOLD_KM = 30;

const clampNumber = (value: unknown, min: number, max: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

const removeDiacritics = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const normalizeProvinceName = (province = "") =>
  removeDiacritics(String(province).toLowerCase())
    .replace(/tinh|thanh pho|city|province|tp\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isSameProvince = (a?: string | null, b?: string | null) => {
  if (!a || !b) return false;
  return normalizeProvinceName(a) === normalizeProvinceName(b);
};

const haversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const computeRushFee = (distanceKm: number) => {
  const roundedDistance = Math.max(distanceKm, RUSH_RULES.minDistanceKm);
  const extraKm = Math.max(0, roundedDistance - RUSH_RULES.includedKm);
  const fee = RUSH_RULES.baseFee + extraKm * RUSH_RULES.perKm;
  return Math.round(fee);
};

const resolveRushDistanceKm = ({
  shop,
  destination,
  requestedRushDistanceKm,
}: {
  shop?: { lat?: number | null; lng?: number | null } | null;
  destination?: { lat?: number | null; lng?: number | null } | null;
  requestedRushDistanceKm?: number;
}) => {
  const fallbackDistance =
    typeof requestedRushDistanceKm === "number"
      ? requestedRushDistanceKm
      : RUSH_RULES.defaultDistanceKm;

  if (
    shop?.lat != null &&
    shop?.lng != null &&
    destination?.lat != null &&
    destination?.lng != null
  ) {
    const computed = haversineDistanceKm(
      shop.lat,
      shop.lng,
      destination.lat,
      destination.lng,
    );
    return {
      distanceKm: clampNumber(
        computed,
        RUSH_RULES.minDistanceKm,
        RUSH_RULES.maxDistanceKm,
      ),
      usedFallback: false,
    };
  }

  return {
    distanceKm: clampNumber(
      fallbackDistance,
      RUSH_RULES.minDistanceKm,
      RUSH_RULES.maxDistanceKm,
    ),
    usedFallback: true,
  };
};

export interface ShippingDestinationInput {
  province?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface SellerShippingContext {
  sellerId: string;
  shop?: {
    _id?: string;
    province?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null;
}

export interface ShippingBreakdownEntry {
  sellerId: string;
  shopId?: string | null;
  fee: number;
  scope: string;
  distanceKm?: number | null;
  shopProvince?: string | null;
  destinationProvince?: string | null;
  usedFallbackDistance?: boolean;
}

export interface ShippingSummary {
  method: ShippingMethod;
  totalShippingFee: number;
  breakdown: ShippingBreakdownEntry[];
}

export const computeShippingForSeller = ({
  sellerId,
  shop,
  destination,
  method,
  requestedRushDistanceKm,
}: {
  sellerId: string;
  shop?: SellerShippingContext["shop"] | null;
  destination?: ShippingDestinationInput;
  method: ShippingMethod;
  requestedRushDistanceKm?: number;
}): ShippingBreakdownEntry => {
  const baseResult: ShippingBreakdownEntry = {
    sellerId,
    shopId: shop?._id || null,
    shopProvince: shop?.province || null,
    destinationProvince: destination?.province || null,
    fee: 0,
    scope: "standard",
    distanceKm: null,
    usedFallbackDistance: false,
  };

  const hasDistanceData =
    shop?.lat != null &&
    shop?.lng != null &&
    destination?.lat != null &&
    destination?.lng != null;
  const derivedDistanceKm = hasDistanceData
    ? haversineDistanceKm(
        shop.lat as number,
        shop.lng as number,
        destination.lat as number,
        destination.lng as number,
      )
    : null;
  if (derivedDistanceKm != null) {
    baseResult.distanceKm = derivedDistanceKm;
  }

  if (method === "standard" || method === "express") {
    const sameProvince = (() => {
      if (derivedDistanceKm != null) {
        return derivedDistanceKm <= DISTANCE_SCOPE_THRESHOLD_KM;
      }
      return isSameProvince(shop?.province, destination?.province);
    })();
    baseResult.scope = sameProvince ? "in_province" : "out_of_province";
    if (method === "standard") {
      baseResult.fee = sameProvince ? STANDARD_FEES.inProvince : STANDARD_FEES.outProvince;
    } else {
      baseResult.fee = sameProvince ? EXPRESS_FEES.inProvince : EXPRESS_FEES.outProvince;
    }
    return baseResult;
  }

  if (method === "rush") {
    const distanceInfo = resolveRushDistanceKm({
      shop,
      destination,
      requestedRushDistanceKm,
    });
    baseResult.scope = "distance";
    baseResult.distanceKm = distanceInfo.distanceKm;
    baseResult.usedFallbackDistance = distanceInfo.usedFallback;
    baseResult.fee = computeRushFee(distanceInfo.distanceKm ?? RUSH_RULES.defaultDistanceKm);
    return baseResult;
  }

  return baseResult;
};

export const buildShippingSummary = ({
  sellers,
  destination,
  method,
  rushDistanceKm,
}: {
  sellers: SellerShippingContext[];
  destination?: ShippingDestinationInput;
  method: ShippingMethod;
  rushDistanceKm?: number;
}): ShippingSummary => {
  const normalizedMethod = SHIPPING_METHODS.includes(method)
    ? method
    : "standard";

  const breakdown = sellers.map((seller) =>
    computeShippingForSeller({
      sellerId: seller.sellerId,
      shop: seller.shop,
      destination,
      method: normalizedMethod,
      requestedRushDistanceKm: rushDistanceKm,
    }),
  );

  const totalShippingFee = breakdown.reduce((sum, entry) => sum + (entry.fee || 0), 0);

  return {
    method: normalizedMethod,
    totalShippingFee,
    breakdown,
  };
};

export const describeShippingMethod = (method: ShippingMethod) => {
  switch (method) {
    case "express":
      return "Giao 24-48h, phí dựa trên khoảng cách";
    case "rush":
      return "Giao hỏa tốc, tính theo km";
    default:
      return "Tiêu chuẩn 3-5 ngày, phí dựa trên khoảng cách";
  }
};
