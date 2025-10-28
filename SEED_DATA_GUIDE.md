# Hướng dẫn Seed Database - QQ E-commerce

## Tổng quan
Script này sẽ thêm dữ liệu mẫu vào database MongoDB cho ứng dụng QQ E-commerce.

## Dữ liệu sẽ được thêm:
- **15 sản phẩm** (TV, Loa, Tai nghe, Điện thoại, Laptop, Gaming gear, v.v.)
- **15 người dùng** (với các role: user, seller, shipper, admin, system)
- **20 đơn hàng** (với các trạng thái khác nhau)
- **14 danh mục** sản phẩm
- **10 thông báo** hệ thống
- **12 bản ghi analytics** (doanh thu theo tháng)

## Cách chạy:

### Phương pháp 1: Sử dụng script batch (Windows)
```bash
# Chạy file batch
seed-database.bat
```

### Phương pháp 2: Sử dụng script shell (Linux/Mac)
```bash
# Cấp quyền thực thi
chmod +x seed-database.sh

# Chạy script
./seed-database.sh
```

### Phương pháp 3: Chạy trực tiếp
```bash
# Di chuyển vào thư mục backend
cd backend

# Chạy script seed
node seed-data.js
```

## Yêu cầu:
1. **MongoDB** phải đang chạy trên máy
2. **Node.js** đã được cài đặt
3. Các dependencies đã được cài đặt (`npm install`)

## Kết nối Database:
- Mặc định: `mongodb://localhost:27017/qq_ecommerce`
- Có thể thay đổi bằng biến môi trường `MONGO_URI`

## Sau khi chạy thành công:
- Database sẽ được xóa sạch và thêm dữ liệu mới
- Bạn sẽ thấy thông báo số lượng bản ghi đã import
- Có thể sử dụng các chức năng CRUD trong ứng dụng

## Troubleshooting:
- **Lỗi kết nối MongoDB**: Đảm bảo MongoDB đang chạy
- **Lỗi module**: Chạy `npm install` trong thư mục backend
- **Lỗi quyền**: Đảm bảo có quyền ghi vào database

## Kiểm tra dữ liệu:
Sau khi seed thành công, bạn có thể:
1. Khởi động backend server
2. Khởi động frontend
3. Đăng nhập và kiểm tra các dashboard
4. Test các chức năng CRUD (thêm/sửa/xóa)
