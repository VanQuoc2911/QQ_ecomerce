# Seller Dashboard Pending Orders - Visual Guide & How-to

## Dashboard Overview

The Seller Dashboard now displays your pending orders prominently with an interactive quick-view section.

```
┌─────────────────────────────────────────────────────────┐
│  📊 Tổng quan cửa hàng (Shop Overview)                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [📦 Số sản phẩm: 25] [📊 Số đơn hàng: 150]           │
│  [💰 Doanh thu: 15,000,000 ₫]                          │
│                                                          │
│  🔥 Sản phẩm bán chạy                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [Image] Product 1 | Đã bán: 45 | Giá: 500k ₫      │ │
│  │ [Image] Product 2 | Đã bán: 32 | Giá: 750k ₫      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ⏳ Đơn chờ xử lý (Pending Orders)           [Xem tất cả] │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Search: [________] [Tìm]                          │ │
│  │ [Tất cả] [Còn hàng] [Hết hàng]                   │ │
│  │                                                    │ │
│  │ 👤 John Doe     #611c1234   500k ₫    [Xem]      │ │
│  │ 👤 Jane Smith   #611c5678   750k ₫    [Xem]      │ │
│  │ 👤 Bob Johnson  #611c9012   300k ₫    [Xem]      │ │
│  │ 👤 Alice Lee    #611c3456   400k ₫    [Xem]      │ │
│  │ 👤 Mary Wilson  #611c7890   600k ₫    [Xem]      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Step-by-Step: View Order Details

### 1. Click "Xem" Button
Click the "Xem" (View) button next to any pending order in the list.

```
┌─ Order List ────────────────────────────────────┐
│ 👤 John Doe     #611c1234   500k ₫    [Xem] ← │
│ 👤 Jane Smith   #611c5678   750k ₫    [Xem]  │
└─────────────────────────────────────────────────┘
```

### 2. Detail Dialog Opens
A modal dialog appears showing full order details:

```
┌─────────────────────────────────────────────┐
│ Chi tiết đơn hàng (Order Details)           │
├─────────────────────────────────────────────┤
│                                             │
│  John Doe                                   │
│  ID: 611c1234567890abcd1                   │
│  📍 123 Test St, Test City                  │
│                                             │
│  Sản phẩm (Products):                       │
│  ┌─────────────────────────────────────┐   │
│  │ [Image] Test Product                │   │
│  │ x1 • 500,000 ₫                      │   │
│  │ Danh mục: Electronics               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Tổng tiền: 500,000 ₫                      │
│  Trạng thái: [PENDING]                      │
│                                             │
├─────────────────────────────────────────────┤
│  [Đóng]  [Hủy đơn]  [✓ Xác nhận]           │
└─────────────────────────────────────────────┘
```

## Quick Actions: Update Order Status

### Option 1: Confirm Order (Process)
Click the green "✓ Xác nhận" (Confirm) button to:
- Change order status to "processing"
- Send confirmation to customer
- Update your pending orders count

```
Before Click:  [PENDING] → After Click:  [PROCESSING]
```

### Option 2: Cancel Order
Click the red "Hủy đơn" (Cancel) button to:
- Change order status to "cancelled"
- Notify customer of cancellation
- Remove from pending orders list

```
Before Click:  [PENDING] → After Click:  [CANCELLED]
```

### Option 3: Close Without Action
Click "Đóng" (Close) to exit the dialog without changing anything.

## Search & Filter Features

### Search by Customer Name or Order ID

```
Search Box: [________]  [Tìm]
            ↓
            Enter customer name (e.g., "John") or order ID (e.g., "611c")
            ↓
            Click "Tìm" button
            ↓
            List refreshes showing only matching orders
```

### Filter by Stock Status

```
[Tất cả] [Còn hàng] [Hết hàng]
   ↓
Click a chip to filter orders
   ↓
List refreshes showing only orders matching that filter
```

**Filter Meanings:**
- **Tất cả (All)**: Show all pending orders
- **Còn hàng (In Stock)**: Show only orders with products in stock
- **Hết hàng (Out of Stock)**: Show only orders with products out of stock

## Loading States

### While Fetching Orders
A spinner appears:
```
⏳ Đơn chờ xử lý (5)
[Xem tất cả]

⟳ (loading spinner)
```

### While Fetching Order Details
A larger spinner appears in the dialog:
```
┌─────────────────────┐
│   Chi tiết đơn      │
├─────────────────────┤
│                     │
│       ⟲ Loading     │
│                     │
└─────────────────────┘
```

## Auto-Refresh on New Orders

When a customer completes a purchase:
1. ✅ Your pending orders list automatically refreshes
2. ✅ Pending orders count updates
3. ✅ New order appears at the top of the list
4. ✅ No manual refresh needed!

```
You (Seller)                    Customer
    ↓                               ↓
Dashboard loaded            Browsing products
    ↓                               ↓
Waiting for orders          Adds to cart
    ↓                               ↓
                           Completes checkout ← Order placed!
    ↓                               ↓
⏳ Auto-refresh          ← Event sent to you
    ↓
📊 New order appears!
```

## Navigation

### "Xem tất cả" (View All) Button
Click this button in the top-right of the Pending Orders section to:
- Navigate to the full Seller Orders page
- View ALL pending orders (not just 5)
- Access advanced search and filters
- See order history and statistics

```
⏳ Đơn chờ xử lý (5) [Xem tất cả] ← Click here
```

## Common Workflows

### Workflow 1: Daily Order Processing

```
1. Open dashboard
   ↓
2. See pending count: "⏳ Đơn chờ xử lý (5)"
   ↓
3. Review quick list for urgent orders
   ↓
4. Click "Xem" on high-priority orders
   ↓
5. Check customer shipping address
   ↓
6. Click "✓ Xác nhận" to process
   ↓
7. Dialog updates to "PROCESSING"
   ↓
8. Pending count decreases: (4)
   ↓
9. Repeat for other orders
```

### Workflow 2: Handle Cancellation Request

```
1. Customer requests order cancellation
   ↓
2. Dashboard pending list shows their order
   ↓
3. Click "Xem" to open order details
   ↓
4. Verify order details and shipping address
   ↓
5. Click red "Hủy đơn" button
   ↓
6. Order status changes to "CANCELLED"
   ↓
7. System notifies customer of cancellation
   ↓
8. Order removed from pending list
```

### Workflow 3: Search for Specific Customer

```
1. Customer calls asking about order status
   ↓
2. Open dashboard
   ↓
3. Type customer name in search box: "John"
   ↓
4. Click "Tìm" button
   ↓
5. List filters to show only John's orders
   ↓
6. Click "Xem" on the correct order
   ↓
7. View full details and current status
   ↓
8. Update status if needed
```

## Tips & Best Practices

### ✅ DO
- **Review orders daily** from the dashboard pending list
- **Check shipping address** before confirming orders
- **Use search** to quickly find specific customer orders
- **Click "Xem tất cả"** to see full order details and history
- **Process orders quickly** to improve customer satisfaction

### ❌ DON'T
- **Ignore the pending count** - update orders regularly
- **Assume stock status** - check product availability before confirming
- **Confirm if unsure** - review details first using "Xem"
- **Forget to close dialog** - click "Đóng" when done

## Stats at a Glance

At the top of your dashboard, you'll see three key metrics:

```
[📦 Số sản phẩm: 25]    [📊 Số đơn hàng: 150]    [💰 Doanh thu: 15M ₫]
  Your inventory         Total orders              Total revenue
```

**Số sản phẩm (Products)**: Total number of products you're selling
**Số đơn hàng (Orders)**: Total number of orders you've received
**Doanh thu (Revenue)**: Total revenue from all completed orders

## Troubleshooting

### Q: Why don't I see the pending orders section?
**A:** 
- Make sure you're logged in as a seller
- Check if you have any pending orders (might show "Không có đơn chờ xử lý")
- Try clicking "Xem tất cả" to refresh the view

### Q: Why is the detail dialog loading?
**A:**
- The system is fetching full order details from the server
- This usually takes 1-2 seconds
- Wait for the spinner to finish loading

### Q: What statuses are available?
**A:**
- **PENDING**: New order awaiting confirmation
- **PROCESSING**: Order is being prepared
- **SHIPPED**: Order has been shipped
- **COMPLETED**: Order delivered and confirmed
- **CANCELLED**: Order was cancelled

### Q: Can I undo a status change?
**A:**
- Yes, open the order again and click another status button
- For example, if you accidentally cancelled an order, reopen it and click "Xác nhận"

## Contact Support

If you encounter any issues:
1. Check that you have a stable internet connection
2. Try refreshing the page (F5)
3. Clear browser cache if needed
4. Contact support with a screenshot of the issue
