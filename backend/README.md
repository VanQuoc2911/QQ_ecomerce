# QQ Ecommerce Backend

## Quick start

1. Copy `.env.example` to `.env` and update MongoDB URI plus `CLIENT_ORIGIN`.
2. Install dependencies:
   ```cmd
   npm install
   ```
3. Run the API:
   ```cmd
   npm run dev
   ```

## Connectivity & login check

Use the helper script whenever the mobile app fails to reach the server:

```cmd
# inside backend/
npm run test:connection
```

Environment variables:

- `API_BASE_URL` (optional): Override the default `http://localhost:4000/api` target.
- `TEST_EMAIL` / `TEST_PASSWORD` (optional): When provided, the script will POST to `/auth/login` and ensure tokens are returned. This is the fastest way to verify that login credentials work before testing on a device.

The script first pings `/api/health`, then the root `/` route, and finally executes the optional login attempt. Any failure exits with code `1` and prints the offending response.
