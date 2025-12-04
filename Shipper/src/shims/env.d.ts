// Provide minimal type declarations used in the app to avoid `any` casts
// `__DEV__` is injected by React Native bundler at runtime.
declare const __DEV__: boolean;

// Minimal `process` shape for accessing NODE_ENV in environments where it's available.
// Keep this minimal to avoid pulling in full `@types/node`.
declare var process: { env: { NODE_ENV?: string } } | undefined;
