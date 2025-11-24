# 📊 Seller Stats Feature - Visual Overview

## 🎨 Screenshot & Layout Guide

### 1. Stats Cards Section
```
┌─────────────────────────────────────────────────────────────────┐
│                    Đơn hàng của shop                             │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Tổng sản phẩm   │  │  Số đơn hàng      │  │ Doanh thu (30d)  │
│      5           │  │      42           │  │  3.2M ₫          │
│                  │  │ Hoàn: 38|Chờ: 3   │  │   (Orange)       │
│   (Gray bg)      │  │   (Gray bg)       │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Doanh thu (tất)  │  │ Đơn hoàn thành    │  │ Đơn chờ xử lý    │
│  10.5M ₫         │  │      38           │  │      3           │
│                  │  │   (Yellow bg)     │  │   (Red bg)       │
│  (Green bg)      │  │                   │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 2. Search & Filter Section
```
┌─────────────────────────────────────────────────────────────────┐
│ [🔍 Tìm kiếm mã đơn hoặc khách hàng          ]                  │
│                                                                  │
│ [ Tất cả ] [ Chờ xử lý ] [ Hoàn thành ] [ Hủy ]               │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Orders Table
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Mã đơn   │ Khách hàng │ Sản phẩm  │ Thành tiền  │ Trạng thái │ Ngày | Hành động │
├──────────┼────────────┼───────────┼─────────────┼────────────┼──────┼──────────┤
│ 507a4... │ Nguyễn Văn │ 2 sản phẩm│ 500,000 ₫   │ Hoàn thành │ 13/11│  [Xem]   │
├──────────┼────────────┼───────────┼─────────────┼────────────┼──────┼──────────┤
│ 603b5... │ Trần Thị B │ 1 sản phẩm│ 250,000 ₫   │ Chờ xử lý  │ 12/11│  [Xem]   │
├──────────┼────────────┼───────────┼─────────────┼────────────┼──────┼──────────┤
│ 704c6... │ Phạm Việt  │ 3 sản phẩm│ 1,000,000 ₫ │ Hủy        │ 11/11│  [Xem]   │
└─────────────────────────────────────────────────────────────────────────────┘

Hiển thị 1–10 của 42  [ < ] [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ > ]
```

### 4. Order Detail Dialog (When "Xem" is clicked)
```
┌────────────────────────────────────────────────────────────────┐
│ Chi tiết đơn hàng #507a4...                               [✕] │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 👤 Nguyễn Văn A                                                │
│ 📱 0912345678                                                  │
│ 📍 TP. Hồ Chí Minh, Quận 1, Phường Bến Nghé, 123 Nguyễn Huệ  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ 📷 Product Image      Sản phẩm: Áo Thun Nam            │   │
│ │                       Đơn giá: 100,000 ₫               │   │
│ │                       Số lượng: 2                        │   │
│ │                       Thành tiền: 200,000 ₫            │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ 📷 Product Image      Sản phẩm: Quần Jeans              │   │
│ │                       Đơn giá: 250,000 ₫               │   │
│ │                       Số lượng: 1                        │   │
│ │                       Thành tiền: 250,000 ₫            │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ Tiền hàng:              450,000 ₫                       │   │
│ │ ─────────────────────────────────────────────────────── │   │
│ │ Tổng thanh toán:        450,000 ₫                       │   │
│ │ Trạng thái: [Chờ xử lý]                                │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│                  [Chờ xử lý] [Hoàn thành] [Hủy] [Đóng]        │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Color Scheme

### Status Colors
```
┌──────────────────┬──────────────┬──────────────────────────┐
│ Status           │ Color        │ Usage                    │
├──────────────────┼──────────────┼──────────────────────────┤
│ Chờ xử lý        │ 🟡 Warning   │ Chip, Button (yellow)    │
│ (pending)        │              │                          │
├──────────────────┼──────────────┼──────────────────────────┤
│ Hoàn thành       │ 🟢 Success   │ Chip, Button (green)     │
│ (completed)      │              │                          │
├──────────────────┼──────────────┼──────────────────────────┤
│ Hủy              │ 🔴 Error     │ Chip, Button (red)       │
│ (cancelled)      │              │                          │
└──────────────────┴──────────────┴──────────────────────────┘
```

### Card Background Colors
```
Card 1: Tổng sản phẩm       → #f5f5f5 (Light Gray)
Card 2: Số đơn hàng         → #f5f5f5 (Light Gray)
Card 3: Doanh thu (30d)     → #fff3e0 (Light Orange)
Card 4: Doanh thu (tất cả)  → #e8f5e9 (Light Green)
Card 5: Đơn hoàn thành      → #fff8e1 (Light Yellow)
Card 6: Đơn chờ xử lý       → #ffebee (Light Red)
```

---

## 📱 Responsive Breakpoints

### Mobile (< 600px)
```
Stats Cards: 1 column (stacked vertically)
Search + Filter: Stacked (full width)
Table: Horizontal scroll (if needed)
Dialog: Full width, modal
```

### Tablet (600px - 960px)
```
Stats Cards: 2 columns
Search + Filter: Side by side
Table: Visible, some columns may truncate
Dialog: Sized appropriately
```

### Desktop (> 960px)
```
Stats Cards: 3 columns (2 rows)
Search + Filter: Side by side
Table: Full visibility
Dialog: Centered, appropriately sized
```

---

## 🔄 Interaction Flows

### Flow 1: Initial Page Load
```
User navigates to "Đơn hàng của shop"
    ↓
Page loads SellerOrders component
    ↓
useEffect triggers with [user, page, rowsPerPage]
    ↓
├─→ Calls fetchStats() 
│   └─→ GET /api/seller/stats
│       └─→ Receives: {totalProducts, totalSales, totalRevenue, ...}
│           └─→ setStats(data)
│               └─→ 6 cards render with real data
│
└─→ Calls fetchOrders()
    └─→ GET /api/seller/orders?page=1&limit=10
        └─→ Receives: {items: [...], total: 42}
            └─→ setOrders(data.items)
                └─→ Table renders with 10 orders
                └─→ Pagination shows "1-10 of 42"
```

### Flow 2: New Order Arrives (Socket Event)
```
Customer places order for this seller
    ↓
Backend emits socket event: 'order:created' to seller room
    ↓
Frontend SocketContext listens for event
    ↓
Dispatches window event: 'orderPlaced'
    ↓
SellerOrders component's listener catches it
    ↓
├─→ Calls fetchOrders({page: 0, ...})
│   └─→ Refreshes orders table
│       └─→ New order appears at top
│
└─→ Calls fetchStats()
    └─→ Updates all 6 stats cards
        └─→ totalSales: +1
        └─→ totalPending: +1 (or pendingCount)
        └─→ Doanh thu (tất cả): no change (order not completed)
```

### Flow 3: Update Order Status
```
User opens order detail dialog
    ↓
Dialog shows order info + status buttons
    ↓
User clicks "Hoàn thành" button
    ↓
handleUpdateOrderStatus("completed") called
    ↓
├─→ PATCH /api/orders/:orderId/status {status: "completed"}
│   └─→ Backend verifies seller ownership
│   └─→ Updates order.status in database
│   └─→ Emits socket 'order:statusUpdated' to customer
│   └─→ Returns success response
│
├─→ setSelectedOrder({...selectedOrder, status: "completed"})
│   └─→ Dialog updates immediately (status chip changes color)
│
├─→ fetchOrders({page, limit, q, status: statusFilter})
│   └─→ Table row updates (status chip changes)
│
└─→ (Implicit) Stats cards may need refresh
    (Could add: fetchStats() here for immediate update)
```

### Flow 4: Search Orders
```
User types "Nguyễn" in search box
    ↓
onChange event updates q state
    ↓
User presses Enter key
    ↓
onKeyDown condition triggers
    ↓
Calls fetchOrders({page: 0, limit: 10, q: "Nguyễn", status: ...})
    ↓
GET /api/seller/orders?page=1&limit=10&q=Nguyễn&status=...
    ↓
Backend filters by customer name (partial match)
    ↓
Returns matching orders
    ↓
Table updates to show only matching results
```

### Flow 5: Filter by Status
```
User clicks "Hoàn thành" filter chip
    ↓
setStatusFilter("completed") called
    ↓
Calls fetchOrders({page: 0, limit: 10, q: "", status: "completed"})
    ↓
GET /api/seller/orders?page=1&limit=10&status=completed
    ↓
Backend filters by status
    ↓
Table shows only completed orders
    ↓
Chip shows "primary" color (active state)
```

---

## 🧪 Test Scenarios Visual

### Scenario A: New Seller with No Orders
```
Stats Cards Display:
┌──────┐  ┌──────┐  ┌──────┐
│ Prod │  │ Đơn  │  │ Thu  │
│  0   │  │  0   │  │  0 ₫ │
└──────┘  └──────┘  └──────┘

Table Display:
┌───────────────────────────┐
│ Không có đơn hàng         │
└───────────────────────────┘
```

### Scenario B: Seller with Mixed Orders
```
Stats Show:
Total Sales: 42
Completed: 38  (Hoàn thành: 38)
Pending: 3     (Chờ xử lý: 3)
Cancelled: 1   (Hủy: 1)

Table Filter Options:
[ Tất cả ] - Shows all 42
[ Chờ xử lý ] - Shows 3
[ Hoàn thành ] - Shows 38
[ Hủy ] - Shows 1
```

### Scenario C: Update Status
```
Before:
Dialog shows status: "Chờ xử lý" (Yellow chip)
Buttons visible: [Hoàn thành] [Hủy]

User clicks "Hoàn thành"
    ↓
After (immediate):
Dialog shows status: "Hoàn thành" (Green chip)
Buttons visible: [Chờ xử lý] [Hủy]  ← "Hoàn thành" disappears
```

---

## 🎬 Animation & Transitions (Recommended for Future)

```
Stats Cards: Fade in on load (0.3s)
Table Rows: Highlight on update (0.5s)
Dialog: Slide in from right (0.3s)
Status Chip: Color transition (0.2s)
Button Hover: Background color change (0.15s)
```

---

## 📊 Data Display Examples

### Revenue Formatting
```
1000         → "1,000 ₫"
1000000      → "1,000,000 ₫"
3200000      → "3,200,000 ₫"
10500000     → "10,500,000 ₫"
```

### Date Formatting (Vietnamese)
```
2024-11-13   → "13/11/2024"
2024-11-01   → "01/11/2024"
2024-10-15   → "15/10/2024"
```

### Order ID Display
```
Full ID: "507a4b3c2d1e0f9a8b7c6d5e4f3a2b1c"
Display: "507a4b3c..." (first 8 chars + ...)
```

---

## ✨ Visual Hierarchy

```
Primary: Stats Numbers (h5, bold, large)
         Example: "5", "42", "10,500,000 ₫"

Secondary: Stats Labels (body2, smaller)
           Example: "Tổng sản phẩm"

Tertiary: Supporting Text (caption, smallest, gray)
          Example: "Hoàn: 38 | Chờ: 3"

Actions: Buttons and Chips
         Example: [Xem], [Hoàn thành], [Hủy]
```

---

## 🎯 Key Visual Elements

### Icons (Recommended additions)
```
Card 1: 📦 Tổng sản phẩm
Card 2: 📋 Số đơn hàng
Card 3: 💰 Doanh thu (30 ngày)
Card 4: 🏆 Doanh thu (tất cả)
Card 5: ✅ Đơn hoàn thành
Card 6: ⏳ Đơn chờ xử lý

Search: 🔍 Tìm kiếm
Filter: 🏷️ Trạng thái
View: 👁️ Xem chi tiết
```

### Button States
```
Normal:   [Text] (gray bg)
Hover:   [Text] (darker bg, slight shadow)
Active:   [Text] (color bg, filled)
Disabled: [Text] (gray bg, opacity 0.5)
```

---

## 🔍 Layout Density

### Compact Mode (Recommended Current)
```
Card spacing: 16px (gap: 2)
Padding: 16px (p: 2)
Font sizes: Small-Medium
Line height: Normal
```

### Spacious Mode (Optional Future)
```
Card spacing: 24px
Padding: 24px
Font sizes: Medium-Large
Line height: 1.6
```

---

## 📈 Growth Trajectory

### Week 1
- Display stats correctly
- Users see KPIs
- Basic order management works

### Week 2
- Add animations
- Improve loading states
- Add toast notifications

### Week 3
- Add charts
- Export functionality
- Advanced filters

### Month 2+
- Mobile app
- Email notifications
- Advanced analytics

---

**Visual Design Guide Created**: November 13, 2025
**UI Framework**: Material-UI (MUI)
**Responsive**: Mobile-first approach
**Accessibility**: WCAG 2.1 AA standard
**Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
