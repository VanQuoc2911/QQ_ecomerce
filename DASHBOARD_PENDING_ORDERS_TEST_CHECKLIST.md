# Dashboard Pending Orders - Test Checklist ✅

Last Updated: 2025-11-13

## Pre-Test Setup

- [ ] Backend server running (`npm start` or `node backend/server.js`)
- [ ] Frontend dev server running (`npm run dev` from web folder)
- [ ] MongoDB connection active
- [ ] Logged in as a seller account
- [ ] Browser console open (F12) to check for errors

---

## UI Rendering Tests

### Dashboard Layout
- [ ] Dashboard page loads without errors
- [ ] "📊 Tổng quan cửa hàng" heading visible
- [ ] Three stat cards visible (Số sản phẩm, Số đơn hàng, Doanh thu)
- [ ] "🔥 Sản phẩm bán chạy" section visible
- [ ] "⏳ Đơn chờ xử lý" section visible with counter
- [ ] "Xem tất cả" button visible

### Pending Orders Section
- [ ] Search input field visible
- [ ] "Tìm" (Search) button visible
- [ ] Stock filter chips visible: [Tất cả] [Còn hàng] [Hết hàng]
- [ ] Pending orders list displays (if orders exist)
- [ ] Each order shows: customer name, order ID snippet, amount, "Xem" button
- [ ] "Không có đơn chờ xử lý" message shows when no pending orders

---

## Loading Indicator Tests

### Initial Load
- [ ] Spinner appears while pending orders are loading
- [ ] Spinner disappears when data loads
- [ ] Orders display after loading completes
- [ ] No console errors during loading

### Detail Dialog Loading
- [ ] Clicking "Xem" button opens dialog
- [ ] Dialog shows "Chi tiết đơn hàng" title
- [ ] Loading spinner appears while fetching order details
- [ ] Order details display after loading
- [ ] Customer name, ID, and address visible
- [ ] Product list with images displays
- [ ] Total amount shows
- [ ] Status chip displays with color coding

---

## Search Functionality Tests

### Search Input
- [ ] Can type in search field
- [ ] Cursor visible in search input
- [ ] Text appears as you type

### Search Execution
- [ ] Click "Tìm" button with empty search → displays all orders
- [ ] Search by customer name (e.g., "John") → filters correctly
- [ ] Search by order ID (e.g., "611c") → filters correctly
- [ ] Search with no matches → shows "Không có đơn chờ xử lý"
- [ ] Clear search and search again → works multiple times
- [ ] No console errors during search

---

## Filter Functionality Tests

### Stock Filter Chips
- [ ] All chips clickable
- [ ] Clicked chip changes color/appearance (active state)
- [ ] Only one chip can be active at a time
- [ ] Clicking same chip again → stays active

### Filter Results
- [ ] [Tất cả] shows all pending orders
- [ ] [Còn hàng] filters to in-stock orders
- [ ] [Hết hàng] filters to out-of-stock orders
- [ ] Filter changes update list immediately
- [ ] Combining search + filter works correctly

---

## Detail Dialog Tests

### Opening Dialog
- [ ] Clicking "Xem" button opens modal dialog
- [ ] Dialog centered on screen
- [ ] Dialog modal backdrop visible (semi-transparent)
- [ ] Dialog title "Chi tiết đơn hàng" visible
- [ ] No page scroll while dialog open

### Dialog Content
- [ ] Customer name displayed in blue/primary color
- [ ] Order ID displayed below name
- [ ] Shipping address shows with 📍 icon
- [ ] "Sản phẩm" section header visible
- [ ] Product items display with:
  - [ ] Product image thumbnail
  - [ ] Product title
  - [ ] Quantity × price
  - [ ] Category info (if available)
- [ ] Multiple products display correctly (if order has multiple items)
- [ ] Total amount shows in primary color
- [ ] Status chip shows with appropriate color:
  - [ ] Red for PENDING/CANCELLED
  - [ ] Orange/Yellow for PROCESSING
  - [ ] Green for COMPLETED

### Dialog Actions
- [ ] "Đóng" button visible and clickable
- [ ] "Hủy đơn" button visible (red) and clickable
- [ ] "✓ Xác nhận" button visible (green) and clickable
- [ ] Buttons are properly spaced

---

## Quick Action Tests

### Update Status to "processing" (Xác nhận)
- [ ] Click "✓ Xác nhận" button
- [ ] Order makes API call to update status
- [ ] No error appears in console
- [ ] Status chip in dialog changes
- [ ] Dialog remains open (doesn't close immediately)
- [ ] Pending orders list refreshes
- [ ] Pending count decreases by 1
- [ ] Seller stats update (pendingCount decreases)

### Cancel Order (Hủy đơn)
- [ ] Click "Hủy đơn" button
- [ ] Order makes API call to update status
- [ ] No error appears in console
- [ ] Status chip changes to CANCELLED
- [ ] Dialog remains open
- [ ] Pending orders list refreshes
- [ ] Cancelled order disappears from pending list (if showing only pending)
- [ ] Seller stats update

### Close Dialog (Đóng)
- [ ] Click "Đóng" button
- [ ] Dialog closes
- [ ] Page scrollable again
- [ ] No state changes on close
- [ ] List remains as before closing

---

## Real-time Refresh Tests

### Auto-Refresh on New Orders
- [ ] Open dashboard in one browser tab
- [ ] In another tab/window, place a new order (as a customer)
- [ ] Wait 1-2 seconds
- [ ] Dashboard pending orders automatically refresh
- [ ] New order appears in the list
- [ ] Pending count increases
- [ ] No manual refresh needed
- [ ] No error messages

---

## Responsive Design Tests

### Desktop (1920x1080)
- [ ] All elements visible and properly spaced
- [ ] Search and filter controls on single line
- [ ] Pending orders list readable
- [ ] Dialog centered and properly sized

### Tablet (768x1024)
- [ ] Controls stack if needed
- [ ] List items don't overflow
- [ ] Dialog readable and usable
- [ ] Buttons accessible without scrolling dialog

### Mobile (375x667)
- [ ] All controls visible (may stack)
- [ ] Search input full width or adequate width
- [ ] List items readable
- [ ] Dialog scrollable if needed
- [ ] Action buttons clickable (not too small)

---

## Error Handling Tests

### Network Errors
- [ ] Turn off internet/network
- [ ] Try to load pending orders → shows error or empty state
- [ ] Try to open order detail → shows error or loading state
- [ ] Restore connection and retry → works normally

### Invalid Order ID
- [ ] Manually modify URL to invalid order ID
- [ ] Try to open detail → shows "Không tải được dữ liệu"
- [ ] Dialog doesn't crash

### Authentication Errors
- [ ] Logout from application
- [ ] Try to access dashboard
- [ ] Should redirect to login (not show pending orders)
- [ ] No sensitive data visible

---

## Performance Tests

### Initial Load Time
- [ ] Dashboard loads in < 2 seconds
- [ ] Pending orders fetch in < 1 second
- [ ] Stats card updates quickly
- [ ] No lag when scrolling

### Detail Dialog
- [ ] Dialog opens immediately
- [ ] Detail data fetches in < 2 seconds
- [ ] Dialog remains responsive during fetch

### Search Performance
- [ ] Typing in search is smooth (no lag)
- [ ] Search results return in < 1 second
- [ ] No blocking of UI during search

---

## Browser Compatibility Tests

- [ ] Chrome/Chromium: All tests pass ✓
- [ ] Firefox: All tests pass ✓
- [ ] Safari: All tests pass ✓
- [ ] Edge: All tests pass ✓

---

## Accessibility Tests

- [ ] Can navigate dialog with keyboard (Tab key)
- [ ] Can close dialog with Escape key
- [ ] Buttons have visible focus state
- [ ] Text is readable (sufficient contrast)
- [ ] Images have alt text
- [ ] No keyboard traps

---

## API Integration Tests

### GET /api/seller/stats
- [ ] Returns 200 OK
- [ ] Response includes all required fields
- [ ] Numbers are correct type (numbers, not strings)
- [ ] pendingCount matches pending orders displayed

### GET /api/seller/orders?status=pending
- [ ] Returns 200 OK
- [ ] Filters by status=pending correctly
- [ ] Pagination works (page=1&limit=5)
- [ ] Search query parameter filters correctly
- [ ] Stock filter parameter works

### GET /api/orders/{orderId}
- [ ] Returns 200 OK
- [ ] Returns full order detail
- [ ] Includes all nested data (items, products)
- [ ] Handles invalid orderId gracefully (400/404)

### PATCH /api/orders/{orderId}/status
- [ ] Returns 200 OK
- [ ] Updates order status correctly
- [ ] Only seller of order can update
- [ ] Invalid status rejected
- [ ] Returns updated order in response

---

## Console Tests

- [ ] No TypeScript/ESLint errors in console
- [ ] No unhandled promise rejections
- [ ] No deprecated API warnings
- [ ] No CORS errors
- [ ] Only expected debug/info logs (if any)

---

## Post-Test Cleanup

- [ ] Clear test data from database (optional)
- [ ] Verify database integrity
- [ ] Check server logs for errors
- [ ] Document any issues found
- [ ] Note any improvement suggestions

---

## Sign-Off

| Item | Status | Tester | Date |
|------|--------|--------|------|
| All Unit Tests | ☐ Pass | | |
| All Integration Tests | ☐ Pass | | |
| All UI Tests | ☐ Pass | | |
| All Performance Tests | ☐ Pass | | |
| All Accessibility Tests | ☐ Pass | | |

**Overall Status**: ☐ READY FOR PRODUCTION

---

## Known Issues / Notes

```
(List any bugs, limitations, or future improvements here)

Example:
- Stock filter doesn't work server-side yet (needs backend implementation)
- Toast notifications not yet implemented
- Bulk actions feature planned for v2
```

---

## Test Evidence

Attach screenshots or video evidence of:
- [ ] Dashboard with pending orders
- [ ] Detail dialog open
- [ ] Search functionality
- [ ] Filter functionality
- [ ] Status update confirmation
- [ ] Auto-refresh on new order
