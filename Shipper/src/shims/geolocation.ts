// Lightweight shim for geolocation to allow bundling when
// `react-native-geolocation-service` isn't installed. This file
// provides the same API used by the app (`getCurrentPosition`,
// `watchPosition`, `clearWatch`, `stopObserving`).
//
// Behavior:
// - If a native geolocation implementation exists on `global.navigator.geolocation`,
//   it will be used.
// - Otherwise this shim will throw a descriptive error at runtime telling
//   the developer to install `react-native-geolocation-service`.

type GeoCoords = { latitude: number; longitude: number; accuracy?: number };
type GeoPosition = { coords: GeoCoords; timestamp?: number };

type NavigatorGeo = {
  getCurrentPosition?: (
    success: (pos: GeoPosition) => void,
    error?: (err: { code?: number; message?: string }) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
  ) => void;
  watchPosition?: (
    success: (pos: GeoPosition) => void,
    error?: (err: { code?: number; message?: string }) => void,
    options?: { enableHighAccuracy?: boolean; distanceFilter?: number }
  ) => number;
  clearWatch?: (id: number) => void;
};

const globalWithNavigator = globalThis as unknown as { navigator?: { geolocation?: NavigatorGeo } };
const hasNavigatorGeo = typeof globalWithNavigator.navigator !== 'undefined' && !!globalWithNavigator.navigator?.geolocation;

function missingModuleError() {
  return new Error('Geolocation native module not found. Install `react-native-geolocation-service` and rebuild the app.');
}

const shim = {
  getCurrentPosition(
    success: (pos: GeoPosition) => void,
    error?: (err: { code?: number; message?: string }) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
  ) {
    if (hasNavigatorGeo && globalWithNavigator.navigator && globalWithNavigator.navigator.geolocation && globalWithNavigator.navigator.geolocation.getCurrentPosition) {
      return globalWithNavigator.navigator.geolocation.getCurrentPosition(success, error, options);
    }
    const err = missingModuleError();
    if (typeof error === 'function') error({ message: err.message });
    else throw err;
  },

  watchPosition(
    success: (pos: GeoPosition) => void,
    error?: (err: { code?: number; message?: string }) => void,
    options?: { enableHighAccuracy?: boolean; distanceFilter?: number }
  ): number {
    if (hasNavigatorGeo && globalWithNavigator.navigator && globalWithNavigator.navigator.geolocation && globalWithNavigator.navigator.geolocation.watchPosition) {
      return globalWithNavigator.navigator.geolocation.watchPosition(success, error, options);
    }
    throw missingModuleError();
  },

  clearWatch(id: number) {
    if (hasNavigatorGeo && globalWithNavigator.navigator && globalWithNavigator.navigator.geolocation && globalWithNavigator.navigator.geolocation.clearWatch) {
      return globalWithNavigator.navigator.geolocation.clearWatch(id);
    }
    // no-op if missing
    return;
  },

  stopObserving() {
    // navigator.geolocation doesn't have this method; keep as no-op
    return;
  },
};

export default shim;
