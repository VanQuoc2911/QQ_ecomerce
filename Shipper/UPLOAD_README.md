This file documents the upload scaffold used by the Shipper mobile app and how to set up `react-native-image-picker` and a server-side upload endpoint.

Client (React Native) setup

1) Install package

For bare React Native (recommended):

```
cd Shipper
npm install react-native-image-picker
# or
yarn add react-native-image-picker
```

2) iOS native setup

- In `ios/` run `pod install`.
- Update `Info.plist` to add permissions:

```
<key>NSPhotoLibraryUsageDescription</key>
<string>App needs access to your photos to upload documents</string>
<key>NSCameraUsageDescription</key>
<string>App needs access to camera to take photos of documents</string>
```

3) Android native setup

- Add permissions to `AndroidManifest.xml` (usually already present):

```
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

- Modern RN may require runtime permission checks before accessing gallery/camera.

Notes for Expo

- If you use managed Expo, use `expo-image-picker` instead. The scaffold in `Profile.tsx` uses `react-native-image-picker` but can be adjusted easily.

Server-side upload endpoint

The mobile helper `uploadDocument` posts a `FormData` under the key `files` to `/upload` (relative to the configured `api` base). The server should accept `multipart/form-data` and return a JSON object with the uploaded file URLs, e.g.

```
POST /upload
Content-Type: multipart/form-data
Form field: files (one or more files with the same field name)

Response: { "success": true, "images": ["https://cdn.example.com/.../file1.jpg", "https://cdn.example.com/.../file2.jpg"] }
```

If you prefer S3 signed uploads, implement a signed URL endpoint on backend and let the mobile client PUT or POST directly to S3.

Backend notes

- Use `multer` (Express) or similar to accept multipart and store to disk or cloud.
- Validate file type/size and authenticate the request.
- Return a stable public URL that the mobile app can include into the application payload.

Example Express + multer (very small):

```js
const multer = require('multer');
const upload = multer({ dest: '/tmp/uploads' });
// Accept multiple files under field name 'files'
app.post('/upload', authMiddleware, upload.array('files', 6), (req, res) => {
  // req.files is an array of uploaded file info
  // move to persistent storage or cloud and return public URLs
  const urls = req.files.map(f => 'https://cdn.example.com/uploads/' + f.filename);
  res.json({ success: true, images: urls });
});
```

Usage in app

- In `Profile` screen the inputs accept pasted URLs and the "Chọn" buttons open the image picker and call `/uploads`, then set the returned URL into the corresponding field.

Security

- Ensure upload endpoint requires authentication.
- Sanitize and validate file inputs.
- Limit file sizes.

If you want, I can:
- Add runtime permission checks for Android.
- Replace `react-native-image-picker` usage with `expo-image-picker` if you use Expo.
- Add a small server endpoint skeleton under `backend/` using `multer`.

Troubleshooting network errors

- If you see `AxiosError: Network Error` or `No response from server` on the mobile app, check the configured API base URL in `Shipper/src/api/index.ts` — the app defaults to `http://10.0.2.2:4000/api` for Android emulator.
- Common fixes:
  - Ensure the backend server is running and listening on the expected port (default 4000).
  - If using Android emulator, use `10.0.2.2` to reach host `localhost`; Genymotion -> `10.0.3.2`; on a real device use your machine IP (e.g. `http://192.168.1.42:4000`).
  - Use `adb reverse tcp:4000 tcp:4000` to forward emulator/device traffic to your dev machine (Android).
  - If you recently added native modules (e.g. `react-native-image-picker`), rebuild the native app (stop Metro, reinstall app) so native code is linked.
  - For iOS simulator `localhost` usually works; for iOS device use machine IP and ensure App Transport Security allows HTTP or use HTTPS.

If problems persist, check device/emulator logs and the value printed for API baseURL in app startup (the app logs `API baseURL = ...` in dev mode).
