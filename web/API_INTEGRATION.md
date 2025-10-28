# Hướng dẫn kết nối API Backend

## Tổng quan

Dự án đã được cập nhật để kết nối với backend API thay vì sử dụng dữ liệu tĩnh. Tất cả các API calls đều được quản lý thông qua các service functions và custom hooks.

## Cấu trúc API

### Base URL
- Backend API chạy tại: `http://localhost:4000`
- Có thể cấu hình thông qua biến môi trường `VITE_API_BASE`

### Endpoints chính

#### Products API (`/api/products`)
- `GET /api/products` - Lấy danh sách sản phẩm (có phân trang và tìm kiếm)
- `GET /api/products/:id` - Lấy chi tiết sản phẩm
- `POST /api/products` - Tạo sản phẩm mới
- `PUT /api/products/:id` - Cập nhật sản phẩm
- `DELETE /api/products/:id` - Xóa sản phẩm

#### Users API (`/api/users`)
- `GET /api/users` - Lấy danh sách người dùng (có phân trang và tìm kiếm)
- `GET /api/users/:id` - Lấy chi tiết người dùng
- `POST /api/users` - Tạo người dùng mới
- `PUT /api/users/:id` - Cập nhật người dùng
- `DELETE /api/users/:id` - Xóa người dùng

#### Orders API (`/api/orders`)
- `GET /api/orders` - Lấy danh sách đơn hàng (có phân trang)
- `GET /api/orders/:id` - Lấy chi tiết đơn hàng
- `POST /api/orders` - Tạo đơn hàng mới
- `PUT /api/orders/:id` - Cập nhật đơn hàng
- `DELETE /api/orders/:id` - Xóa đơn hàng

## Cấu trúc Code

### 1. API Services (`src/api/`)
- `axios.ts` - Cấu hình axios instance
- `productService.ts` - Service functions cho Products
- `userService.ts` - Service functions cho Users
- `orderService.ts` - Service functions cho Orders

### 2. Custom Hooks (`src/hooks/`)
- `useApi.ts` - Hook để quản lý API calls với loading và error states

### 3. Types (`src/types/`)
- `Product.ts` - Interface cho Product từ backend
- `User.ts` - Interface cho User từ backend
- `Order.ts` - Interface cho Order từ backend
- `ProductCard.ts` - Interface cho ProductCard component

## Cách sử dụng

### 1. Sử dụng API Service

```typescript
import { productService } from '../api/productService';

// Lấy danh sách sản phẩm
const products = await productService.getProducts({ page: 1, limit: 10 });

// Lấy chi tiết sản phẩm
const product = await productService.getProductById(1);

// Tạo sản phẩm mới
const newProduct = await productService.createProduct({
  title: "Sản phẩm mới",
  price: 100000,
  image: "https://example.com/image.jpg",
  description: "Mô tả sản phẩm",
  stock: 10
});
```

### 2. Sử dụng Custom Hook

```typescript
import { useApi } from '../hooks/useApi';
import { productService } from '../api/productService';

function ProductList() {
  const { data, loading, error, refetch } = useApi(
    () => productService.getProducts({ page: 1, limit: 20 }),
    []
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data?.data.map(product => (
        <div key={product.id}>{product.title}</div>
      ))}
    </div>
  );
}
```

### 3. Sử dụng Mutation Hook

```typescript
import { useApiMutation } from '../hooks/useApi';
import { productService } from '../api/productService';

function CreateProduct() {
  const { mutate, loading, error } = useApiMutation();

  const handleSubmit = async (formData) => {
    try {
      await mutate(productService.createProduct, formData);
      // Thành công
    } catch (error) {
      // Xử lý lỗi
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Đang tạo...' : 'Tạo sản phẩm'}
      </button>
    </form>
  );
}
```

## Error Handling

Tất cả API calls đều có error handling tự động:
- Loading states được quản lý tự động
- Error messages được hiển thị cho người dùng
- Retry functionality có thể được thêm vào

## Cách chạy

### 1. Chạy Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Chạy Frontend
```bash
cd web
npm install
npm run dev
```

## Lưu ý

1. Đảm bảo backend đang chạy trước khi start frontend
2. Cấu hình CORS đã được thiết lập trong backend
3. Tất cả API responses đều có cấu trúc nhất quán
4. Pagination được hỗ trợ cho tất cả list endpoints
5. Search functionality có sẵn cho products và users
