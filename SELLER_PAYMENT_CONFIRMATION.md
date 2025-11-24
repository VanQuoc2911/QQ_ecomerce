# Seller Payment Confirmation - Implementation Guide

## Overview

This guide shows how to add the "Confirm Payment" button on the seller dashboard so sellers can confirm when they've received payment from customers.

---

## Frontend Implementation Example

### Component: SellerOrderCard or OrderDetailPage

Add confirmation button in the order details view:

```tsx
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';

interface Order {
  _id: string;
  status: 'pending' | 'payment_pending' | 'processing' | 'completed' | 'cancelled';
  totalAmount: number;
  paymentMethod: 'banking' | 'momo' | 'cod';
  // ... other fields
}

function OrderDetailCard({ order, onStatusUpdate }: { order: Order; onStatusUpdate: () => void }) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirmPayment = async () => {
    try {
      setConfirming(true);
      
      const response = await api.post(
        `/api/orders/${order._id}/confirm-payment`
      );

      toast.success('✅ Đã xác nhận thanh toán! Đơn hàng chuyển sang chờ xử lý.');
      setConfirmDialogOpen(false);
      
      // Refresh order data
      onStatusUpdate();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 
        'Lỗi xác nhận thanh toán'
      );
    } finally {
      setConfirming(false);
    }
  };

  // Show confirm button only for payment_pending orders with bank/momo payment
  const canConfirmPayment = 
    order.status === 'payment_pending' && 
    (order.paymentMethod === 'banking' || order.paymentMethod === 'momo');

  return (
    <div>
      {/* Order Details */}
      <div className="order-info">
        <h3>Mã đơn hàng: {order._id}</h3>
        <p>Tổng tiền: {order.totalAmount.toLocaleString('vi-VN')}₫</p>
        <p>Phương thức thanh toán: {order.paymentMethod}</p>
        <p>Trạng thái: {order.status}</p>
      </div>

      {/* Confirmation Button */}
      {canConfirmPayment && (
        <Button
          variant="contained"
          color="success"
          onClick={() => setConfirmDialogOpen(true)}
          sx={{ mt: 2 }}
        >
          ✅ Xác nhận đã nhận tiền
        </Button>
      )}

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialogOpen} 
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Xác nhận thanh toán</DialogTitle>
        <DialogContent>
          <p style={{ marginTop: '16px' }}>
            Bạn có chắc chắn đã nhận được thanh toán từ khách hàng?
          </p>
          <p>
            <strong>Số tiền:</strong> {order.totalAmount.toLocaleString('vi-VN')}₫
          </p>
          <p>
            <strong>Phương thức:</strong> {
              order.paymentMethod === 'banking' ? 'Chuyển khoản' : 'MoMo'
            }
          </p>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialogOpen(false)}
            disabled={confirming}
          >
            Hủy
          </Button>
          <Button 
            onClick={handleConfirmPayment}
            variant="contained"
            color="success"
            disabled={confirming}
            loading={confirming}
          >
            {confirming ? 'Đang xác nhận...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default OrderDetailCard;
```

---

## Where to Add in Your Dashboard

### Option 1: In SellerDashboard Orders Section

Modify your existing seller orders list to include the confirmation action:

```tsx
// web/src/pages/seller/SellerDashboard.tsx

import { Box, Button, Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

function SellerOrdersSection() {
  const [orders, setOrders] = useState([]);

  const handleConfirmPayment = async (orderId: string) => {
    try {
      await api.post(`/api/orders/${orderId}/confirm-payment`);
      toast.success('Xác nhận thanh toán thành công!');
      // Refresh orders
      await fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi xác nhận thanh toán');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payment_pending':
        return 'warning'; // Yellow
      case 'processing':
        return 'info';    // Blue
      case 'completed':
        return 'success'; // Green
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'pending': 'Chờ xác nhận',
      'payment_pending': 'Chờ thanh toán',
      'processing': 'Chờ xử lý',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy',
    };
    return labels[status] || status;
  };

  return (
    <Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Mã đơn</TableCell>
            <TableCell>Khách hàng</TableCell>
            <TableCell>Tổng tiền</TableCell>
            <TableCell>Phương thức</TableCell>
            <TableCell>Trạng thái</TableCell>
            <TableCell>Hành động</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order._id}>
              <TableCell>{order._id}</TableCell>
              <TableCell>{order.fullName}</TableCell>
              <TableCell>{order.totalAmount.toLocaleString('vi-VN')}₫</TableCell>
              <TableCell>
                {order.paymentMethod === 'banking' ? '📱 QR' : 
                 order.paymentMethod === 'momo' ? '💜 MoMo' : 
                 '📦 COD'}
              </TableCell>
              <TableCell>
                <Chip 
                  label={getStatusLabel(order.status)}
                  color={getStatusColor(order.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {order.status === 'payment_pending' && 
                 (order.paymentMethod === 'banking' || order.paymentMethod === 'momo') ? (
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleConfirmPayment(order._id)}
                  >
                    ✅ Xác nhận
                  </Button>
                ) : (
                  <Button size="small" disabled>
                    -
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default SellerOrdersSection;
```

### Option 2: In a Dedicated "Payment Confirmation" Widget

Create a separate widget showing pending confirmations:

```tsx
// web/src/components/seller/PendingPaymentConfirmations.tsx

import { Box, Button, Card, CardContent, Typography, List, ListItem } from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';

interface PendingOrder {
  _id: string;
  fullName: string;
  totalAmount: number;
  paymentMethod: 'banking' | 'momo';
  createdAt: string;
}

function PendingPaymentConfirmations() {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const res = await api.get('/api/orders/seller');
      const pending = res.data.filter((o: any) => o.status === 'payment_pending');
      setPendingOrders(pending);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      await api.post(`/api/orders/${orderId}/confirm-payment`);
      toast.success('✅ Xác nhận thanh toán thành công!');
      setPendingOrders(pendingOrders.filter(o => o._id !== orderId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi xác nhận thanh toán');
    }
  };

  if (loading) return <Typography>Đang tải...</Typography>;

  return (
    <Card sx={{ mb: 3, bgcolor: '#fff3cd', borderLeft: '4px solid #ff9800' }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          ⏳ Chờ xác nhận thanh toán ({pendingOrders.length})
        </Typography>

        {pendingOrders.length === 0 ? (
          <Typography color="text.secondary">
            Không có đơn hàng chờ xác nhận thanh toán.
          </Typography>
        ) : (
          <List>
            {pendingOrders.map((order) => (
              <ListItem 
                key={order._id}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1,
                  border: '1px solid #ffe0b2',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {order.fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đơn: {order._id.substring(0, 8)}... | 
                    {order.paymentMethod === 'banking' ? ' 📱 Chuyển khoản' : ' 💜 MoMo'}
                  </Typography>
                  <Typography variant="subtitle2" color="error" sx={{ mt: 0.5 }}>
                    {order.totalAmount.toLocaleString('vi-VN')}₫
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => handleConfirmPayment(order._id)}
                >
                  ✅ Xác nhận
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export default PendingPaymentConfirmations;
```

---

## API Response Examples

### Successful Confirmation
```json
{
  "message": "Payment confirmed. Order status changed to processing.",
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "processing",
    "paymentMethod": "banking",
    "totalAmount": 500000,
    "userId": "507f1f77bcf86cd799439012",
    "sellerId": "507f1f77bcf86cd799439013"
  }
}
```

### Error - Order Not Found
```json
{
  "message": "Order not found"
}
```

### Error - Unauthorized (Not Seller)
```json
{
  "message": "Unauthorized"
}
```

### Error - Wrong Status
```json
{
  "message": "Cannot confirm payment for order with status: processing. Order must be in \"payment_pending\" status."
}
```

---

## Testing Confirmation Flow

### Test Case 1: Seller Confirms Payment
```
Given: Order in "payment_pending" status
When: Seller clicks "✅ Xác nhận đã nhận tiền"
Then:
  ✓ Dialog confirms request
  ✓ API call: POST /api/orders/{orderId}/confirm-payment
  ✓ Order status changes to "processing"
  ✓ Success toast: "Xác nhận thanh toán thành công!"
  ✓ Order list updates
  ✓ Customer receives notification
```

### Test Case 2: Seller Cannot Confirm Wrong Status
```
Given: Order in "processing" status
When: User tries to confirm payment
Then:
  ✓ Confirm button is disabled/hidden
  ✓ No API call made
```

### Test Case 3: Unauthorized Seller
```
Given: Order belongs to Seller A
When: Seller B tries to confirm payment
Then:
  ✓ API returns 403 Unauthorized
  ✓ Toast shows error: "Bạn không có quyền xác nhận đơn hàng này"
```

---

## Customer Notification

When seller confirms, customer receives:

### Socket Event (Real-time)
```javascript
// Customer receives
{
  type: 'order:paymentConfirmed',
  data: {
    orderId: '507f1f77bcf86cd799439011',
    status: 'processing',
    message: 'Seller đã xác nhận nhận được thanh toán'
  }
}
```

### Database Notification (Persistent)
```javascript
{
  userId: 'customer_id',
  title: '✅ Thanh toán được xác nhận',
  message: 'Seller đã xác nhận nhận được thanh toán. Đơn hàng đang được xử lý.',
  type: 'payment',
  read: false
}
```

---

## Integration with Existing Dashboard

If you already have a seller dashboard, add this to your order section:

```tsx
// In your existing seller order list component
{order.status === 'payment_pending' && (
  <Button
    variant="contained"
    color="success"
    size="small"
    onClick={() => confirmPayment(order._id)}
  >
    ✅ Xác nhận thanh toán
  </Button>
)}
```

Or add the widget to your dashboard:
```tsx
import PendingPaymentConfirmations from '../../components/seller/PendingPaymentConfirmations';

function SellerDashboard() {
  return (
    <Box>
      <PendingPaymentConfirmations />
      {/* ... rest of dashboard */}
    </Box>
  );
}
```

---

## Files to Modify/Create

### New Files
- `web/src/components/seller/PendingPaymentConfirmations.tsx` (Optional widget)

### Existing Files to Update
- `web/src/pages/seller/SellerDashboard.tsx` (Add confirmation button)
- `web/src/pages/seller/SellerOrders.tsx` (Or wherever orders are displayed)

### Already Updated (Backend)
- ✅ `backend/controllers/orderController.js` - confirmPayment function
- ✅ `backend/routes/orderRoutes.js` - POST confirm-payment route

---

## Status Indicators

Use these indicators to show payment status:

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| pending | Blue | ⏳ | New COD order |
| payment_pending | Yellow | ⏳ | Waiting for confirmation |
| processing | Blue | 📦 | Order processing |
| completed | Green | ✅ | Order delivered |
| cancelled | Red | ❌ | Order cancelled |

---

**Ready to Implement!**

Choose Option 1 (add to existing table) or Option 2 (new widget) based on your dashboard layout.

Last Updated: November 15, 2025
