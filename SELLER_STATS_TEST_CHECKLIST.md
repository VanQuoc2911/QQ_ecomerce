# ✅ Seller Stats Feature - Test Checklist

## 🧪 Testing Scenarios

### **Phase 1: Initial Load & Display**

#### Test 1.1: Stats Cards Display
- [ ] Trang tải, 6 stats cards hiển thị
- [ ] Tất cả cards có background color khác nhau
- [ ] Numbers là dạng số (không NaN hoặc undefined)
- [ ] Doanh thu hiển thị format tiền tệ (xxx.xxx ₫)
- [ ] Cards responsive trên mobile (1 cột)
- [ ] Cards responsive trên tablet (2 cột)
- [ ] Cards responsive trên desktop (3 cột)

#### Test 1.2: Stats Values Accuracy
- [ ] Tổng sản phẩm = Number of products with sellerId = current user
- [ ] Số đơn hàng = Count all orders (any status) for seller
- [ ] Doanh thu (tất cả) = Sum of all COMPLETED orders only
- [ ] Doanh thu (30 ngày) = Sum of COMPLETED orders in last 30 days
- [ ] Đơn hoàn thành = Count orders with status = "completed"
- [ ] Đơn chờ xử lý = Count orders with status = "pending"

#### Test 1.3: Table & Filter Load
- [ ] Order table loads with first 10 orders
- [ ] Pagination shows correct total count
- [ ] Status filter chips appear correctly
- [ ] All chips show Vietnamese labels (not English)

---

### **Phase 2: Search & Filter Functionality**

#### Test 2.1: Status Filters
```
[ ] Filter: Tất cả → Shows all orders regardless of status
[ ] Filter: Chờ xử lý → Shows only status = "pending"
[ ] Filter: Hoàn thành → Shows only status = "completed"
[ ] Filter: Hủy → Shows only status = "cancelled"
[ ] Clicking filter → Table updates immediately
[ ] Active filter shows "primary" color on chip
[ ] Filter persists on pagination
```

#### Test 2.2: Search Functionality
```
[ ] Type order ID → Table filters by order ID (partial match)
[ ] Type customer name → Table filters by customer name
[ ] Press Enter → Search applies
[ ] Clear search → All matching status orders show
[ ] Search + filter combined → Works correctly
[ ] Search case-insensitive
[ ] Empty search → Shows all (by status filter)
```

#### Test 2.3: Pagination
```
[ ] Default shows 10 rows per page
[ ] "Rows per page" selector works
[ ] Page navigation: < and > buttons work
[ ] Direct page numbers clickable
[ ] Pagination resets when filtering
[ ] Total count updates after filter
```

---

### **Phase 3: Order Detail Dialog**

#### Test 3.1: Dialog Opens
```
[ ] Click "Xem" button → Dialog opens
[ ] Dialog shows order title with order ID
[ ] Customer info displays correctly:
    [ ] Name
    [ ] Phone
    [ ] Full address (province, district, ward, detail)
[ ] Dialog has close button ("Đóng")
```

#### Test 3.2: Product List Display
```
[ ] All products in order listed
[ ] Each product shows:
    [ ] Product image (thumbnail)
    [ ] Product name/title
    [ ] Unit price (₫)
    [ ] Quantity
    [ ] Subtotal (price × quantity) in red
[ ] Product info readable (no overflow)
[ ] Multiple products display properly
```

#### Test 3.3: Price Summary
```
[ ] "Tiền hàng" = Sum of all product prices × quantities
[ ] Divider line between subtotal and total
[ ] "Tổng thanh toán" = Total amount in red and bold
[ ] Numbers formatted with commas (xxx.xxx)
[ ] Status chip shows with correct color
```

---

### **Phase 4: Status Update Functionality**

#### Test 4.1: Status Buttons Display
```
[ ] Button "Chờ xử lý" (yellow) shows if order status != pending
[ ] Button "Hoàn thành" (green) shows if order status != completed
[ ] Button "Hủy" (red) shows if order status != cancelled
[ ] Buttons are actual Material-UI Button components
[ ] All buttons in DialogActions at bottom
[ ] Close button always visible
```

#### Test 4.2: Update to "Hoàn Thành"
```
Step 1: Create order with status = "pending"
Step 2: Open order detail dialog
[ ] Button "Hoàn thành" is visible
[ ] Button "Chờ xử lý" is visible
Step 3: Click "Hoàn thành" button
[ ] API call: PATCH /api/orders/:orderId/status { status: "completed" }
[ ] Wait for response (1-2 seconds)
[ ] Dialog updates: status chip now shows "Hoàn thành" (green)
[ ] Button "Hoàn thành" now HIDDEN
[ ] Button "Chờ xử lý" still visible
[ ] In table: order's status chip changes to green "Hoàn thành"
```

#### Test 4.3: Update to "Chờ xử lý"
```
Step 1: Take any order (pending or completed)
Step 2: Click "Chờ xử lý" button
[ ] Dialog status updates to yellow "Chờ xử lý"
[ ] Button "Chờ xử lý" becomes hidden
[ ] Table row updates
[ ] Stats cards update (if comes from completed → pending)
```

#### Test 4.4: Cancel Order
```
Step 1: Click "Hủy" button
[ ] Dialog status updates to red "Hủy"
[ ] Button "Hủy" becomes hidden
[ ] Table row status changes to red
[ ] Stats cards update accordingly
```

#### Test 4.5: Error Handling
```
[ ] If user tries to update without auth → Show error message
[ ] If order ID doesn't exist → Show 404 error
[ ] If unauthorized (not seller) → Show 403 error
[ ] If status value invalid → Show validation error
[ ] Error message visible to user (toast/alert)
```

---

### **Phase 5: Real-time Updates**

#### Test 5.1: Socket Event Handling
```
Setup: Have 2 browser tabs open - one as seller, one as customer
Step 1: Customer places order
Step 2: Check seller tab
[ ] Stats cards automatically update (no page refresh)
[ ] New order appears at top of table
[ ] "Đơn chờ xử lý" count increases by 1
[ ] No page refresh needed
```

#### Test 5.2: After Status Update
```
Step 1: Update order status
Step 2: Check both dialog and table
[ ] Dialog shows new status immediately
[ ] Table row shows new status
[ ] Stats update:
    [ ] If pending → completed: +1 completed, -1 pending, +revenue
    [ ] If any → cancelled: -1 from that count
[ ] No duplicate rows appear
```

---

### **Phase 6: Localization (Vietnamese)**

#### Test 6.1: Status Labels
```
[ ] "pending" displays as "Chờ xử lý"
[ ] "completed" displays as "Hoàn thành"
[ ] "cancelled" displays as "Hủy"
[ ] In filter chips
[ ] In table cells
[ ] In dialog status chip
[ ] Buttons text: "Chờ xử lý", "Hoàn thành", "Hủy"
```

#### Test 6.2: Stats Labels
```
[ ] "Tổng sản phẩm"
[ ] "Số đơn hàng"
[ ] "Doanh thu (30 ngày)"
[ ] "Doanh thu (tất cả)"
[ ] "Đơn hoàn thành"
[ ] "Đơn chờ xử lý"
[ ] "Chờ xử lý: X | Chờ: Y" (sub-text)
[ ] All column headers in Vietnamese
[ ] All button labels in Vietnamese
```

---

### **Phase 7: Responsive Design**

#### Test 7.1: Mobile (375px)
```
[ ] Stats cards stack vertically (1 column)
[ ] Table doesn't overflow horizontally
[ ] Search bar full width
[ ] Filter chips wrap properly
[ ] Dialog fits on screen
[ ] Touch-friendly button sizes
```

#### Test 7.2: Tablet (768px)
```
[ ] Stats cards: 2 columns
[ ] Table columns visible
[ ] Search + filter on same row
[ ] Dialog looks good
[ ] No horizontal scroll
```

#### Test 7.3: Desktop (1920px)
```
[ ] Stats cards: 3 columns
[ ] Table fully visible
[ ] Good spacing
[ ] Dialog centered and properly sized
```

---

### **Phase 8: Performance & Edge Cases**

#### Test 8.1: Large Data Sets
```
[ ] Seller with 100+ orders → Table loads fast
[ ] Pagination works smoothly
[ ] No lag when scrolling
[ ] Search with large dataset responds quickly
[ ] Stats calculation doesn't freeze page
```

#### Test 8.2: Edge Cases
```
[ ] Seller with 0 orders → Stats show 0, empty table, message "Không có đơn hàng"
[ ] Seller with 0 revenue → Shows 0 ₫ (not undefined/NaN)
[ ] All orders cancelled → pending count = 0, completed = 0
[ ] Revenue exactly 1,000,000 → Shows "1,000,000 ₫" (formatted)
[ ] Very long customer name → Doesn't break layout
[ ] Very long product name → Shows properly in dialog
```

#### Test 8.3: Browser Compatibility
```
[ ] Chrome/Edge: All features work
[ ] Firefox: All features work
[ ] Safari: All features work
[ ] Mobile browser: Responsive
```

---

### **Phase 9: Integration Tests**

#### Test 9.1: Multi-Seller Scenario
```
Setup: 2 sellers, each with orders
[ ] Seller 1 stats only show their orders
[ ] Seller 1 cannot update Seller 2's orders (403 error)
[ ] Seller 2 sees only their orders and stats
[ ] No data mixing between sellers
```

#### Test 9.2: Order Lifecycle
```
Step 1: Create order (status: pending)
[ ] Stats: totalSales +1, pending +1, revenue no change
Step 2: Update to completed
[ ] Stats: pending -1, completed +1, revenue +amount
Step 3: Update back to pending
[ ] Stats: completed -1, pending +1, revenue -amount
Step 4: Update to cancelled
[ ] Stats: pending -1, cancelled +1, revenue no change
```

#### Test 9.3: Concurrent Updates
```
[ ] Two status updates at same time: second one succeeds/fails gracefully
[ ] Rapid clicking buttons: API debouncing/queuing works
[ ] UI doesn't show conflicting states
```

---

### **Phase 10: Data Accuracy**

#### Test 10.1: Revenue Calculations
```
Setup: Order with:
  - Product A: 100,000 ₫ × 2 = 200,000
  - Product B: 150,000 ₫ × 1 = 150,000
  - Total: 350,000 ₫

[ ] Dialog shows:
    [ ] Tiền hàng: 350,000 ₫
    [ ] Tổng thanh toán: 350,000 ₫
[ ] Stats "Doanh thu (tất cả)" includes this 350,000 after completed
[ ] Stats "Doanh thu (30 ngày)" includes if created < 30 days ago
```

#### Test 10.2: Count Accuracy
```
Given: Seller has:
  - 5 pending orders
  - 10 completed orders
  - 2 cancelled orders
  
[ ] "Số đơn hàng": 17
[ ] "Đơn hoàn thành": 10
[ ] "Đơn chờ xử lý": 5
[ ] Stats card subtitle: "Hoàn: 10 | Chờ: 5"
[ ] Filter "Hoàn thành" shows 10 rows
[ ] Filter "Chờ xử lý" shows 5 rows
[ ] Filter "Hủy" shows 2 rows
[ ] Filter "Tất cả" shows 17 rows
```

---

## 🚀 Test Execution Steps

### Before Testing
1. [ ] Backend running (npm start in backend/)
2. [ ] Frontend running (npm run dev in web/)
3. [ ] MongoDB running with test data
4. [ ] Logged in as seller user
5. [ ] Browser console open (check for errors)

### During Testing
- [ ] Test one scenario at a time
- [ ] Take screenshots for documentation
- [ ] Note any unexpected behavior
- [ ] Check console for errors/warnings
- [ ] Verify API calls in Network tab

### After Testing
- [ ] Compile test results
- [ ] Report bugs with reproduction steps
- [ ] Create tickets for issues
- [ ] Get team sign-off

---

## 📊 Test Results Summary

| Phase | Total Tests | Passed | Failed | Status |
|-------|------------|--------|--------|--------|
| 1: Load & Display | 6 | _ | _ | ⏳ |
| 2: Search & Filter | 9 | _ | _ | ⏳ |
| 3: Dialog | 9 | _ | _ | ⏳ |
| 4: Status Update | 14 | _ | _ | ⏳ |
| 5: Real-time | 6 | _ | _ | ⏳ |
| 6: Localization | 10 | _ | _ | ⏳ |
| 7: Responsive | 9 | _ | _ | ⏳ |
| 8: Performance | 8 | _ | _ | ⏳ |
| 9: Integration | 9 | _ | _ | ⏳ |
| 10: Data Accuracy | 8 | _ | _ | ⏳ |
| **TOTAL** | **88** | **_** | **_** | **⏳** |

---

## 🐛 Known Issues / To-Do

- [ ] (None identified yet - awaiting testing)

---

## 📝 Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | - | - | ⏳ |
| QA Lead | - | - | ⏳ |
| Product Owner | - | - | ⏳ |

---

**Created**: November 13, 2025
**Last Updated**: -
**Version**: 1.0-beta
