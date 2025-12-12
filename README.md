# QLPhongTro - Hệ thống Quản lý Phòng Trọ

Hệ thống quản lý phòng trọ với đầy đủ tính năng: đăng tin, tìm kiếm, đặt phòng, chat, và quản trị.

## 🚀 Công nghệ sử dụng

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO (Real-time chat)
- JWT Authentication
- Multer (File upload)
- Cloudinary (Image hosting - optional)

### Frontend
- React + Vite
- React Router
- Zustand (State management)
- Tailwind CSS
- Axios
- Socket.IO Client
- React Leaflet (Maps)

## 📋 Yêu cầu hệ thống

- Node.js >= 18.x
- MongoDB >= 6.x
- npm hoặc yarn

## 🔧 Cài đặt và Chạy Project

### Bước 1: Clone và cài đặt dependencies

```bash
# Cài đặt dependencies cho backend
cd backend
npm install

# Cài đặt dependencies cho frontend
cd ../frontend
npm install
```

### Bước 2: Cấu hình môi trường

#### Backend (.env)

Tạo file `.env` trong thư mục `backend/` với nội dung:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/qlphongtro

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=1d
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-change-this-in-production
JWT_REFRESH_EXPIRE=7d

# Client URL
CLIENT_URL=http://localhost:5173

# File Upload
MAX_FILE_SIZE=5242880

# Cloudinary (Optional - for image hosting)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email Configuration (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
```

#### Frontend (.env)

Tạo file `.env` trong thư mục `frontend/` với nội dung:

```env
# API URL
VITE_API_URL=http://localhost:5000/api
```

### Bước 3: Khởi động MongoDB

Đảm bảo MongoDB đang chạy trên máy của bạn:

```bash
# Windows (nếu đã cài đặt MongoDB như service)
# MongoDB sẽ tự động chạy

# Hoặc chạy thủ công
mongod
```

Nếu chưa có MongoDB, bạn có thể:
- Cài đặt MongoDB Community Edition
- Hoặc sử dụng MongoDB Atlas (cloud) và cập nhật `MONGODB_URI` trong file `.env`

### Bước 4: Seed dữ liệu (Tùy chọn)

Chạy script seed để tạo dữ liệu mẫu:

```bash
cd backend
npm run seed
```

### Bước 5: Chạy Backend

```bash
cd backend

# Development mode (với nodemon - tự động restart)
npm run dev

# Hoặc production mode
npm start
```

Backend sẽ chạy tại: `http://localhost:5000`

### Bước 6: Chạy Frontend

Mở terminal mới:

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

## 📁 Cấu trúc Project

```
QLPhongTro/
├── backend/
│   ├── src/
│   │   ├── config/          # Cấu hình database
│   │   ├── controllers/     # Logic xử lý request
│   │   ├── middleware/      # Middleware (auth, upload, validation)
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   ├── seeds/           # Dữ liệu mẫu
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utilities
│   │   └── server.js        # Entry point
│   ├── uploads/             # Thư mục lưu file upload
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # API clients
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand stores
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilities
│   │   └── main.jsx         # Entry point
│   └── package.json
└── README.md
```

## 🔑 Các tính năng chính

- ✅ Đăng ký/Đăng nhập với JWT
- ✅ Quản lý phòng trọ (CRUD)
- ✅ Tìm kiếm và lọc phòng trọ
- ✅ Yêu thích phòng trọ
- ✅ Đặt phòng
- ✅ Chat real-time
- ✅ Quản trị viên
- ✅ Upload ảnh
- ✅ Dark mode

## 🛠️ Scripts có sẵn

### Backend
- `npm start` - Chạy server production
- `npm run dev` - Chạy server development (với nodemon)
- `npm run seed` - Seed dữ liệu mẫu

### Frontend
- `npm run dev` - Chạy development server
- `npm run build` - Build production
- `npm run preview` - Preview production build

## 🔒 Bảo mật

- JWT Authentication với refresh token
- Password hashing với bcrypt
- Rate limiting
- Helmet.js cho security headers
- MongoDB injection protection
- CORS configuration

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Lấy thông tin user hiện tại
- `PUT /api/auth/profile` - Cập nhật profile
- `PUT /api/auth/password` - Đổi mật khẩu

### Listings
- `GET /api/listings` - Lấy danh sách phòng trọ
- `GET /api/listings/:id` - Lấy chi tiết phòng trọ
- `POST /api/listings` - Tạo phòng trọ mới
- `PUT /api/listings/:id` - Cập nhật phòng trọ
- `DELETE /api/listings/:id` - Xóa phòng trọ

### Favorites
- `GET /api/favorites` - Lấy danh sách yêu thích
- `POST /api/favorites` - Thêm vào yêu thích
- `DELETE /api/favorites/:id` - Xóa khỏi yêu thích

### Bookings
- `GET /api/bookings` - Lấy danh sách đặt phòng
- `POST /api/bookings` - Tạo đặt phòng mới
- `PUT /api/bookings/:id` - Cập nhật đặt phòng
- `DELETE /api/bookings/:id` - Hủy đặt phòng

### Chat
- `GET /api/chat/conversations` - Lấy danh sách cuộc trò chuyện
- `GET /api/chat/messages/:conversationId` - Lấy tin nhắn
- `POST /api/chat/messages` - Gửi tin nhắn

### Admin
- `GET /api/admin/users` - Quản lý users
- `GET /api/admin/listings` - Quản lý listings
- `GET /api/admin/stats` - Thống kê

## 🐛 Xử lý lỗi thường gặp

### Lỗi kết nối MongoDB
- Đảm bảo MongoDB đang chạy
- Kiểm tra `MONGODB_URI` trong file `.env`
- Kiểm tra firewall/network

### Lỗi CORS
- Kiểm tra `CLIENT_URL` trong backend `.env`
- Đảm bảo frontend đang chạy đúng port

### Lỗi JWT
- Kiểm tra `JWT_SECRET` và `JWT_REFRESH_SECRET` đã được set
- Đảm bảo token chưa hết hạn

### Lỗi upload file
- Kiểm tra thư mục `backend/uploads` đã tồn tại
- Kiểm tra quyền ghi file
- Kiểm tra `MAX_FILE_SIZE` trong `.env`

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Tất cả dependencies đã được cài đặt
2. File `.env` đã được tạo và cấu hình đúng
3. MongoDB đang chạy
4. Port 5000 và 5173 chưa bị chiếm dụng

## 📄 License

MIT

