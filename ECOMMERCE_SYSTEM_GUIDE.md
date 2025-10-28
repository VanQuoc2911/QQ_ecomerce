# Hướng dẫn Hệ thống E-commerce QQ - Quy trình hoàn chỉnh

## 🎯 Tổng quan hệ thống

Hệ thống QQ E-commerce được thiết kế với quy trình hoàn chỉnh từ seller đăng sản phẩm → admin duyệt → người mua mua hàng → shipper giao hàng.

## 👥 Các vai trò trong hệ thống

### 1. **Seller (Người bán)**
- Đăng sản phẩm lên hệ thống
- Quản lý sản phẩm của mình
- Xem đơn hàng liên quan đến sản phẩm

### 2. **Admin (Quản trị viên)**
- Duyệt sản phẩm từ seller
- Quản lý toàn bộ hệ thống
- Xem báo cáo và thống kê

### 3. **User (Người mua)**
- Xem sản phẩm đã được duyệt
- Thêm vào giỏ hàng
- Đặt hàng và thanh toán
- Theo dõi đơn hàng

### 4. **Shipper (Người giao hàng)**
- Nhận đơn hàng được giao
- Cập nhật trạng thái giao hàng
- Theo dõi vị trí giao hàng

## 🔄 Quy trình hoạt động

### **Bước 1: Seller đăng sản phẩm**
1. Seller đăng nhập vào hệ thống
2. Vào "Quản lý sản phẩm"
3. Nhấn "Thêm sản phẩm"
4. Điền đầy đủ thông tin:
   - Thông tin cơ bản: tên, giá, số lượng, mô tả
   - Thông số kỹ thuật: trọng lượng, kích thước, bảo hành
   - Phân loại: danh mục, thương hiệu, SKU, tags
5. Sản phẩm được lưu với trạng thái **"pending"** (chờ duyệt)

### **Bước 2: Admin duyệt sản phẩm**
1. Admin đăng nhập vào hệ thống
2. Vào "Duyệt sản phẩm"
3. Xem danh sách sản phẩm chờ duyệt
4. Kiểm tra chi tiết sản phẩm:
   - Thông tin sản phẩm
   - Hình ảnh
   - Thông số kỹ thuật
   - Giá cả hợp lý
5. Quyết định:
   - **Duyệt**: Sản phẩm chuyển sang trạng thái **"approved"**
   - **Từ chối**: Nhập lý do từ chối, sản phẩm chuyển sang **"rejected"**

### **Bước 3: Hiển thị cho người mua**
- Chỉ sản phẩm có trạng thái **"approved"** mới hiển thị trên trang chủ
- Người mua có thể:
  - Xem danh sách sản phẩm
  - Xem chi tiết sản phẩm
  - Thêm vào giỏ hàng

### **Bước 4: Mua hàng và thanh toán**
1. Người mua thêm sản phẩm vào giỏ hàng
2. Nhấn "Thanh toán"
3. Điền thông tin giao hàng:
   - Họ tên, số điện thoại
   - Địa chỉ chi tiết (thành phố, quận/huyện, phường/xã)
   - Ghi chú giao hàng
4. Chọn phương thức thanh toán:
   - **COD**: Thanh toán khi nhận hàng
   - **MoMo**: Thanh toán qua ví MoMo
   - **Banking**: Chuyển khoản ngân hàng
   - **Credit Card**: Thẻ tín dụng
5. Xác nhận đơn hàng

### **Bước 5: Xử lý đơn hàng**
1. Đơn hàng được tạo với trạng thái **"pending"**
2. Admin/System xác nhận đơn hàng → **"confirmed"**
3. Chuẩn bị hàng → **"preparing"**
4. Giao cho shipper → **"shipped"**

### **Bước 6: Shipper giao hàng**
1. Shipper nhận đơn hàng được giao
2. Cập nhật trạng thái theo quy trình:
   - **Đã đến điểm lấy hàng**
   - **Đã lấy hàng**
   - **Đang giao hàng**
   - **Đã đến điểm nhận**
   - **Đã giao hàng thành công** → **"delivered"**

### **Bước 7: Theo dõi đơn hàng**
- **Người mua**: Xem tiến trình giao hàng, vị trí shipper
- **Shipper**: Cập nhật trạng thái, vị trí hiện tại
- **Admin**: Quản lý toàn bộ đơn hàng

## 🛠️ Tính năng chính

### **Cho Seller:**
- ✅ Đăng sản phẩm với form nâng cao
- ✅ Quản lý sản phẩm của mình
- ✅ Xem trạng thái duyệt
- ✅ Import sản phẩm hàng loạt từ CSV

### **Cho Admin:**
- ✅ Duyệt/từ chối sản phẩm từ seller
- ✅ Quản lý toàn bộ hệ thống
- ✅ Xem báo cáo và thống kê
- ✅ Quản lý đơn hàng và shipper

### **Cho User:**
- ✅ Xem sản phẩm đã duyệt
- ✅ Thêm vào giỏ hàng
- ✅ Thanh toán với nhiều phương thức
- ✅ Theo dõi đơn hàng real-time

### **Cho Shipper:**
- ✅ Nhận đơn hàng được giao
- ✅ Cập nhật trạng thái giao hàng
- ✅ Theo dõi vị trí (tích hợp map)
- ✅ Ghi chú quá trình giao hàng

## 📱 Giao diện người dùng

### **Trang chủ (Home)**
- Hiển thị sản phẩm nổi bật (chỉ sản phẩm đã duyệt)
- Tìm kiếm và lọc sản phẩm
- Thêm vào giỏ hàng

### **Giỏ hàng (Cart)**
- Xem sản phẩm đã thêm
- Cập nhật số lượng
- Xóa sản phẩm
- Tính tổng tiền

### **Thanh toán (Checkout)**
- Form thông tin giao hàng
- Chọn phương thức thanh toán
- Xác nhận đơn hàng

### **Theo dõi đơn hàng (Order Tracking)**
- Stepper hiển thị trạng thái
- Lịch sử cập nhật
- Thông tin shipper
- Bản đồ vị trí (placeholder)

## 🔧 Cài đặt và sử dụng

### **1. Khởi động hệ thống:**
```bash
# Backend
cd backend
npm install
npm start

# Frontend
cd web
npm install
npm run dev
```

### **2. Truy cập các vai trò:**
- **Admin**: `/admin/admin-dashboard`
- **Seller**: `/seller/seller-dashboard`
- **User**: `/` (trang chủ)
- **Shipper**: `/shipper/shipper-dashboard`

### **3. Test quy trình:**
1. Đăng nhập với tài khoản Seller
2. Thêm sản phẩm mới
3. Đăng nhập với tài khoản Admin
4. Duyệt sản phẩm
5. Đăng nhập với tài khoản User
6. Mua hàng và theo dõi đơn hàng

## 🎉 Kết quả

Hệ thống hoàn chỉnh với:
- ✅ Quy trình từ A-Z
- ✅ Phân quyền rõ ràng
- ✅ Giao diện thân thiện
- ✅ Theo dõi real-time
- ✅ Nhiều phương thức thanh toán
- ✅ Hệ thống duyệt sản phẩm
- ✅ Tracking giao hàng

Bây giờ bạn có một hệ thống e-commerce hoàn chỉnh với đầy đủ tính năng từ seller đăng sản phẩm đến shipper giao hàng!
