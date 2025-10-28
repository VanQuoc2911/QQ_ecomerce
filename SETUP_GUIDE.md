# 🚀 Hướng dẫn Setup QQ E-commerce

## 📋 Yêu cầu hệ thống

- Node.js (v16 trở lên)
- MongoDB (local hoặc MongoDB Atlas)
- npm hoặc yarn

## 🛠️ Cài đặt Backend

### 1. Cài đặt dependencies
```bash
cd backend
npm install
```

### 2. Cấu hình MongoDB

#### Option A: MongoDB Local
1. Cài đặt MongoDB trên máy local
2. Khởi động MongoDB service
3. Tạo file `.env` trong thư mục `backend`:
```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/qq_ecommerce
```

#### Option B: MongoDB Atlas (Recommended)
1. Tạo tài khoản tại [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Tạo cluster mới
3. Lấy connection string
4. Tạo file `.env` trong thư mục `backend`:
```env
PORT=4000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/qq_ecommerce
```

### 3. Seed dữ liệu mẫu
```bash
cd backend
node seed.js
```

### 4. Khởi động backend
```bash
cd backend
npm run dev
# hoặc
node start-server.js
```

Backend sẽ chạy tại: `http://localhost:4000`

## 🎨 Cài đặt Frontend

### 1. Cài đặt dependencies
```bash
cd web
npm install
```

### 2. Khởi động frontend
```bash
cd web
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

## 🔧 Troubleshooting

### Lỗi: ERR_CONNECTION_REFUSED
- Đảm bảo backend đang chạy trên port 4000
- Kiểm tra MongoDB connection
- Xem console log của backend để debug

### Lỗi: MongoDB connection failed
- Kiểm tra MongoDB service có đang chạy không
- Kiểm tra connection string trong .env
- Đảm bảo network access được cấu hình đúng (nếu dùng Atlas)

### Lỗi: Cannot find module
- Chạy `npm install` trong cả backend và frontend
- Xóa `node_modules` và `package-lock.json`, sau đó `npm install` lại

## 📊 Kiểm tra API

### Health Check
```bash
curl http://localhost:4000/health
```

### Test API endpoints
```bash
# Lấy danh sách sản phẩm
curl http://localhost:4000/api/products

# Lấy danh sách users
curl http://localhost:4000/api/users

# Lấy danh sách orders
curl http://localhost:4000/api/orders
```

## 🧪 Test trong Frontend

1. Mở `http://localhost:5173`
2. Thêm component `<ApiTester />` vào bất kỳ trang nào
3. Click "Test API Connection" để kiểm tra
4. Click "Create Sample Data" để tạo dữ liệu mẫu

## 📁 Cấu trúc dự án

```
QQ_ecomerce/
├── backend/                 # Backend API
│   ├── data/               # Dữ liệu mẫu (JSON)
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── utils/              # Utilities
│   ├── server.js           # Main server file
│   ├── seed.js             # Seed script
│   └── start-server.js     # Alternative start script
├── web/                    # Frontend React app
│   ├── src/
│   │   ├── api/            # API services
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   └── API_INTEGRATION.md  # API documentation
└── SETUP_GUIDE.md          # This file
```

## 🎯 Next Steps

1. ✅ Backend API đã sẵn sàng
2. ✅ Frontend đã kết nối API
3. 🔄 Có thể thêm authentication
4. 🔄 Có thể thêm real-time features
5. 🔄 Có thể deploy lên cloud

## 📞 Support

Nếu gặp vấn đề, hãy kiểm tra:
1. Console logs của backend và frontend
2. Network tab trong browser DevTools
3. MongoDB connection status
4. Port conflicts (4000, 5173)
