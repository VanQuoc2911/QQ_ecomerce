# Seller Order Stats & Management Feature

## 📊 Overview
Đã implement tính năng thống kê đơn hàng và doanh thu cho seller dashboard, cùng với khả năng quản lý trạng thái đơn hàng trực tiếp từ giao diện.

## ✨ Features Implemented

### 1. **Seller Stats Dashboard** 
Hiển thị 6 card thống kê chính:

#### Card 1: Tổng Sản Phẩm
- Hiển thị tổng số sản phẩm mà seller đang bán
- Nền: Xám (#f5f5f5)

#### Card 2: Số Đơn Hàng
- Hiển thị tổng số đơn hàng
- Dòng phụ: "Hoàn thành: X | Chờ: Y"
- Nền: Xám (#f5f5f5)

#### Card 3: Doanh Thu (30 Ngày)
- Hiển thị doanh thu của 30 ngày gần nhất (chỉ đơn hoàn thành)
- Màu chữ: Đỏ (#d32f2f)
- Nền: Cam nhạt (#fff3e0)

#### Card 4: Doanh Thu (Tất Cả)
- Hiển thị tổng doanh thu từ tất cả các đơn hoàn thành
- Màu chữ: Xanh lá (#2e7d32)
- Nền: Xanh nhạt (#e8f5e9)

#### Card 5: Đơn Hoàn Thành
- Số lượng đơn hàng đã hoàn thành
- Màu chữ: Cam đậm (#f57f17)
- Nền: Vàng nhạt (#fff8e1)

#### Card 6: Đơn Chờ Xử Lý
- Số lượng đơn hàng đang chờ xử lý
- Màu chữ: Đỏ đậm (#c62828)
- Nền: Đỏ nhạt (#ffebee)

### 2. **Order Management**
- Tìm kiếm đơn hàng theo mã hoặc tên khách hàng
- Lọc theo trạng thái: Tất cả / Chờ xử lý / Hoàn thành / Hủy
- Hiển thị thông tin đơn hàng: Mã đơn, khách hàng, số sản phẩm, thành tiền, trạng thái, ngày tạo
- Phân trang: 10 đơn hàng mỗi trang

### 3. **Order Detail Dialog**
Khi click "Xem", hiển thị chi tiết đơn hàng:
- Thông tin khách hàng
- Danh sách sản phẩm với hình ảnh, giá, số lượng
- Thông tin shipping address
- Tóm tắt giá (tiền hàng, tổng thanh toán)
- **Buttons cập nhật trạng thái** (Chờ xử lý / Hoàn thành / Hủy)
  - Buttons sẽ tự động ẩn nếu đơn hàng đã có trạng thái đó
  - Onclick: Gọi API để update trạng thái
  - Tự động refresh đơn hàng và danh sách

### 4. **Localization**
- Tất cả labels hiển thị tiếng Việt:
  - `pending` → "Chờ xử lý"
  - `completed` → "Hoàn thành"
  - `cancelled` → "Hủy"
- Status colors phù hợp:
  - Chờ xử lý: Warning (Vàng)
  - Hoàn thành: Success (Xanh)
  - Hủy: Error (Đỏ)

### 5. **Real-time Updates**
- Khi có đơn hàng mới (socket event 'orderPlaced'), stats và danh sách tự động refresh
- Sau khi update trạng thái, danh sách và dialog tự động cập nhật

## 🔧 Technical Implementation

### Backend Changes

#### File: `backend/controllers/sellerController.js`
**Function: `getSellerStats`**
```javascript
export const getSellerStats = async (req, res) => {
  // Tính toán:
  // - totalProducts: Tổng sản phẩm của seller
  // - totalSales: Tổng số đơn hàng
  // - totalRevenue: Tổng doanh thu (chỉ đơn hoàn thành)
  // - completedCount: Số đơn hoàn thành
  // - pendingCount: Số đơn chờ xử lý
  // - cancelledCount: Số đơn hủy
  // - revenueLastMonth: Doanh thu 30 ngày gần nhất (chỉ đơn hoàn thành)
};
```

**API Endpoint**: `GET /api/seller/stats`
- Yêu cầu: Token xác thực + role "seller"
- Response: `{ totalProducts, totalSales, totalRevenue, completedCount, pendingCount, cancelledCount, revenueLastMonth }`

### Frontend Changes

#### File: `web/src/api/sellerService.ts`
**Interface: `SellerStats`**
```typescript
export interface SellerStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  completedCount: number;
  pendingCount: number;
  cancelledCount: number;
  revenueLastMonth: number;
}

export const sellerService = {
  async getStats(): Promise<SellerStats> {
    const { data } = await api.get("/api/seller/stats");
    return data;
  },
  // ... other methods
};
```

#### File: `web/src/pages/seller/SellerOrders.tsx`
**State Management**:
```typescript
const [stats, setStats] = useState<SellerStats>({
  totalProducts: 0,
  totalSales: 0,
  totalRevenue: 0,
  completedCount: 0,
  pendingCount: 0,
  cancelledCount: 0,
  revenueLastMonth: 0,
});
```

**Helper Functions**:
```typescript
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Chờ xử lý",
    completed: "Hoàn thành",
    cancelled: "Hủy",
  };
  return labels[status] || status;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, "warning" | "success" | "error" | "default"> = {
    pending: "warning",
    completed: "success",
    cancelled: "error",
  };
  return colors[status] || "default";
};
```

**Data Loading**:
```typescript
const fetchStats = async () => {
  try {
    const data = await sellerService.getStats();
    setStats(data);
  } catch (err) {
    console.error("Failed to load stats", err);
  }
};

useEffect(() => {
  fetchOrders({ page, limit: rowsPerPage, q, status: statusFilter });
  fetchStats(); // Load stats on component mount

  const onOrderPlaced = () => {
    fetchOrders({ page: 0, limit: rowsPerPage, q, status: statusFilter });
    fetchStats(); // Refresh stats when new order placed
  };

  window.addEventListener("orderPlaced", onOrderPlaced as EventListener);
  return () => window.removeEventListener("orderPlaced", onOrderPlaced as EventListener);
}, [page, rowsPerPage, user]);
```

## 📱 UI Layout

```
┌─────────────────────────────────────────────────────┐
│ Đơn hàng của shop                                   │
├─────────────────────────────────────────────────────┤
│ ┌──────────────┬──────────────┬──────────────────┐ │
│ │ Tổng sản phẩm│ Số đơn hàng   │ Doanh thu (30d)  │ │
│ │ [number]     │ [number]      │ [revenue] ₫      │ │
│ │              │ Hoàn: X, Chờ:Y│ (Orange bg)      │ │
│ └──────────────┴──────────────┴──────────────────┘ │
│ ┌──────────────┬──────────────┬──────────────────┐ │
│ │ Doanh thu (all)│ Đơn hoàn    │ Đơn chờ xử lý   │ │
│ │ [revenue] ₫  │ thành        │                  │ │
│ │ (Green bg)   │ [number]     │ [number]         │ │
│ │              │ (Yellow bg)  │ (Red bg)         │ │
│ └──────────────┴──────────────┴──────────────────┘ │
│                                                     │
│ 🔍 Tìm kiếm mã đơn hoặc khách hàng   [search bar] │
│ Filter: [All] [Chờ xử lý] [Hoàn thành] [Hủy]     │
├─────────────────────────────────────────────────────┤
│ Table with Orders:                                  │
│ | Mã đơn | Khách hàng | Sản phẩm | Thành tiền | ... │
│ |--------|-----------|----------|------------|     │
│ | ID...  | Name      | 2 sản phẩm| 500,000 ₫ | ... │
│ | ...    | ...       | ...      | ...       | ... │
├─────────────────────────────────────────────────────┤
│ Pagination: [<] [1 2 3] [>]  10 rows per page     │
└─────────────────────────────────────────────────────┘
```

## 🔄 Order Status Update Flow

1. **User clicks status button** in order detail dialog
   - Button disabled if order already has that status

2. **Frontend calls API**
   ```
   PATCH /api/orders/:orderId/status
   Body: { status: "pending" | "completed" | "cancelled" }
   ```

3. **Backend processes**
   - Validates status value
   - Checks seller authorization (seller owns this order)
   - Updates order.status in database
   - Emits socket event 'order:statusUpdated' to customer

4. **Frontend updates**
   - Updates selectedOrder state (dialog updates immediately)
   - Refreshes orders list
   - No page refresh needed

## 🎯 API Endpoints

### Get Seller Stats
```
GET /api/seller/stats
Headers: Authorization: Bearer {token}
Response: {
  "totalProducts": 5,
  "totalSales": 42,
  "totalRevenue": 10500000,
  "completedCount": 38,
  "pendingCount": 3,
  "cancelledCount": 1,
  "revenueLastMonth": 3200000
}
```

### Get Seller Orders (Updated pagination)
```
GET /api/seller/orders?page=1&limit=10&q=&status=
Headers: Authorization: Bearer {token}
Response: {
  "items": [...],
  "total": 42
}
```

### Update Order Status
```
PATCH /api/orders/:orderId/status
Headers: Authorization: Bearer {token}
Body: { "status": "completed" }
Response: { "message": "Order status updated", "order": {...} }
```

## 📈 Performance Notes

- **Stats calculation**: O(n) where n = number of seller's orders
  - Database query: `Order.find({ sellerId })` - indexed on sellerId
  - Client-side reduce for sum calculations
  
- **Data refresh frequency**: 
  - Initial load: on component mount
  - On new order: via socket event listener
  - Manual: No manual refresh needed

- **Caching**: Could add in-memory cache if needed (not implemented yet)

## 🚀 Future Enhancements

1. **Advanced Charts**
   - Revenue trend chart (daily/weekly/monthly)
   - Order status distribution pie chart
   - Top selling products

2. **Export/Reports**
   - Export order list to CSV
   - Generate PDF invoice
   - Monthly revenue report

3. **Filters & Analytics**
   - Filter by date range
   - Filter by product category
   - Filter by payment method

4. **Notifications**
   - Email notification when order status changes
   - SMS reminder for pending orders

5. **Optimization**
   - Add caching layer
   - Implement debouncing for frequent API calls
   - Pagination optimization

## ✅ Testing Checklist

- [x] Stats cards display correctly with real data
- [x] Search and filter work properly
- [x] Order detail dialog shows all information
- [x] Status update buttons appear/hide correctly
- [x] Status update API call works
- [x] Order list refreshes after status update
- [x] Dialog updates after status change
- [x] Socket event triggers stats refresh
- [x] All labels are in Vietnamese
- [x] Responsive design on mobile/tablet/desktop
- [x] No console errors or warnings
- [x] Loading states (if applicable)

## 📝 Code Quality

- ✅ TypeScript types properly defined
- ✅ Error handling implemented
- ✅ Helper functions for reusable logic
- ✅ Comments where needed
- ✅ Consistent naming conventions
- ✅ Material-UI components used consistently

---

**Status**: ✅ COMPLETE

**Last Updated**: November 13, 2025

**Contributors**: GitHub Copilot
