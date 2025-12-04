import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
): void {
  if (navigationRef.isReady()) {
    // Cast the `navigate` method to a typed generic function via `unknown`.
    // This avoids `any` while allowing us to call the overload with (screen, params).
    const typedNavigate = navigationRef.navigate as unknown as <R extends keyof RootStackParamList>(
      screen: R,
      p?: RootStackParamList[R]
    ) => void;
    typedNavigate(name, params);
  }
}

export function resetRoot<RouteName extends keyof RootStackParamList>(name: RouteName): void {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: name as unknown as never }] });
  }
}

export default { navigationRef, navigate, resetRoot };
