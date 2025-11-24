# 🔧 Developer Quick Reference - Seller Stats Feature

## 📁 Files Modified

### Backend Files
```
backend/
├── controllers/
│   └── sellerController.js          ✏️ Updated getSellerStats function
└── routes/
    └── sellerRoutes.js              ✔️ No changes (already has route)
```

### Frontend Files
```
web/src/
├── api/
│   └── sellerService.ts             ✏️ Updated SellerStats interface
└── pages/seller/
    └── SellerOrders.tsx             ✏️ Major updates - stats display + UI
```

---

## 🔄 API Endpoints

### Get Seller Stats
```http
GET /api/seller/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "totalProducts": 5,
  "totalSales": 42,
  "totalRevenue": 10500000,
  "completedCount": 38,
  "pendingCount": 3,
  "cancelledCount": 1,
  "revenueLastMonth": 3200000
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized (no token)
- `403`: Forbidden (not seller role)
- `500`: Server error

---

## 💾 Data Model Updates

### SellerStats Interface
```typescript
// web/src/api/sellerService.ts

export interface SellerStats {
  totalProducts: number;      // All products for seller
  totalSales: number;         // All orders (any status)
  totalRevenue: number;       // Sum of completed orders only
  completedCount: number;     // Orders with status = "completed"
  pendingCount: number;       // Orders with status = "pending"
  cancelledCount: number;     // Orders with status = "cancelled"
  revenueLastMonth: number;   // Revenue from last 30 days (completed only)
}
```

### Order Model (No changes)
```javascript
// backend/models/Order.js
// Already has status field (pending, completed, cancelled)
// Already has totalAmount field
// Already has createdAt field
```

---

## 🎯 Component State Management

### SellerOrders.tsx State
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

const [orders, setOrders] = useState<OrderRow[]>([]);
const [page, setPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(10);
const [total, setTotal] = useState(0);
const [q, setQ] = useState(""); // search query
const [statusFilter, setStatusFilter] = useState<string | null>(null);
const [selectedOrder, setSelectedOrder] = useState<OrderDetailResponse | null>(null);
```

---

## 🔌 Helper Functions

### Status Label Mapping
```typescript
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: "Chờ xử lý",
    completed: "Hoàn thành",
    cancelled: "Hủy",
  };
  return labels[status] || status;
};

// Usage: {getStatusLabel(order.status)}
```

### Status Color Mapping
```typescript
const getStatusColor = (status: string): 
  "warning" | "success" | "error" | "default" => {
  const colors: Record<string, "warning" | "success" | "error" | "default"> = {
    pending: "warning",   // Yellow
    completed: "success", // Green
    cancelled: "error",   // Red
  };
  return colors[status] || "default";
};

// Usage: <Chip color={getStatusColor(status)} />
```

---

## 📡 Data Flow

### Initial Load
```
Component Mount
    ↓
useEffect([page, rowsPerPage, user])
    ↓
    ├─→ fetchOrders()
    │   └─→ GET /api/seller/orders?page=1&limit=10
    │       └─→ setOrders(data.items)
    │
    └─→ fetchStats()
        └─→ GET /api/seller/stats
            └─→ setStats(data)
```

### On New Order (Socket Event)
```
Socket: 'orderPlaced'
    ↓
Window Event: 'orderPlaced'
    ↓
    ├─→ fetchOrders({page: 0})
    │   └─→ Reset to page 1, refresh list
    │
    └─→ fetchStats()
        └─→ Update all 6 stats cards
```

### On Status Update
```
User clicks status button
    ↓
handleUpdateOrderStatus(newStatus)
    ↓
PATCH /api/orders/:orderId/status {status}
    ↓
    ├─→ setSelectedOrder({...selectedOrder, status: newStatus})
    │   └─→ Dialog updates immediately
    │
    ├─→ fetchOrders({page, limit, q, status: statusFilter})
    │   └─→ Table refreshes
    │
    └─→ (Optional) fetchStats() in the update flow
        └─→ Stats cards update
```

---

## 🧮 Stats Calculation Logic

### Backend Calculation
```javascript
// sellerController.js - getSellerStats

const sellerId = req.user.id;

// 1. Count all products
const totalProducts = await Product.countDocuments({ sellerId });

// 2. Get all orders
const allOrders = await Order.find({ sellerId });

// 3. Get completed orders for revenue
const completedOrders = await Order.find({
  sellerId,
  status: "completed",
});

// 4. Get pending orders
const pendingOrders = await Order.find({
  sellerId,
  status: "pending",
});

// 5. Calculate counts
const totalSales = allOrders.length;
const completedCount = completedOrders.length;
const pendingCount = pendingOrders.length;
const cancelledCount = allOrders.filter(o => o.status === "cancelled").length;

// 6. Calculate revenue (completed only)
const totalRevenue = completedOrders.reduce((sum, order) => {
  return sum + (order.totalAmount || 0);
}, 0);

// 7. Calculate last 30 days revenue
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const revenueLastMonth = completedOrders
  .filter(o => new Date(o.createdAt) >= thirtyDaysAgo)
  .reduce((sum, order) => {
    return sum + (order.totalAmount || 0);
  }, 0);

// Return all stats
res.json({
  totalProducts,
  totalSales,
  totalRevenue,
  completedCount,
  pendingCount,
  cancelledCount,
  revenueLastMonth,
});
```

---

## 🎨 UI Layout Structure

```
┌─ SellerOrders.tsx ─────────────────────────┐
│                                             │
│  <Box>                                     │
│    <Typography>Đơn hàng của shop</Typography>
│                                             │
│    {/* 6 Stats Cards Grid */}               │
│    <Box sx={{ display: "grid",             │
│              gridTemplateColumns: ...}}     │
│      <Card> Total Products </Card>          │
│      <Card> Total Sales </Card>             │
│      <Card> Revenue (30d) </Card>           │
│      <Card> Revenue (All) </Card>           │
│      <Card> Completed </Card>               │
│      <Card> Pending </Card>                 │
│    </Box>                                   │
│                                             │
│    {/* Search & Filter */}                  │
│    <Paper sx={{ p: 2 }}>                   │
│      <TextField /> (search)                 │
│      <Stack> (filter chips)                 │
│    </Paper>                                 │
│                                             │
│    {/* Orders Table */}                     │
│    <TableContainer>                         │
│      <Table>                                │
│        <TableHead>                          │
│        <TableBody> (orders.map)             │
│      </Table>                               │
│      <TablePagination />                    │
│    </TableContainer>                        │
│                                             │
│  {/* Order Detail Dialog */}                │
│  <Dialog open={!!selectedOrder}>            │
│    <DialogTitle>                            │
│    <DialogContent>                          │
│      - Customer info                        │
│      - Product list with images             │
│      - Price summary                        │
│      - Status chip                          │
│    </DialogContent>                         │
│    <DialogActions>                          │
│      - Status buttons (pending/completed)   │
│      - Close button                         │
│    </DialogActions>                         │
│  </Dialog>                                  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🔍 Key Functions

### fetchStats()
```typescript
const fetchStats = async () => {
  try {
    const data = await sellerService.getStats();
    setStats(data);
  } catch (err) {
    console.error("Failed to load stats", err);
    // No user-facing error - just log
  }
};
```

### fetchOrders()
```typescript
const fetchOrders = async (opts?: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string | null;
}) => {
  try {
    const p = opts?.page ?? page;
    const limit = opts?.limit ?? rowsPerPage;
    const params: Record<string, string | number> = {
      page: p + 1,
      limit,
    };
    
    if ((opts?.q ?? q)?.length) params.q = opts?.q ?? q;
    if (opts?.status ?? statusFilter) {
      params.status = opts?.status ?? statusFilter;
    }
    
    const { data } = await api.get("/api/seller/orders", { params });
    
    // Handle both formats
    if (Array.isArray(data)) {
      setOrders(data);
      setTotal(data.length);
    } else if (data.items && typeof data.total === "number") {
      setOrders(data.items);
      setTotal(data.total);
    }
  } catch (err) {
    console.error("Failed to load orders", err);
  }
};
```

### handleUpdateOrderStatus()
```typescript
const handleUpdateOrderStatus = async (newStatus: string) => {
  if (!selectedOrder) return;
  try {
    await orderService.updateOrderStatus(selectedOrder._id, newStatus);
    
    // Update dialog immediately
    setSelectedOrder({ ...selectedOrder, status: newStatus });
    
    // Refresh list
    fetchOrders({ page, limit: rowsPerPage, q, status: statusFilter });
  } catch (err) {
    console.error("Failed to update order status", err);
  }
};
```

---

## 🔐 Authorization

### Backend Middleware
```javascript
// orderRoutes.js
router.patch(
  "/:orderId/status",
  verifyToken,              // Must be authenticated
  roleGuard(["seller"]),    // Must be seller role
  updateOrderStatus         // Controller
);
```

### Controller Level Check
```javascript
// orderController.js - updateOrderStatus
const sellerId = req.user.id;
const order = await Order.findById(orderId);

if (order.sellerId.toString() !== sellerId.toString()) {
  return res.status(403).json({ message: "Unauthorized" });
}
```

---

## 📊 Database Queries Performance

### Query 1: Get All Products Count
```javascript
Product.countDocuments({ sellerId })
// ✅ Fast - uses index on sellerId
```

### Query 2: Get All Orders
```javascript
Order.find({ sellerId })
// ✅ Fast if sellerId is indexed
// 📊 Returns array, then filtered in code
```

### Query 3: Get Completed Orders
```javascript
Order.find({ sellerId, status: "completed" })
// ✅ Fast if compound index on (sellerId, status)
```

### Optimization Opportunity
```javascript
// Instead of finding all then filtering, could use:
Order.find({ sellerId, status: { $in: ["completed", "pending"] } })
// This returns only needed documents
```

---

## 🎯 Testing Tips

### Unit Test: Stats Calculation
```typescript
describe("getSellerStats", () => {
  it("should calculate revenue only from completed orders", async () => {
    // Create 2 pending orders (100k each)
    // Create 2 completed orders (200k each)
    // Call getSellerStats
    // Assert: totalRevenue = 400k (not 600k)
  });

  it("should include orders from last 30 days in revenueLastMonth", async () => {
    // Create order 15 days ago: completed, 100k
    // Create order 45 days ago: completed, 200k
    // Call getSellerStats
    // Assert: revenueLastMonth = 100k (not 300k)
  });
});
```

### Integration Test: Status Update
```typescript
describe("Update Order Status", () => {
  it("should update status and notify via socket", async () => {
    const order = await createTestOrder({ status: "pending" });
    const response = await patchOrderStatus(order._id, "completed");
    
    expect(response.status).toBe(200);
    expect(response.body.order.status).toBe("completed");
    
    // Verify socket event emitted
    expect(socketEmitSpy).toHaveBeenCalledWith(
      "order:statusUpdated",
      expect.any(String),
      order.userId,
      expect.objectContaining({ status: "completed" })
    );
  });
});
```

---

## 🐛 Debugging

### Enable Detailed Logging
```javascript
// In sellerController.js getSellerStats
export const getSellerStats = async (req, res) => {
  const sellerId = req.user.id;
  console.log(`[STATS] Calculating for seller: ${sellerId}`);
  
  const totalProducts = await Product.countDocuments({ sellerId });
  console.log(`[STATS] Total products: ${totalProducts}`);
  
  const orders = await Order.find({ sellerId });
  console.log(`[STATS] Total orders: ${orders.length}`);
  console.log(`[STATS] Orders:`, orders.map(o => ({
    _id: o._id,
    status: o.status,
    amount: o.totalAmount
  })));
  
  // ... rest of calculation
};
```

### Check Frontend State
```typescript
// In SellerOrders.tsx useEffect
useEffect(() => {
  console.log("[SellerOrders] Stats loaded:", stats);
  console.log("[SellerOrders] Orders loaded:", orders);
}, [stats, orders]);
```

### API Response Validation
```typescript
const fetchStats = async () => {
  try {
    console.log("[API] Calling GET /api/seller/stats");
    const data = await sellerService.getStats();
    console.log("[API] Response:", data);
    
    // Validate response
    if (!data.totalProducts || data.totalRevenue === undefined) {
      console.error("[API] Invalid response format:", data);
      return;
    }
    
    setStats(data);
  } catch (err) {
    console.error("[API] Error:", err.response?.data || err.message);
  }
};
```

---

## 📚 Related Files & Dependencies

```
backend/
├── models/
│   ├── Order.js           ← Order schema (status, totalAmount, createdAt)
│   ├── Product.js         ← Product schema (sellerId)
│   └── Shop.js            ← Shop info (optional)
├── middleware/
│   └── authMiddleware.js  ← verifyToken, roleGuard
└── utils/
    └── socket.js          ← getIO() for socket events

web/src/
├── api/
│   ├── axios.ts           ← HTTP client config
│   ├── orderService.ts    ← Order API calls
│   └── sellerService.ts   ← Seller API calls (getStats)
├── context/
│   ├── AuthContext.tsx    ← User auth state
│   └── SocketContext.tsx  ← Socket.io connection
└── pages/seller/
    └── SellerOrders.tsx   ← Main component
```

---

## 🚀 Deployment Checklist

- [ ] Backend: getSellerStats function tested
- [ ] Backend: PATCH /api/orders/:orderId/status tested
- [ ] Frontend: SellerStats interface matches API response
- [ ] Frontend: Stats cards display correctly
- [ ] Frontend: Status update buttons work
- [ ] Frontend: Localization all in Vietnamese
- [ ] Database: Indexes on (Order.sellerId, Order.status)
- [ ] Socket.io: 'order:statusUpdated' event working
- [ ] Error handling: All edge cases covered
- [ ] Performance: No N+1 queries
- [ ] Security: Authorization checks in place

---

## 📞 Support & Issues

### Common Issues

**Issue: Stats showing 0 for everything**
- Check: User is logged in as seller
- Check: User has role: "seller"
- Check: There are actual orders in DB for this seller

**Issue: Status buttons not appearing**
- Check: selectedOrder is not null
- Check: selectedOrder.status is set correctly
- Check: Dialog is open

**Issue: Revenue not matching**
- Remember: Only COMPLETED orders count toward revenue
- 30-day revenue only includes last 30 days
- Formula: Sum of order.totalAmount where status = "completed"

**Issue: API returns 403 Forbidden**
- Check: User token is valid
- Check: User role includes "seller"
- Check: User owns the order (seller authorization)

---

**Version**: 1.0
**Last Updated**: November 13, 2025
**Maintained By**: Development Team
