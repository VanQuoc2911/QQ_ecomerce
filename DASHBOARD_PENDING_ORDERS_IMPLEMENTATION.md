# Dashboard Pending Orders - Complete Implementation Guide

## Overview

The SellerDashboard now includes a comprehensive **Pending Orders** section that allows sellers to:
- View a quick list of pending orders (limited to 5 orders)
- Search orders by customer name or order ID
- Filter orders by stock status (all / in stock / out of stock)
- View full order details in an interactive dialog
- Quickly update order status (confirm/cancel) from the detail dialog
- See loading indicators while data is fetching
- Auto-refresh when new orders are placed

## Features Implemented

### 1. **Pending Orders Quick List**
- Displays up to 5 pending orders on the dashboard
- Shows customer name, order ID, and total amount
- List has visual list item styling with avatars
- Sorting displays most recent orders first
- Counter shows total pending count from seller stats

### 2. **Search & Filter Controls**
```typescript
- Search Input: Searches orders by customer name, phone, or order ID
- Stock Filter Chips: Filter by all/in-stock/out-of-stock status
- Auto-execute on filter change (immediate feedback)
- Parameters sent to backend API: ?q=search&stock=filter&status=pending
```

### 3. **Loading Indicators**
- Loading spinner shown while pending orders fetch
- Detailed order loading spinner while fetching order detail
- Uses Material-UI CircularProgress component

### 4. **Detail Dialog with Quick Actions**
When clicking "Xem" on any pending order:

```tsx
Dialog shows:
├─ Customer Info (name, ID, shipping address)
├─ Order Items List
│  ├─ Product image
│  ├─ Product title
│  ├─ Quantity & price
│  └─ Category info
├─ Total Amount & Status Chip
└─ Action Buttons:
   ├─ "Đóng" (Close) button
   ├─ "Hủy đơn" (Cancel Order) button (red)
   └─ "Xác nhận" (Confirm) button (green)
```

### 5. **Quick Status Update**
When clicking action buttons in the dialog:
- Calls `orderService.updateOrderStatus(orderId, newStatus)`
- Supported statuses: `processing`, `cancelled`
- Updates local state and refreshes pending orders list
- Refreshes seller stats to update pendingCount
- Dialog remains open after status update

### 6. **Real-time Refresh**
- Listens for `orderPlaced` window event (when new orders come in)
- Auto-fetches pending orders and updates stats
- Provides immediate feedback when orders are placed by customers

## Code Structure

### State Management
```typescript
const [pendingOrders, setPendingOrders] = useState<SellerOrder[]>([]);
const [pendingLoading, setPendingLoading] = useState(false);
const [pendingQ, setPendingQ] = useState("");  // search query
const [pendingStockFilter, setPendingStockFilter] = useState<"all" | "inStock" | "outOfStock">("all");

const [detailOpen, setDetailOpen] = useState(false);  // dialog open state
const [detailLoading, setDetailLoading] = useState(false);  // detail fetch loading
const [selectedDetail, setSelectedDetail] = useState<any>(null);  // selected order detail
```

### Key Functions

#### `fetchPendingOrders(opts?: { q?: string; stock?: string })`
- Fetches pending orders from `/api/seller/orders?status=pending&page=1&limit=5`
- Accepts optional search query and stock filter
- Sets loading state during fetch
- Handles both array and object response shapes

```typescript
const fetchPendingOrders = async (opts?: { q?: string; stock?: string }) => {
  setPendingLoading(true);
  try {
    const params: Record<string, string | number> = { status: "pending", page: 1, limit: 5 };
    if (opts?.q ?? pendingQ) params.q = opts?.q ?? pendingQ;
    if ((opts?.stock ?? pendingStockFilter) && pendingStockFilter !== "all") 
      params.stock = opts?.stock ?? pendingStockFilter;

    const { data } = await api.get("/api/seller/orders", { params });
    const items = Array.isArray(data) ? data : data.items ?? [];
    setPendingOrders(items);
  } catch (err) {
    console.error("❌ fetchPendingOrders error:", err);
  } finally {
    setPendingLoading(false);
  }
};
```

#### `openDetail(orderId: string)`
- Opens the detail dialog
- Dynamically imports and calls `orderService.getOrderDetail(orderId)`
- Handles loading and error states

```typescript
const openDetail = async (orderId: string) => {
  setDetailOpen(true);
  setDetailLoading(true);
  try {
    const { orderService } = await import("../../api/orderService");
    const detail = await orderService.getOrderDetail(orderId);
    setSelectedDetail(detail);
  } catch (err) {
    console.error("Failed to load order detail", err);
    setSelectedDetail(null);
  } finally {
    setDetailLoading(false);
  }
};
```

#### `handleQuickStatus(newStatus: string)`
- Updates order status via `orderService.updateOrderStatus()`
- Refreshes pending orders list and seller stats
- Supports: `processing`, `cancelled`

```typescript
const handleQuickStatus = async (newStatus: string) => {
  if (!selectedDetail) return;
  try {
    const { orderService } = await import("../../api/orderService");
    await orderService.updateOrderStatus(selectedDetail._id, newStatus);
    setSelectedDetail({ ...selectedDetail, status: newStatus });
    await fetchPendingOrders();
    sellerService.getStats().then(setStats).catch(() => {});
  } catch (err) {
    console.error("Failed to update status", err);
  }
};
```

## UI Components Used

- **MUI List, ListItem, ListItemAvatar, ListItemText**: For pending orders list
- **MUI Dialog, DialogTitle, DialogContent, DialogActions**: For detail dialog
- **MUI TextField**: For search input
- **MUI Chip**: For stock filter controls
- **MUI CircularProgress**: For loading indicators
- **MUI Avatar**: For customer avatars in list
- **MUI Button**: For all action buttons

## API Endpoints Used

### Get Seller Stats
```
GET /api/seller/stats
Authorization: Bearer {token}

Response:
{
  totalProducts: number,
  totalSales: number,
  totalRevenue: number,
  completedCount: number,
  pendingCount: number,        // Used for counter
  cancelledCount: number,
  revenueLastMonth: number
}
```

### Get Seller Orders (with filters)
```
GET /api/seller/orders?status=pending&page=1&limit=5&q={search}&stock={filter}
Authorization: Bearer {token}

Query Parameters:
- status: 'pending' (required)
- page: 1 (default)
- limit: 5 (default)
- q: search query (optional, searches customer name/ID)
- stock: 'all' | 'inStock' | 'outOfStock' (optional)

Response:
SellerOrder[] or { items: SellerOrder[] }

interface SellerOrder {
  _id: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}
```

### Get Order Detail
```
GET /api/orders/{orderId}
Authorization: Bearer {token}

Response:
{
  _id: string,
  customerName: string,
  status: string,
  total: number,
  totalAmount: number,
  shippingAddress: { address?: string, ... },
  items: Array<{
    _id: string,
    quantity: number,
    price: number,
    productId?: { title, images, ... },
    product?: { title, images, ... }
  }>,
  ...
}
```

### Update Order Status
```
PATCH /api/orders/{orderId}/status
Authorization: Bearer {token}

Request Body:
{ status: string }

Supported statuses: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled'

Response:
{ message: string, order: OrderDetailResponse }
```

## Event System

### Window Event: `orderPlaced`
When a customer completes a checkout:
1. Backend checkout controller calls `socket.emit('order:created', ...)`
2. Frontend socket listener dispatches `new CustomEvent('orderPlaced')`
3. Dashboard's useEffect listens for this event
4. Automatically refreshes pending orders and stats

```typescript
const onOrderPlaced = () => {
  sellerService.getStats().then(setStats).catch(() => {});
  fetchPendingOrders();
};

window.addEventListener("orderPlaced", onOrderPlaced as EventListener);
return () => window.removeEventListener("orderPlaced", onOrderPlaced as EventListener);
```

## Type Definitions

```typescript
export interface SellerOrder {
  _id: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface ProductSummary {
  _id: string;
  title: string;
  price: number;
  images: string[];
  soldCount?: number;
  createdAt?: string;
}

export interface SellerStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  completedCount: number;
  pendingCount: number;
  cancelledCount: number;
  revenueLastMonth: number;
}
```

## Testing

### Backend Tests (Jest + Supertest)
Location: `backend/__tests__/sellerController.test.js`

Test Suites:
1. **GET /api/seller/stats**
   - Returns correct structure with all required fields
   - Returns 401 if not authenticated
   - Calculates stats correctly for seller with products and orders

2. **GET /api/seller/orders**
   - Returns seller orders with correct status filter
   - Filters orders by pending status correctly
   - Returns 401 if not authenticated
   - Supports pagination with page and limit params

### Frontend Tests
Can be added using React Testing Library to test:
- Rendering of pending orders list
- Search functionality
- Filter chip interactions
- Detail dialog opening/closing
- Status update actions

## Performance Considerations

1. **Limit to 5 orders**: Dashboard shows only recent 5 pending orders for quick overview
2. **Page size = 5**: Server limits results to prevent excessive data transfer
3. **Lazy dynamic imports**: `orderService` is imported dynamically only when needed
4. **No polling**: Uses event-based refresh (orderPlaced event) instead of polling

## Error Handling

- Try-catch blocks catch network errors and log to console
- Dialog shows "Không tải được dữ liệu" (Failed to load data) if detail fetch fails
- Loading state prevents multiple simultaneous requests
- Silent failures log to console without disrupting UI

## Future Enhancements

1. **Toast notifications**: Add success/error toasts on status update
2. **Batch actions**: Select multiple orders for bulk status update
3. **Export orders**: Export pending orders as CSV/PDF
4. **Advanced filters**: Category, origin, price range filters
5. **Analytics**: Track average order processing time, customer satisfaction
6. **Notifications**: Email/SMS notifications when orders are placed
7. **Automation rules**: Auto-confirm orders matching certain criteria
