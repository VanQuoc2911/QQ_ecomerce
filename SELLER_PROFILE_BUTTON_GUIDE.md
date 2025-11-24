# Seller Registration Button - Profile Page Feature

## Overview
Added a prominent "Đăng ký trở thành Seller" (Register as Seller) button to the user's Profile page.

## Implementation Details

### Location
`web/src/pages/user/Profile.tsx` - Lines 424-450

### Button Features
- **Visibility**: Only displays when `user.sellerApproved === false`
- **Action**: Clicking navigates user to `/request-seller` page
- **Icon**: Uses `StoreIcon` from MUI Icons
- **Styling**: 
  - Gradient background: `#f093fb` → `#f5576c` (pink to red)
  - Full width button for prominence
  - Smooth hover effects with gradient reversal
  - Drop shadow for depth
  - Rounded corners (12px border radius)

### Code Changes
```tsx
{/* Seller Registration Button */}
{!user?.sellerApproved && (
  <Button
    onClick={() => navigate("/request-seller")}
    variant="contained"
    startIcon={<StoreIcon />}
    sx={{
      width: "100%",
      py: 1.5,
      borderRadius: "12px",
      background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      fontWeight: 600,
      fontSize: "1rem",
      textTransform: "none",
      boxShadow: "0 4px 20px rgba(245,87,108,0.4)",
      "&:hover": {
        background: "linear-gradient(135deg, #f5576c 0%, #f093fb 100%)",
        boxShadow: "0 6px 24px rgba(245,87,108,0.5)",
      },
      transition: "all 0.3s ease",
    }}
  >
    Đăng ký trở thành Seller
  </Button>
)}
```

## User Flow
1. User opens their profile page (`/profile`)
2. If not yet a seller (`sellerApproved = false`):
   - Button "Đăng ký trở thành Seller" appears in the avatar section
   - Located below the user status chips (Role and Approval Status)
3. User clicks the button
4. Navigated to `/request-seller` form page
5. User fills out seller registration form with:
   - Shop name
   - Logo upload
   - Business license upload
   - Contact info
   - Description
6. Form submission creates a seller request
7. Admin reviews and approves/rejects
8. If approved, user's `sellerApproved` becomes `true`
9. Button disappears from profile page

## Styling Consistency
- Matches the overall profile page design with gradient backgrounds
- Uses MUI theme colors and components
- Smooth animations and transitions
- Responsive design (full width on all screen sizes)
- Accessible with proper contrast and hover states

## Integration Points
- ✅ Already connected to existing `/request-seller` route
- ✅ Uses existing `navigate()` from React Router
- ✅ Conditional rendering based on `user.sellerApproved` property
- ✅ Existing StoreIcon import already available

## Testing
1. **When user is not approved**:
   - Load profile page
   - Verify button appears
   - Click button
   - Verify navigation to `/request-seller`

2. **When user is approved**:
   - Button should not appear
   - User can manage shop info in the Shop Info section below

## Files Modified
- ✅ `web/src/pages/user/Profile.tsx` - Added seller registration button with conditional rendering and styling
