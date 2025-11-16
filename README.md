# 🎯 Crawl Careers Project

Hệ thống thu thập và quản lý thông tin tuyển dụng từ các website việc làm hàng đầu Việt Nam. Được xây dựng với Node.js, TypeScript và kiến trúc MVC chuyên nghiệp.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.19-brightgreen)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-5.1-lightgrey)](https://expressjs.com/)

## 🚀 Tính năng chính

### 🕷️ Thu thập dữ liệu tự động
- **Multi-source Crawling**: Hỗ trợ crawl từ nhiều nguồn (TopCV, JobsGo)
- **Intelligent Parsing**: Tự động phân tích và trích xuất thông tin công việc, công ty
- **Salary Extraction**: Phân tích mức lương từ text tiếng Việt
- **Skills Detection**: Tự động nhận diện kỹ năng từ mô tả công việc
- **Industry Mapping**: Chuyển đổi ngành nghề tiếng Việt sang chuẩn hóa

### 🔍 API & Tìm kiếm
- **RESTful API**: Endpoints chuẩn REST với response format nhất quán
- **Advanced Filtering**: Tìm kiếm theo từ khóa, địa điểm, kỹ năng
- **Pagination**: Phân trang linh hoạt với metadata đầy đủ
- **Real-time Crawl**: Trigger crawl thủ công qua API

### 💾 Quản lý dữ liệu
- **MongoDB Integration**: Lưu trữ hiệu quả với Mongoose ODM
- **Data Normalization**: Chuẩn hóa dữ liệu công ty và công việc
- **Embedding Support**: Sẵn sàng cho vector embeddings (AI/ML)
- **Upsert Logic**: Tự động cập nhật hoặc tạo mới

### 🏗️ Kiến trúc & Code Quality
- **MVC Pattern**: Tách biệt rõ ràng Controllers, Services, Models
- **TypeScript**: 100% type-safe với strict mode
- **Clean Code**: ESLint + Prettier configuration
- **Scalable Structure**: Dễ dàng mở rộng thêm crawlers mới

## 📋 Prerequisites

- **Node.js** (>= 18.x)
- **MongoDB** (local or Docker)
  ```bash
  docker run -d -p 27017:27017 mongo
  ```
- **Puppeteer Dependencies** (for Ubuntu/Debian):
  ```bash
  sudo apt-get install -y libgbm-dev
  ```

## 🛠️ Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd crawl-careers-project
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:

   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/crawl-careers
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

## 📡 API Endpoints

### Health Check

```http
GET /api/health
```

Check server status and availability.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-01-25T09:45:00.000Z"
}
```

### Get Jobs

```http
GET /api/jobs?keyword=nodejs&location=hanoi&page=1&limit=10
```

Retrieve job listings with optional filtering and pagination.

**Query Parameters:**
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `keyword` | string | Search in job title and description | - |
| `location` | string | Filter by job location | - |
| `page` | number | Page number for pagination | 1 |
| `limit` | number | Number of results per page | 10 |

**Response:**

```json
{
  "data": [
    {
      "id": "job-abc123",
      "title": "Senior Node.js Developer",
      "slug": "senior-nodejs-developer",
      "source": "topcv",
      "location": "Hanoi",
      "salaryDisplay": "20-30 triệu",
      "sourceUrl": "https://www.topcv.vn/...",
      "description": "...",
      "skills": ["Node.js", "TypeScript", "MongoDB"]
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

### Trigger Manual Crawl

```http
POST /api/crawl
```

Manually trigger the crawling process for TopCV job listings.

**Response:**

```json
{
  "data": {
    "jobCount": 45,
    "companyCount": 20
  },
  "message": "Crawl completed successfully"
}
```

## 📁 Project Structure (MVC)

```
crawl-careers-project/
├── src/
│   ├── app.ts              # Express app configuration
│   ├── server.ts           # Server entry point
│   ├── config/             # Configuration files
│   │   └── db.config.ts    # MongoDB connection
│   ├── controllers/        # HTTP request handlers
│   │   ├── index.ts
│   │   └── jobs.controller.ts
│   ├── services/           # Business logic layer
│   │   ├── index.ts
│   │   └── jobs.service.ts
│   ├── models/             # Database schemas
│   │   ├── index.ts
│   │   ├── job.ts
│   │   └── company.ts
│   ├── routes/             # API route definitions
│   │   ├── index.ts
│   │   └── jobs.route.ts
│   ├── crawlers/           # Web scraping logic
│   │   ├── index.ts
│   │   ├── topcv.ts        # TopCV crawler
│   │   └── jobgo.ts        # JobsGo crawler
│   └── interfaces/         # TypeScript interfaces
│       ├── index.ts
│       ├── job.interface.ts
│       └── company.interface.ts
├── dist/                   # Compiled JavaScript output
├── .env                    # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Technology Stack

### Backend

- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript

### Database

- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB

### Web Scraping

- **Puppeteer** - Headless browser automation
- **Cheerio** - HTML parsing (optional)
- **Axios** - HTTP client

### Development Tools

- **ts-node** - TypeScript execution
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **node-cron** - Task scheduling

## 🎯 Data Models

### Job Model

```typescript
{
  id: string
  title: string
  slug: string
  source: string
  location: string
  workArrangement?: string
  jobType?: string
  description?: string
  salaryDisplay?: string
  salaryMin?: number
  salaryMax?: number
  skills?: string[]
  requirements?: string[]
  status?: string
  postedDate?: string
  expiresAt?: string
  sourceUrl?: string
}
```

### Company Model

```typescript
{
  id: string
  name: string
  slug: string
  website?: string
  description?: string
  logo?: string
  companySize?: string
  industries?: string[]
  locations?: string[]
  contactEmail?: string
  supportEmail?: string
  phone?: string
  nameEmbedding?: number[]
  descriptionEmbedding?: number[]
  jobs: Job[]
}
```

## 🎨 Crawlers hiện có

### 1. JobsGo Crawler (`jobgo.ts`) ✅
- **Website**: https://jobsgo.vn
- **Phương pháp**: Puppeteer (headless browser)
- **Tính năng**:
  - Crawl danh sách công ty theo ngành
  - Trích xuất thông tin chi tiết công ty (logo, website, mô tả, quy mô, ngành nghề)
  - Crawl tất cả công việc của mỗi công ty
  - Phân tích mức lương từ text tiếng Việt
  - Tự động nhận diện 100+ kỹ năng từ mô tả công việc
  - Mapping ngành nghề tiếng Việt sang enum chuẩn
  - Rate limiting để tránh bị chặn (1s delay giữa các request)

### 2. TopCV Crawler (`topcv.ts`) ✅
- **Website**: https://www.topcv.vn
- **Phương pháp**: Axios + Cheerio (lightweight)
- **Tính năng**:
  - Crawl danh sách công việc
  - Trích xuất thông tin cơ bản (title, location, salary)
  - Nhóm công việc theo công ty

## 🚧 Roadmap

### Phase 1: Core Features ✅
- [x] JobsGo crawler với đầy đủ tính năng
- [x] TopCV crawler cơ bản
- [x] RESTful API với pagination
- [x] MongoDB integration
- [x] TypeScript + MVC architecture

### Phase 2: Enhancement 🚀
- [ ] Scheduled crawling với `node-cron` (chạy tự động hàng ngày)
- [ ] Job deduplication logic (loại bỏ trùng lặp)
- [ ] Full-text search với MongoDB Atlas Search
- [ ] Caching layer với Redis

### Phase 3: Additional Sources 📡
- [ ] VietnamWorks crawler
- [ ] ITviec crawler
- [ ] CareerBuilder Vietnam
- [ ] LinkedIn Vietnam

### Phase 4: Advanced Features 🎯
- [ ] Authentication & API rate limiting
- [ ] Admin dashboard (React/Next.js)
- [ ] Email notifications cho công việc mới
- [ ] Job application tracking
- [ ] AI-powered job recommendations (sử dụng embeddings)
- [ ] Salary insights & analytics

### Phase 5: DevOps 🐳
- [ ] Docker Compose setup
- [ ] CI/CD pipeline
- [ ] Monitoring & logging (Winston, Sentry)
- [ ] Performance optimization

## 📝 Scripts

| Script          | Description                             |
| --------------- | --------------------------------------- |
| `npm run build` | Compile TypeScript to JavaScript        |
| `npm start`     | Run the production server               |
| `npm run dev`   | Run development server with auto-reload |

## 🐛 Troubleshooting

### Puppeteer Installation Issues

If you encounter errors with Puppeteer on Linux:

```bash
sudo apt-get update
sudo apt-get install -y libgbm-dev libnss3 libxss1 libasound2
```

### MongoDB Connection Issues

Ensure MongoDB is running:

```bash
# Check if MongoDB is running
docker ps | grep mongo

# If not, start MongoDB container
docker run -d -p 27017:27017 --name mongodb mongo
```

## 🔐 Environment Variables

Tạo file `.env` trong thư mục root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/crawl-careers

# Crawler Settings (Optional)
CRAWL_DELAY_MS=1000
MAX_PAGES_PER_CRAWL=2
HEADLESS_BROWSER=true
```

## 🧪 Testing

```bash
# Test crawl JobsGo
curl -X POST http://localhost:3000/api/crawl

# Get jobs with filters
curl "http://localhost:3000/api/jobs?keyword=nodejs&location=hanoi&page=1&limit=10"

# Health check
curl http://localhost:3000/api/health
```

## 📊 Performance Tips

1. **Puppeteer Memory**: Chạy headless mode để tiết kiệm RAM
2. **Rate Limiting**: Điều chỉnh `CRAWL_DELAY_MS` để tránh bị chặn
3. **MongoDB Indexing**: Tạo index cho các trường tìm kiếm thường xuyên
4. **Pagination**: Sử dụng limit hợp lý (10-50 items/page)

## 🤝 Contributing

Contributions are welcome! Để đóng góp:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

### Coding Standards
- Tuân thủ ESLint + Prettier configuration
- Viết TypeScript với strict mode
- Comment code bằng tiếng Việt hoặc tiếng Anh
- Tạo unit tests cho business logic

## 📄 License

This project is licensed under the ISC License.

## 📧 Contact & Support

- **Issues**: Mở issue trên GitHub để báo lỗi hoặc đề xuất tính năng
- **Discussions**: Tham gia discussions để thảo luận về dự án

---

**Made with ❤️ for Vietnamese Job Seekers**
