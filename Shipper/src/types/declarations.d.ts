// Local module declaration stubs for native packages that do not publish @types
// Place simple `declare module` entries here to satisfy TypeScript until
// proper type definitions are available or contributed upstream.

declare module 'react-native-geolocation-service' {
  
  export type GeoCoords = {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    heading?: number | null;
    speed?: number | null;
  };

  export type GeoPosition = { coords: GeoCoords; timestamp?: number };

  export function getCurrentPosition(
    success: (pos: GeoPosition) => void,
    error?: (err: { code?: number; message?: string }) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
  ): void;

  export function watchPosition(
    success: (pos: GeoPosition) => void,
    error?: (err: { code?: number; message?: string }) => void,
    options?: { enableHighAccuracy?: boolean; distanceFilter?: number }
  ): number;

  export function clearWatch(watchId: number): void;

  export function stopObserving(): void;

  const Geolocation: {
    getCurrentPosition: typeof getCurrentPosition;
    watchPosition: typeof watchPosition;
    clearWatch: typeof clearWatch;
    stopObserving: typeof stopObserving;
  };

  export default Geolocation;
}

declare module 'react-native-maps' {
  import * as React from 'react';
    import { ViewProps } from 'react-native';

  export const PROVIDER_GOOGLE: string;

  export type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };

  export interface MapViewProps extends ViewProps {
    provider?: string;
    initialRegion?: Region;
    region?: Region;
    style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
    showsUserLocation?: boolean;
  }

  export class MapView extends React.Component<MapViewProps> {}

  export interface MarkerProps extends ViewProps {
    coordinate: { latitude: number; longitude: number };
    title?: string;
    description?: string;
    pinColor?: string;
  }

  export class Marker extends React.Component<MarkerProps> {}

  export default MapView;
}
