export const SHIPPING_METHODS = ["standard", "express", "rush"];

export const STANDARD_FEES = Object.freeze({
  inProvince: 12000,
  outProvince: 28000,
});

export const EXPRESS_FEES = Object.freeze({
  inProvince: 22000,
  outProvince: 42000,
});

export const RUSH_FEE_RULES = Object.freeze({
  baseFee: 30000,
  includedKm: 3,
  perKm: 7000,
  defaultDistanceKm: 8,
  minDistanceKm: 1,
  maxDistanceKm: 150,
});

export const DISTANCE_SCOPE_THRESHOLD_KM = 30;

export const clampNumber = (value, min, max) => {
  if (typeof value !== "number" || Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

export const removeDiacritics = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

export const normalizeProvinceName = (province = "") =>
  removeDiacritics(String(province).toLowerCase())
    .replace(/tinh|thanh pho|city|province|tp\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const isSameProvince = (a, b) => {
  if (!a || !b) return false;
  return normalizeProvinceName(a) === normalizeProvinceName(b);
};

export const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // km
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

export const computeRushFee = (distanceKm) => {
  const roundedDistance = Math.max(distanceKm, RUSH_FEE_RULES.minDistanceKm);
  const extraKm = Math.max(0, roundedDistance - RUSH_FEE_RULES.includedKm);
  const fee = RUSH_FEE_RULES.baseFee + extraKm * RUSH_FEE_RULES.perKm;
  return Math.round(fee);
};

export const resolveRushDistanceKm = ({
  shop,
  destination,
  requestedRushDistanceKm,
}) => {
  const fallbackDistance =
    typeof requestedRushDistanceKm === "number"
      ? requestedRushDistanceKm
      : RUSH_FEE_RULES.defaultDistanceKm;

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
      destination.lng
    );
    return {
      distanceKm: clampNumber(
        computed,
        RUSH_FEE_RULES.minDistanceKm,
        RUSH_FEE_RULES.maxDistanceKm
      ),
      usedFallback: false,
    };
  }

  return {
    distanceKm: clampNumber(
      fallbackDistance,
      RUSH_FEE_RULES.minDistanceKm,
      RUSH_FEE_RULES.maxDistanceKm
    ),
    usedFallback: true,
  };
};

export const computeShippingForSeller = ({
  sellerId,
  shop,
  destination,
  method,
  requestedRushDistanceKm,
}) => {
  const baseResult = {
    sellerId,
    shopId: shop?._id?.toString() || null,
    shopProvince: shop?.province || null,
    destinationProvince: destination?.province || null,
    method,
    scope: "standard",
    fee: 0,
    distanceKm: null,
    meta: {},
  };

  const hasDistanceData =
    shop?.lat != null &&
    shop?.lng != null &&
    destination?.lat != null &&
    destination?.lng != null;
  const derivedDistanceKm = hasDistanceData
    ? haversineDistanceKm(shop.lat, shop.lng, destination.lat, destination.lng)
    : null;
  if (derivedDistanceKm != null) {
    baseResult.distanceKm = derivedDistanceKm;
  }

  if (method === "standard" || method === "express") {
    const sameProvince = (() => {
      if (derivedDistanceKm != null) {
        return derivedDistanceKm <= DISTANCE_SCOPE_THRESHOLD_KM;
      }
      if (shop?.province && destination?.province) {
        return isSameProvince(shop.province, destination.province);
      }
      return false;
    })();
    baseResult.scope = sameProvince ? "in_province" : "out_of_province";

    if (method === "standard") {
      baseResult.fee = sameProvince
        ? STANDARD_FEES.inProvince
        : STANDARD_FEES.outProvince;
    } else {
      baseResult.fee = sameProvince
        ? EXPRESS_FEES.inProvince
        : EXPRESS_FEES.outProvince;
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
    baseResult.meta = {
      usedFallbackDistance: distanceInfo.usedFallback,
      requestedRushDistanceKm,
    };
    baseResult.fee = computeRushFee(distanceInfo.distanceKm);
    return baseResult;
  }

  baseResult.scope = "unknown";
  return baseResult;
};

export const normalizeShippingAddress = (address = {}) => ({
  ...address,
  lat:
    typeof address.lat === "number"
      ? address.lat
      : address.lat
      ? Number(address.lat)
      : null,
  lng:
    typeof address.lng === "number"
      ? address.lng
      : address.lng
      ? Number(address.lng)
      : null,
});
