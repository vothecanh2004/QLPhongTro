# 🚀 Hướng Dẫn Chạy Project QLPhongTro

## Bước 1: Cài đặt Dependencies

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Bước 2: Cấu hình MongoDB

### Cách 1: Sử dụng Docker (Khuyến nghị)

```bash
# Chạy MongoDB bằng Docker
docker-compose up -d

# Kiểm tra MongoDB đã chạy
docker ps
```

### Cách 2: Cài đặt MongoDB Local

- Tải và cài đặt MongoDB từ: https://www.mongodb.com/try/download/community
- Hoặc sử dụng MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

## Bước 3: Tạo File .env

### Backend (.env)

Tạo file `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/qlphongtro
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=1d
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE=5242880
```

### Frontend (.env)

Tạo file `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Bước 4: Seed Dữ liệu (Tùy chọn)

```bash
cd backend
npm run seed
```

Lệnh này sẽ tạo:
- User admin: `admin@rental.com` / `admin123`
- User thường: `user@rental.com` / `user123`
- Một số phòng trọ mẫu

## Bước 5: Chạy Backend

Mở terminal 1:

```bash
cd backend
npm run dev
```

Backend sẽ chạy tại: **http://localhost:5000**

## Bước 6: Chạy Frontend

Mở terminal 2:

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

## ✅ Kiểm tra

1. Mở trình duyệt: http://localhost:5173
2. Đăng ký tài khoản mới hoặc đăng nhập với:
   - Email: `admin@rental.com`
   - Password: `admin123`

## 🐛 Xử lý lỗi thường gặp

### Lỗi: "Cannot connect to MongoDB"
- Kiểm tra MongoDB đang chạy: `docker ps` hoặc kiểm tra service MongoDB
- Kiểm tra `MONGODB_URI` trong file `.env`
- Nếu dùng Docker: `docker-compose up -d`

### Lỗi: "Port already in use"
- Đổi PORT trong file `.env` (backend)
- Hoặc dừng process đang dùng port đó

### Lỗi: "Module not found"
- Chạy lại `npm install` trong thư mục tương ứng
- Xóa `node_modules` và `package-lock.json`, sau đó `npm install` lại

### Lỗi: "Cannot find module 'postcss'"
- Đã tạo file `frontend/postcss.config.js`
- Chạy `npm install` trong thư mục frontend

## 📝 Lưu ý

- Đảm bảo MongoDB đang chạy trước khi start backend
- File `.env` phải được tạo đúng định dạng (không có dấu ngoặc kép thừa)
- Nếu thay đổi PORT, nhớ cập nhật `CLIENT_URL` và `VITE_API_URL` tương ứng

## 🎉 Hoàn thành!

Bây giờ bạn có thể:
- Đăng ký/Đăng nhập
- Xem danh sách phòng trọ
- Tìm kiếm và lọc phòng trọ
- Thêm vào yêu thích
- Đặt phòng
- Chat với chủ nhà

Chúc bạn code vui vẻ! 🚀

