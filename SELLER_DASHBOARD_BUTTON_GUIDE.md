# Seller Dashboard Navigation - Profile Page Feature

## Overview
Added conditional navigation buttons in the user Profile page:
- **For Regular Users**: "Đăng ký trở thành Seller" (Register as Seller) button
- **For Approved Sellers**: "Quản Lý Cửa Hàng" (Manage Shop) button

## Implementation Details

### Location
`web/src/pages/user/Profile.tsx` - Lines 428-476

### Button Logic

#### 1. Seller Registration Button (Regular Users)
- **Condition**: `!user?.sellerApproved` 
- **Action**: Navigate to `/request-seller`
- **Styling**: Pink-to-red gradient (#f093fb → #f5576c)
- **Visibility**: Only shows when user is NOT approved as seller

#### 2. Seller Dashboard Button (Approved Sellers)
- **Condition**: `user?.sellerApproved`
- **Action**: Navigate to `/seller` 
- **Styling**: Purple gradient (#667eea → #764ba2) - matches main profile theme
- **Visibility**: Only shows when user IS approved as seller

### Code Structure

```tsx
{/* Seller Registration Button - For non-sellers */}
{!user?.sellerApproved && (
  <Button
    onClick={() => navigate("/request-seller")}
    // Pink gradient styling
  >
    Đăng ký trở thành Seller
  </Button>
)}

{/* Seller Dashboard Button - For approved sellers */}
{user?.sellerApproved && (
  <Button
    onClick={() => navigate("/seller")}
    // Purple gradient styling
  >
    Quản Lý Cửa Hàng
  </Button>
)}
```

## User Journey

### For Regular Users:
1. Visit Profile page → See "Đăng ký trở thành Seller" button (pink)
2. Click button → Navigate to seller registration form
3. Fill form, upload documents → Submit request
4. Admin approves → `sellerApproved = true`
5. Profile refreshes → Pink button disappears, purple button appears

### For Approved Sellers:
1. Visit Profile page → See "Quản Lý Cửa Hàng" button (purple)
2. Click button → Navigate to seller dashboard (`/seller`)
3. Access shop management features

## Styling Consistency

### Pink Button (Registration)
- Gradient: `#f093fb` → `#f5576c`
- Shadow: `rgba(245,87,108,0.4)`
- Hover: Gradient reversal with enhanced shadow

### Purple Button (Dashboard)
- Gradient: `#667eea` → `#764ba2`
- Shadow: `rgba(102,126,234,0.4)`
- Hover: Gradient reversal with enhanced shadow
- **Matches main profile theme**

## Integration Points

### Prerequisites Met:
- ✅ `/request-seller` route exists (seller registration form)
- ✅ `/seller` route exists (seller dashboard page)
- ✅ `user.sellerApproved` property available from AuthContext
- ✅ `navigate()` from React Router available

### Connected Routes:
1. **Non-Sellers**: → `/request-seller` (RequestSeller.tsx)
2. **Sellers**: → `/seller` (Seller dashboard/shop management page)

## User Experience

- **Mutually exclusive buttons**: User never sees both buttons at same time
- **Clear visual distinction**: Different colors indicate different actions
- **Prominent placement**: Full-width buttons below user avatar
- **Smooth transitions**: Gradient reversal on hover
- **Responsive**: Works on all screen sizes

## Files Modified

- ✅ `web/src/pages/user/Profile.tsx` (Lines 428-476)
  - Added conditional seller dashboard button
  - Maintains existing seller registration button
  - Both buttons use consistent styling patterns

## Testing Checklist

- [ ] **Regular User**:
  1. Login as regular (non-seller) user
  2. Navigate to `/profile`
  3. Verify pink "Đăng ký trở thành Seller" button appears
  4. Purple "Quản Lý Cửa Hàng" button should NOT appear
  5. Click pink button → redirects to `/request-seller`

- [ ] **Approved Seller**:
  1. Login as approved seller user (sellerApproved = true)
  2. Navigate to `/profile`
  3. Verify purple "Quản Lý Cửa Hàng" button appears
  4. Pink "Đăng ký trở thành Seller" button should NOT appear
  5. Click purple button → redirects to `/seller`

- [ ] **Styling**:
  1. Buttons match profile design theme
  2. Hover effects work smoothly
  3. Icons display correctly
  4. Text is readable with proper contrast
  5. Responsive on mobile/tablet

## Future Enhancements

- Add badge showing pending approval count
- Add quick links to shop info
- Add shortcut to manage products
- Add sales statistics preview
