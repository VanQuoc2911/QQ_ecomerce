# 📊 Hướng Dẫn Sử Dụng Seller Stats & Order Management

## 🎯 Tổng Quan
Dashboard Seller cho phép bạn:
- ✅ Xem thống kê đơn hàng và doanh thu
- ✅ Quản lý danh sách đơn hàng
- ✅ Cập nhật trạng thái đơn hàng trực tiếp
- ✅ Tìm kiếm và lọc đơn hàng

---

## 📍 Vị Trí
Truy cập từ menu Seller → **Đơn hàng của shop**

---

## 📊 Phần Thống Kê (Stats Cards)

### 6 Card Hiển Thị:

#### 1️⃣ **Tổng Sản Phẩm**
- Số lượng sản phẩm bạn đang bán
- Nền: Xám nhạt

#### 2️⃣ **Số Đơn Hàng**
- Tổng số đơn hàng (tất cả trạng thái)
- Dòng phụ: Số đơn hoàn thành vs chờ xử lý
- Nền: Xám nhạt

#### 3️⃣ **Doanh Thu (30 Ngày)**
- **Chỉ tính từ đơn hoàn thành**
- Của 30 ngày gần nhất
- Màu đỏ (nổi bật)
- Nền: Cam nhạt

#### 4️⃣ **Doanh Thu (Tất Cả)**
- Tổng doanh thu từ tất cả đơn hoàn thành
- Màu xanh lá
- Nền: Xanh nhạt

#### 5️⃣ **Đơn Hoàn Thành**
- Số lượng đơn đã giao thành công
- Màu cam đậm
- Nền: Vàng nhạt

#### 6️⃣ **Đơn Chờ Xử Lý**
- Số lượng đơn chưa hoàn thành
- Màu đỏ đậm
- Nền: Đỏ nhạt

---

## 🔍 Tìm Kiếm & Lọc

### Tìm Kiếm (Search Bar)
```
📝 Tìm kiếm mã đơn hoặc khách hàng
```
- Nhập **mã đơn hàng** hoặc **tên khách hàng**
- Bấm **Enter** để tìm
- Danh sách tự động cập nhật

### Lọc theo Trạng Thái
Bấm vào các Chip filter:
- **Tất cả**: Hiển thị tất cả đơn hàng
- **Chờ xử lý**: Chỉ đơn chưa hoàn thành
- **Hoàn thành**: Chỉ đơn đã giao thành công
- **Hủy**: Chỉ đơn đã hủy

---

## 📋 Danh Sách Đơn Hàng

### Bảng Hiển Thị:

| Cột | Ý Nghĩa |
|-----|---------|
| **Mã đơn** | ID đơn hàng (8 ký tự đầu) |
| **Khách hàng** | Tên người mua |
| **Sản phẩm** | Số lượng sản phẩm trong đơn |
| **Thành tiền** | Tổng giá trị đơn (VNĐ) |
| **Trạng thái** | Pending/Completed/Cancelled (Chip màu) |
| **Ngày tạo** | Ngày đặt hàng (định dạng VN) |
| **Hành động** | Nút "Xem" chi tiết |

### Phân Trang
- Mặc định: **10 đơn hàng/trang**
- Dùng nút "< >" hoặc chọn trang để chuyển

---

## 🔎 Chi Tiết Đơn Hàng (Dialog)

Bấm nút **"Xem"** để mở dialog chi tiết:

### Thông Tin Khách Hàng
```
👤 Tên: [Tên khách hàng]
📱 Số điện thoại: [Số phone]
📍 Địa chỉ: [Tỉnh/Thành phố, Quận/Huyện, Phường/Xã, Chi tiết]
```

### Danh Sách Sản Phẩm
Hiển thị từng sản phẩm:
- 📷 **Hình ảnh** (thumbnail)
- **Tên sản phẩm**
- **Đơn giá**: [Giá] ₫
- **Số lượng**: [x] cái
- **Thành tiền**: [Giá × Số lượng] ₫

### Tóm Tắt Giá
```
Tiền hàng:       [Tổng giá gốc] ₫
─────────────────────────────
Tổng thanh toán: [Tổng] ₫
```

### Trạng Thái & Hành Động
```
Trạng thái: [Chip màu: Pending/Completed/Hủy]
```

---

## ✏️ Cập Nhật Trạng Thái

### Các Button Cập Nhật

Ở dưới cùng của dialog, bạn sẽ thấy 3 button:

#### **"Chờ xử lý"** (Màu vàng/warning)
- Chuyển đơn về trạng thái chờ xử lý
- Ẩn nếu đơn đã là trạng thái chờ xử lý

#### **"Hoàn thành"** (Màu xanh/success)
- Đánh dấu đơn hàng đã giao thành công
- ⚠️ Doanh thu sẽ được tính khi đơn ở trạng thái này
- Ẩn nếu đơn đã hoàn thành

#### **"Hủy"** (Màu đỏ/error)
- Hủy đơn hàng
- ⚠️ Không thể hoàn tác
- Ẩn nếu đơn đã hủy

### Cách Sử Dụng
1. Bấm vào nút trạng thái cần cập nhật
2. Chờ request được gửi (2-3 giây)
3. Dialog tự động cập nhật trạng thái
4. Danh sách đơn hàng cũng tự động refresh
5. Stats cards cũng được cập nhật

---

## ⚡ Hành Động Tự Động

### Khi Có Đơn Hàng Mới
- ✅ Stats cards tự động cập nhật
- ✅ Danh sách đơn hàng tự động refresh (không cần F5)
- ✅ Số "Đơn chờ xử lý" tăng lên

### Khi Cập Nhật Trạng Thái
- ✅ Dialog hiển thị trạng thái mới ngay lập tức
- ✅ Bảng danh sách cập nhật
- ✅ Stats cards cập nhật (ví dụ: +1 đơn hoàn thành)

---

## 💡 Mẹo & Hưỡng Dẫn

### Tối Ưu Quản Lý Đơn Hàng

**Quy Trình Khuyến Nghị:**
1. Khi nhận đơn → Bấy Chờ xử lý (nếu cần thời gian xử lý)
2. Sau khi xác nhận → Bấy Hoàn thành
3. Nếu không thể giao → Bấy Hủy

**Lợi Ích Đúng Trạng Thái:**
- ✅ Doanh thu được tính chính xác (chỉ đơn hoàn thành)
- ✅ Khách hàng được thông báo (socket event)
- ✅ Dashboard stats chính xác

### Sử Dụng Tìm Kiếm Hiệu Quả
- Tìm theo **mã đơn hàng** (8 ký tự)
- Tìm theo **tên khách hàng** (bất kỳ phần nào của tên)
- Kết hợp với filter trạng thái

### Theo Dõi Doanh Thu
- 📊 **Card "Doanh Thu (30 ngày)"** = Revenue hiện tại
- 💰 **Card "Doanh Thu (Tất Cả)"** = Revenue tích lũy
- ⚠️ Chỉ tính đơn **hoàn thành** (status = "completed")

---

## ❌ Vấn Đề Thường Gặp

### ❓ Stats không cập nhật?
- **Giải pháp**: Refresh trang (F5)
- Stats tự động cập nhật khi:
  - Có đơn hàng mới
  - Cập nhật trạng thái đơn hàng

### ❓ Không thấy button cập nhật trạng thái?
- **Nguyên nhân**: Đơn hàng đã có trạng thái đó
- **Giải pháp**: Chọn trạng thái khác hoặc bấm nút "Đóng"

### ❓ Doanh thu không khớp?
- **Lưu ý**: Chỉ đơn **hoàn thành** được tính vào doanh thu
- Đơn "chờ xử lý" hoặc "hủy" không tính

### ❓ Tìm kiếm không work?
- Nhấn **Enter** sau khi nhập
- Hoặc dùng **filter trạng thái** để lọc nhanh

---

## 🎨 Màu Sắc Trạng Thái

| Trạng Thái | Màu | Ý Nghĩa |
|-----------|-----|---------|
| **Chờ xử lý** | 🟡 Vàng | Cần xử lý tiếp |
| **Hoàn thành** | 🟢 Xanh | Đơn đã giao thành công |
| **Hủy** | 🔴 Đỏ | Đơn đã hủy |

---

## 📞 Liên Hệ & Hỗ Trợ

Nếu gặp vấn đề kỹ thuật:
- 📧 Email: support@qq-ecommerce.com
- 💬 Chat: [Trực tiếp từ app]
- 🐛 Report bug: Vào Admin → Báo cáo

---

**Cập nhật**: November 13, 2025

**Phiên bản**: 1.0

✅ **Chúc bạn sử dụng thành công!**
