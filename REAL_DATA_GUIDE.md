# Hướng dẫn Quản lý Dữ liệu Thật - QQ E-commerce

## Tổng quan
Hệ thống quản lý dữ liệu thật cho phép bạn thêm, chỉnh sửa và quản lý dữ liệu thực tế vào database thay vì sử dụng dữ liệu mẫu.

## Truy cập hệ thống
1. Đăng nhập với tài khoản Admin
2. Vào Admin Dashboard
3. Chọn "Quản lý dữ liệu" từ menu
4. Hoặc truy cập trực tiếp: `/admin/data-management`

## Tính năng chính

### 1. Quản lý Sản phẩm
**Form nâng cao với đầy đủ thông tin:**
- **Thông tin cơ bản**: Tên, giá, số lượng, mô tả, hình ảnh
- **Thông số kỹ thuật**: Trọng lượng, kích thước, bảo hành, thông số chi tiết
- **Phân loại**: Danh mục, thương hiệu, SKU, tags, trạng thái

**Import hàng loạt từ CSV:**
```
Tên sản phẩm,Giá,Số lượng,Mô tả,Hình ảnh,Danh mục
iPhone 15 Pro,29990000,50,Điện thoại cao cấp,https://example.com/iphone.jpg,Điện thoại
MacBook Air M2,25990000,25,Laptop siêu mỏng,https://example.com/macbook.jpg,Laptop
```

### 2. Quản lý Người dùng
**Thông tin chi tiết:**
- Tên, email, vai trò
- Phân quyền: User, Seller, Shipper, Admin, System

**Import hàng loạt từ CSV:**
```
Tên,Email,Vai trò
Nguyễn Văn A,nguyenvana@gmail.com,user
Trần Thị B,tranthib@gmail.com,seller
```

### 3. Quản lý Đơn hàng
**Thông tin đầy đủ:**
- ID người dùng, tổng tiền, trạng thái, ngày
- Trạng thái: Pending, Approved, Shipped, Completed, Rejected

**Import hàng loạt từ CSV:**
```
ID Người dùng,Tổng tiền,Trạng thái,Ngày
1,1500000,completed,2024-02-20
2,2500000,pending,2024-02-21
```

## Quy trình thêm dữ liệu thật

### Phương pháp 1: Thêm từng bản ghi
1. Chọn tab tương ứng (Sản phẩm/Người dùng/Đơn hàng)
2. Nhấn "Thêm mới"
3. Điền đầy đủ thông tin trong form
4. Nhấn "Thêm mới" để lưu

### Phương pháp 2: Import hàng loạt
1. Chuẩn bị file CSV theo format mẫu
2. Chọn tab tương ứng
3. Nhấn "Import CSV"
4. Chọn file và xem trước dữ liệu
5. Kiểm tra lỗi và nhấn "Import dữ liệu"

## Validation dữ liệu

### Sản phẩm
- Tên sản phẩm: Bắt buộc
- Giá: Phải > 0
- Số lượng: Phải >= 0
- SKU: Bắt buộc, duy nhất

### Người dùng
- Tên: Bắt buộc
- Email: Bắt buộc, định dạng hợp lệ
- Vai trò: Phải chọn từ danh sách có sẵn

### Đơn hàng
- ID người dùng: Phải tồn tại trong hệ thống
- Tổng tiền: Phải >= 0
- Trạng thái: Phải chọn từ danh sách có sẵn

## Lưu ý quan trọng

### 1. Backup dữ liệu
- Luôn backup database trước khi thêm dữ liệu lớn
- Test trên môi trường development trước

### 2. Kiểm tra dữ liệu
- Xem trước dữ liệu trước khi import
- Kiểm tra các lỗi validation
- Đảm bảo tính nhất quán của dữ liệu

### 3. Hiệu suất
- Import từng batch nhỏ (100-500 bản ghi/lần)
- Tránh import quá nhiều dữ liệu cùng lúc
- Monitor hiệu suất database

## Troubleshooting

### Lỗi thường gặp:
1. **"Email đã tồn tại"**: Kiểm tra email trùng lặp
2. **"SKU đã tồn tại"**: Đảm bảo SKU duy nhất
3. **"ID người dùng không tồn tại"**: Kiểm tra ID trong đơn hàng
4. **"File CSV không đúng format"**: Kiểm tra header và dữ liệu

### Giải pháp:
- Kiểm tra dữ liệu trước khi import
- Sử dụng chức năng xem trước
- Import từng batch nhỏ
- Liên hệ admin nếu cần hỗ trợ

## Kết quả
Sau khi thêm dữ liệu thành công:
- Dữ liệu sẽ xuất hiện ngay trong các dashboard
- Có thể sử dụng các chức năng CRUD
- Dữ liệu được lưu trực tiếp vào MongoDB
- Có thể export/backup dữ liệu
