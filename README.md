# 🎯 Career UTEHY NCKH Crawl

Hệ thống thu thập và quản lý thông tin tuyển dụng từ các website việc làm hàng đầu Việt Nam. Được xây dựng với Node.js, TypeScript và kiến trúc MVC chuyên nghiệp.

## 🚀 Tính năng chính

- **Multi-source Crawling**: Hỗ trợ crawl dữ liệu từ nhiều nền tảng lớn (JobsGo, VietnamWorks, TopCV).
- **Intelligent Parsing**: Tự động phân tích và trích xuất thông tin công việc, công ty, mức lương và kỹ năng.
- **RESTful API**: API tiêu chuẩn cho việc điều hướng tiến trình crawl và tra cứu dữ liệu.
- **Data Management**: Lưu trữ dữ liệu linh hoạt, kiến trúc chuẩn hóa sẵn sàng cho việc tích hợp AI/ML (Vector Embeddings).

## 🛠️ Cài đặt & Sử dụng

1. **Clone repository:**

   ```bash
   git clone https://github.com/nguyenvanhieu1710/career_utehy_nckh_crawl.git
   cd career_utehy_nckh_crawl
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:

   ```env
   PORT=3000
   MONGODB_URI=
   ```

4. **Build the project:**

   ```bash
   npm run build
   ```

5. **Start the server:**

   ```bash
   npm start
   ```

   Or run in **development mode** with auto-reload:

   ```bash
   npm run dev
   ```

## 📡 API Documentation

**Các endpoint chính:**

- `GET /api/health`: Health check server
- `GET /api/jobs`: Tra cứu danh sách việc làm (tìm kiếm, phân trang)
- `POST /api/crawl/jobgo`: Trigger tiến trình crawl dữ liệu từ JobsGo
- `POST /api/crawl/vietnamworks`: Trigger tiến trình crawl dữ liệu từ VietnamWorks
- `POST /api/crawl/topcv`: Trigger tiến trình crawl dữ liệu từ TopCV
- `POST /api/crawl/all`: Crawl từ tất cả các nguồn cùng lúc

## 📁 Cấu trúc thư mục (MVC)

```text
career_utehy_nckh_crawl/
├── package.json
├── API crawl careers.postman_collection.json
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # Entry point
│   ├── config/                # Cấu hình Database, ...
│   ├── controllers/           # HTTP Request handlers
│   ├── services/              # Business logic (Crawl, Save DB, ...)
│   ├── crawlers/              # Logic cào dữ liệu cho từng nguồn riêng biệt
│   ├── models/                # Database Schemas (Mongoose/TypeORM)
│   ├── routes/                # Khai báo các API Endpoints
│   └── interfaces/            # TypeScript Type & Interface definitions
```

## 📝 CLI Scripts

| Lệnh            | Giải thích                                      |
| --------------- | ----------------------------------------------- |
| `npm run dev`   | Chạy môi trường development có hot-reload (tsx) |
| `npm run build` | Biên dịch TypeScript sang JavaScript            |
| `npm start`     | Chạy server từ production build (`dist/`)       |
