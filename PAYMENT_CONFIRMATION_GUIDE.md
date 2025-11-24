# Payment Confirmation System - User Guide

## Overview

When customers choose **Banking (QR)** or **MoMo** payment methods, the order enters a **"Chờ thanh toán" (payment_pending)** state. The seller must then confirm payment received to advance the order to **"Chờ xử lý" (processing)** state.

---

## Order Status Flow

```
┌─────────────┐
│ COD Payment │ → status: "pending" → Ready for processing
└─────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Banking/MoMo Payment                                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Customer places order                                   │
│    → status: "payment_pending"                             │
│    → QR code displayed for customer                        │
│ 2. Customer completes transfer                             │
│ 3. Seller confirms payment received (Button click)         │
│    → status: "processing" (chờ xử lý)                      │
│ 4. Order proceeds to fulfillment                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Customer Experience

### Step 1: Select Payment Method
On checkout page, customer selects:
- **📱 QR Ngân Hàng** (Banking QR)
- **💜 MoMo** (Momo Wallet)
- **📦 COD** (Cash on Delivery - no confirmation needed)

### Step 2: Order Created
When selecting Banking/MoMo:
- Order is created with `status: "payment_pending"`
- Customer is redirected to `/payment/{orderId}` page

### Step 3: Payment Page Display
On PaymentGateway page:
```
┌─────────────────────────────────────────────────┐
│ ⏳ Chờ xác nhận thanh toán                      │
├─────────────────────────────────────────────────┤
│ Bạn đã hoàn thành chuyển khoản. Vui lòng      │
│ chờ seller xác nhận đã nhận được tiền.        │
│                                                │
│ Đơn hàng sẽ chuyển sang trạng thái            │
│ "Chờ xử lý" sau khi seller xác nhận.         │
└─────────────────────────────────────────────────┘
```

If QR method selected:
- QR code displayed (pre-generated with CRC checksum)
- Manual transfer instructions provided
- Account holder name and number shown

If MoMo method selected:
- MoMo QR code shown
- Option to open MoMo app directly

### Step 4: Wait for Seller Confirmation
Customer sees:
- Order status: "payment_pending" (Chờ thanh toán)
- Instructions: "Vui lòng chờ seller xác nhận"
- Cannot proceed until seller confirms

---

## Seller Experience

### Finding Payment Pending Orders

On **Seller Dashboard**:
1. Go to "Đơn hàng" (Orders) section
2. Filter by status: "Chờ thanh toán" (payment_pending)
3. View orders waiting for payment confirmation

### Confirming Payment Received

**API Endpoint:**
```
POST /api/orders/{orderId}/confirm-payment
```

**Requirements:**
- Seller must be authenticated
- Order must belong to this seller
- Order must be in "payment_pending" status

**Flow:**
1. Seller receives transfer notification from bank/MoMo
2. Seller opens order details
3. Seller clicks "✅ Xác nhận đã nhận tiền" button
4. System updates order status to "processing"
5. Customer is notified with socket event

**What happens after confirmation:**
- Order status changes: `payment_pending` → `processing` (chờ xử lý)
- Customer receives notification: "Thanh toán được xác nhận"
- Order appears in "Chờ xử lý" section of seller dashboard
- Seller can now prepare and ship the order

### Backend Confirmation Logic

When seller confirms payment:

```javascript
// POST /api/orders/{orderId}/confirm-payment
// Seller confirms payment received

Changes:
- Order.status: "payment_pending" → "processing"

Notifications sent:
- Customer receives: "Seller đã xác nhận nhận được thanh toán"
- Socket emit: order:paymentConfirmed event

Message to customer:
"Seller đã xác nhận nhận được thanh toán. Đơn hàng đang được xử lý."
```

---

## Technical Implementation

### 1. Order Model - Added Status
```javascript
// backend/models/Order.js
status: {
  type: String,
  enum: ["pending", "payment_pending", "processing", "completed", "cancelled"],
  default: "pending",
}
```

### 2. Order Creation Logic
```javascript
// backend/controllers/checkoutController.js
// Set status based on payment method
status: (paymentMethod === "banking" || paymentMethod === "momo") && 
        paymentMethod !== "cod"
  ? "payment_pending"  // Waiting for seller confirmation
  : "pending"          // Ready to process (COD)
```

### 3. Seller Confirmation Endpoint
```javascript
// backend/controllers/orderController.js
export const confirmPayment = async (req, res) => {
  // 1. Verify order exists and belongs to seller
  // 2. Verify order is in "payment_pending" status
  // 3. Update status to "processing"
  // 4. Notify customer via notification + socket
}
```

### 4. API Routes
```javascript
// backend/routes/orderRoutes.js
POST /api/orders/:orderId/confirm-payment
  - Requires: Seller authentication
  - Guard: roleGuard(["seller"])
  - Action: confirmPayment controller
```

### 5. Frontend Status Display
```tsx
// web/src/pages/user/PaymentGateway.tsx
if (paymentData.status === "payment_pending") {
  // Show waiting message with yellow alert
  // Display order details
  // Show payment instructions
}
```

---

## Status Summary Table

| Status | Meaning | Who Sets | What Happens Next |
|--------|---------|----------|-------------------|
| `pending` | New COD order | System on checkout | Seller processes immediately |
| `payment_pending` | Banking/MoMo order, waiting for confirmation | System on checkout | Seller clicks confirm button |
| `processing` | Payment confirmed, order processing | Seller clicks confirm button | Seller ships order |
| `completed` | Order delivered | Seller updates (or system auto) | Order completed |
| `cancelled` | Order cancelled | Either party | No fulfillment |

---

## User Stories

### User Story 1: Customer Places Order with Bank Transfer
```
Given: Customer wants to buy items
When: Customer selects "Banking QR" payment
Then: 
  - Order is created with status "payment_pending"
  - Customer sees QR code on payment page
  - Customer sees message "Chờ seller xác nhận"
And: 
  - Seller receives notification of new order
  - Seller sees order in "Chờ thanh toán" section
```

### User Story 2: Seller Confirms Payment Received
```
Given: Seller has received payment from customer
When: Seller clicks "✅ Xác nhận đã nhận tiền"
Then:
  - Order status changes to "processing"
  - Customer receives notification
  - Customer can track order progress
And:
  - Seller can prepare for shipment
  - Order moves to "Chờ xử lý" section
```

### User Story 3: Customer Places COD Order
```
Given: Customer wants COD (cash on delivery)
When: Customer selects "COD" payment
Then:
  - Order is created with status "pending"
  - Customer sees order confirmation
  - Order immediately goes to "Chờ xử lý" (no payment confirmation needed)
And:
  - Seller can start processing immediately
```

---

## Common Questions

### Q1: What if seller doesn't confirm payment?
**A:** Order stays in "payment_pending" status. The system doesn't auto-confirm. Seller must manually click the confirmation button.

### Q2: Can customer cancel after payment?
**A:** During "payment_pending" status, customer can still cancel (implementation pending). After seller confirms ("processing"), cancellation requires seller approval.

### Q3: What about payment timeout?
**A:** Orders have `paymentDeadline` (24 hours by default). If deadline passes without confirmation, order can be marked as `paymentExpired`. Seller can still manually confirm if payment arrives late.

### Q4: Does seller get notified of payment transfer?
**A:** The system doesn't directly receive bank notifications. Seller must monitor:
- Bank app notifications
- MoMo app notifications  
- Then manually confirm in our system

### Q5: Can multiple orders be confirmed at once?
**A:** Current implementation requires per-order confirmation. Batch confirmation feature can be added later.

---

## Configuration

### Payment Methods in Checkout
```tsx
// web/src/pages/user/Checkout.tsx
const [paymentMethod, setPaymentMethod] = useState<"banking" | "momo" | "cod">("banking");

options = [
  { value: "banking", label: "📱 QR Ngân Hàng" },
  { value: "momo", label: "💜 MoMo" },
  { value: "cod", label: "📦 COD" }
]
```

### Payment Deadline
```javascript
// backend/models/Order.js
paymentDeadline: {
  type: Date,
  default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
}
```

---

## Testing Checklist

- [ ] Create order with Banking payment → status = "payment_pending"
- [ ] Customer sees "Chờ seller xác nhận" message
- [ ] QR code displays correctly with CRC checksum
- [ ] Seller finds order in "Chờ thanh toán" section
- [ ] Seller clicks confirm button → status = "processing"
- [ ] Customer receives notification of confirmation
- [ ] Order moves to "Chờ xử lý" section
- [ ] COD orders go directly to "pending" (no confirmation needed)
- [ ] MoMo orders show "Chờ seller xác nhận"
- [ ] Socket event emits correctly (order:paymentConfirmed)

---

## Future Enhancements

1. **Auto-confirmation via bank API** - Check bank transfer directly
2. **Batch confirmation** - Confirm multiple orders at once
3. **Timeout handling** - Auto-cancel if payment not confirmed after deadline
4. **Payment proof upload** - Seller can upload proof of payment
5. **Payment dispute resolution** - For cases where payment status is unclear
6. **Seller dashboard widget** - Quick stats on pending confirmations

---

## Files Modified

### Backend
- `backend/models/Order.js` - Added "payment_pending" status
- `backend/controllers/orderController.js` - Added `confirmPayment` endpoint
- `backend/controllers/checkoutController.js` - Set status based on paymentMethod
- `backend/routes/orderRoutes.js` - Added POST confirm-payment route

### Frontend
- `web/src/pages/user/PaymentGateway.tsx` - Display "Chờ seller xác nhận" message
- `web/src/api/cartService.ts` - Updated paymentMethod type to include "banking" & "momo"

---

**Last Updated:** November 15, 2025  
**Status:** Active Implementation
