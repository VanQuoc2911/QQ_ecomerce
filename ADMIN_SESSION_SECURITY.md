# Admin Session Security - Page Reload Behavior

## Overview
Modified admin authentication to NOT persist sessions across page reloads. This is a security best practice for admin accounts.

## Problem
Previously, when an admin was logged in and reloaded the page, they would remain logged in automatically. This was inconsistent with security best practices for admin accounts.

## Solution
Updated `AuthProvider.tsx` to clear admin tokens on page reload:

**File**: `web/src/context/AuthProvider.tsx`

**Change in `refreshUser()` function**:

```typescript
// ✅ Admin - do NOT auto-restore admin session on page reload
// Require admin to login again for security
if (token === "admin-token") {
  setUser(null);
  localStorage.removeItem("accessToken");
  return;
}
```

## Behavior Change

### Before
- Admin logs in → token stored as "admin-token" in localStorage
- Admin refreshes page → automatically restored to admin state
- Admin stays logged in indefinitely

### After
- Admin logs in → token stored as "admin-token" in localStorage
- Admin refreshes page → token cleared, redirects to login
- Admin must login again
- **More secure for admin accounts**

## User Experience

### Admin Flow:
1. Admin goes to login page
2. Enters admin credentials
3. Enters admin dashboard
4. Refreshes page (F5 or browser reload)
5. **Result**: Redirected to login page
6. Must login again to access admin features

### Regular User Flow (Unchanged):
1. User logs in normally
2. Navigates site
3. Refreshes page
4. **Result**: Stays logged in (no change)
5. Can continue using site

## Security Benefits

1. **Protection from shared computers**: If admin uses a shared computer, logout happens automatically
2. **Defense against session hijacking**: No long-lived admin tokens in localStorage
3. **Accidental logout prevention**: Admin is forced to consciously re-enter credentials
4. **Compliance**: Aligns with security best practices for admin areas

## Technical Details

### Token Types
- Admin: `"admin-token"` - Now cleared on reload
- Regular User: JWT token from backend - Still persisted on reload

### Implementation
The `refreshUser()` function is called automatically when:
1. Page loads (component mount)
2. `profileUpdated` event fires

On page load, if the stored token is "admin-token":
1. Token is detected
2. User state is set to null
3. Token is removed from localStorage
4. User is effectively logged out

## Code Location
- **File**: `web/src/context/AuthProvider.tsx`
- **Function**: `refreshUser()`
- **Lines**: 80-103 (approximately)

## Testing

### Test Admin Logout on Reload:
1. Go to login page
2. Enter admin email/password (from `.env` VITE_ADMIN_EMAIL/PASSWORD)
3. Verify admin dashboard loads
4. Press F5 or reload page
5. **Expected**: Redirected to login page
6. Admin should NOT be automatically logged in

### Test User Persistence (Unchanged):
1. Go to login page
2. Enter regular user credentials
3. Verify logged in
4. Reload page
5. **Expected**: Still logged in, no redirect to login
6. Can continue browsing

## Configuration

To enable/disable this behavior, modify the `refreshUser()` function:

```typescript
// To ALLOW admin session persistence (old behavior):
if (token === "admin-token") {
  const adminUser: User = {
    id: 0,
    name: "Admin",
    email: adminEmail,
    role: "admin",
    avatar: "https://ui-avatars.com/api/?name=Admin",
  };
  setUser(adminUser);
  return;
}

// To DISABLE admin session persistence (current behavior):
if (token === "admin-token") {
  setUser(null);
  localStorage.removeItem("accessToken");
  return;
}
```

## Related Components

- **AuthProvider.tsx**: Handles session restoration
- **AdminRoutes.tsx**: Guards admin route access
- **App.tsx**: Main routing structure
- **Login page**: Where admin re-enters credentials

## Future Enhancements

1. **Admin token expiry**: Set expiry time even without page reload
2. **Session timeout**: Auto-logout after 30 minutes of inactivity
3. **Two-factor authentication**: Extra security layer for admin login
4. **Admin activity logging**: Track all admin actions with timestamps
5. **IP address tracking**: Restrict admin access to specific IPs

## Impact Summary

| Aspect | Before | After |
|--------|--------|-------|
| Admin session on reload | Persisted | Cleared |
| Regular user session on reload | Persisted | Persisted (unchanged) |
| Security level | Medium | High |
| UX friction for admin | None | Requires re-login |
| Shared computer risk | High | Low |

## Notes

- This applies only to hardcoded admin accounts (credentials in .env)
- Regular users with backend accounts unaffected
- Socket connection automatically closes on logout
- All admin pages now require fresh login
