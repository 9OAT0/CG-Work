# API Documentation

## Overview
นี่คือ API documentation สำหรับระบบจัดการงานนิทรรศการ (Exhibition Management System) ที่พัฒนาด้วย Next.js และ Prisma ORM

## Base URL
```
http://localhost:3000/api
```

## Authentication
ระบบใช้ JWT Token ที่เก็บใน HTTP-only cookies สำหรับการ authentication
- Token จะมีอายุ 7 วัน
- ต้องส่ง token ผ่าน cookies ในทุก request ที่ต้องการ authentication

## Data Models

### User
```typescript
{
  id: string
  username: string
  status: string // "นิสิต" หรือ "บุคคลทั่วไป"
  role: string // "user" หรือ "admin"
  year?: string
  name: string
  student_id?: string // unique สำหรับนิสิต
  dept: string // สาขาวิชา
  score: number // คะแนนสะสม (default: 0)
  createdAt: DateTime
}
```

### Booth
```typescript
{
  id: string
  booth_name: string
  booth_code: string // unique
  dept_type: string // หมวดหมู่ของงานนิทรรศการ
  description?: string
  pics: string[] // URL ภาพบูธ
}
```

---

## API Endpoints

### 🔐 Authentication

#### POST /api/register
ลงทะเบียนผู้ใช้ใหม่

**Request Body:**
```json
{
  "status": "นิสิต", // หรือ "บุคคลทั่วไป"
  "studentId": "6410001234", // จำเป็นเฉพาะนิสิต
  "name": "นาย สมชาย ใจดี",
  "dept": "วิศวกรรมคอมพิวเตอร์"
}
```

**Response:**
```json
{
  "message": "ลงทะเบียนสำเร็จ"
}
```

**Error Responses:**
- `400` - ข้อมูลไม่ครบถ้วน
- `409` - รหัสนิสิตซ้ำ

---

#### POST /api/login
เข้าสู่ระบบ

**Request Body:**
```json
{
  "student_id": "6410001234",
  "name": "นาย สมชาย ใจดี"
}
```

**Response:**
```json
{
  "message": "เข้าสู่ระบบสำเร็จ",
  "user": {
    "id": "...",
    "username": "6410001234",
    "name": "นาย สมชาย ใจดี",
    "role": "user",
    "dept": "วิศวกรรมคอมพิวเตอร์"
  }
}
```

**Error Responses:**
- `400` - ข้อมูลไม่ครบถ้วน
- `404` - ไม่พบผู้ใช้งาน

---

#### POST /api/logout
ออกจากระบบ

**Response:**
```json
{
  "message": "Logged out"
}
```

---

### 👤 User Profile

#### GET /api/me
ดึงข้อมูลผู้ใช้ปัจจุบัน (ต้อง login)

**Response:**
```json
{
  "id": "...",
  "username": "6410001234",
  "name": "นาย สมชาย ใจดี",
  "student_id": "6410001234",
  "year": null,
  "dept": "วิศวกรรมคอมพิวเตอร์",
  "role": "user",
  "joinedBooths": [
    {
      "booth_id": "...",
      "booth_name": "AI Innovation",
      "dept_type": "เทคโนโลยี",
      "joinedAt": "2025-01-30T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401` - ไม่มี token หรือ token ไม่ถูกต้อง
- `404` - ไม่พบผู้ใช้งาน

---

#### GET /api/profile
ดึงข้อมูล profile พร้อมสถิติคะแนน (ต้อง login)

**Response:**
```json
{
  "name": "นาย สมชาย ใจดี",
  "student_id": "6410001234",
  "status": "นิสิต",
  "dept": "วิศวกรรมคอมพิวเตอร์",
  "dailyPoints": 5, // คะแนนวันนี้
  "dailyMax": 30, // คะแนนสูงสุดต่อวัน
  "totalPoints": 25, // คะแนนรวม
  "totalMax": 90, // คะแนนสูงสุดรวม
  "transcriptDates": ["2025-01-30", "2025-01-29"] // วันที่รับ transcript
}
```

---

### 🏢 Booth Management

#### GET /api/booth/[id]
ดึงข้อมูลบูธตาม ID

**URL Parameters:**
- `id` - Booth ID

**Response:**
```json
{
  "id": "...",
  "booth_name": "AI Innovation",
  "dept_type": "เทคโนโลยี",
  "description": "นิทรรศการเกี่ยวกับ AI และ Machine Learning",
  "pics": ["https://example.com/pic1.jpg", "https://example.com/pic2.jpg"]
}
```

**Error Responses:**
- `400` - ไม่มี booth ID
- `404` - ไม่พบบูธ

---

#### GET /api/booth/by-dept?dept_type={type}
ดึงรายการบูธตามหมวดหมู่

**Query Parameters:**
- `dept_type` - หมวดหมู่ของบูธ (เช่น "เทคโนโลยี", "3D", "วิศวกรรม")

**Response:**
```json
{
  "count": 5,
  "booths": [
    {
      "id": "...",
      "booth_name": "AI Innovation",
      "dept_type": "เทคโนโลยี",
      "description": "นิทรรศการเกี่ยวกับ AI",
      "pics": ["https://example.com/pic1.jpg"],
      "booth_code": "AI2025",
      "joined": true // true ถ้าผู้ใช้เข้าร่วมแล้ว (ต้อง login)
    }
  ]
}
```

**Error Responses:**
- `400` - ไม่มี dept_type parameter
- `404` - ไม่พบบูธในหมวดหมู่ที่ระบุ

---

#### POST /api/register-booth
สร้างบูธใหม่ (ต้อง login)

**Request Body:**
```json
{
  "booth_name": "AI Innovation",
  "booth_code": "AI2025",
  "dept_type": "เทคโนโลยี",
  "description": "นิทรรศการเกี่ยวกับ AI และ Machine Learning"
}
```

**Response:**
```json
{
  "message": "สร้างบูธสำเร็จ",
  "booth": {
    "id": "...",
    "booth_name": "AI Innovation",
    "booth_code": "AI2025",
    "dept_type": "เทคโนโลยี",
    "description": "นิทรรศการเกี่ยวกับ AI และ Machine Learning"
  }
}
```

**Error Responses:**
- `400` - ข้อมูลไม่ครบหรือ booth_code ซ้ำ
- `401` - ไม่มี token หรือ token ไม่ถูกต้อง

---

#### POST /api/join-booth
เข้าร่วมบูธด้วย booth code (ต้อง login)

**Request Body:**
```json
{
  "boothCode": "AI2025"
}
```

**Response:**
```json
{
  "message": "เข้าร่วม booth สำเร็จ (คะแนนวันนี้: 6/30)"
}
```

**Business Rules:**
- ได้คะแนน 1 คะแนนต่อการเข้าร่วม 1 บูธ
- สามารถได้คะแนนสูงสุด 30 คะแนนต่อวัน
- ไม่สามารถเข้าร่วมบูธเดิมซ้ำได้

**Error Responses:**
- `400` - ไม่มี boothCode หรือ booth code ไม่ถูกต้อง หรือคะแนนเต็มแล้ว
- `401` - ไม่มี token หรือ token ไม่ถูกต้อง
- `404` - ไม่พบผู้ใช้งาน

---

### 📜 Transcript Management

#### POST /api/claim-transcript
รับ transcript (ต้อง login และมีคะแนนอย่างน้อย 6 คะแนน)

**Response:**
```json
{
  "message": "รับ transcript สำเร็จ และหัก 6 คะแนนแล้ว"
}
```

**Business Rules:**
- ต้องมีคะแนนอย่างน้อย 6 คะแนน
- รับได้วันละ 1 ครั้ง
- หักคะแนน 6 คะแนนทุกครั้งที่รับ

**Error Responses:**
- `400` - คะแนนไม่เพียงพอหรือรับวันนี้แล้ว
- `401` - ไม่มี token หรือ token ไม่ถูกต้อง
- `404` - ไม่พบผู้ใช้งาน

---

### 👨‍💼 Admin APIs

#### GET /api/admin/participants
ดึงสถิติผู้เข้าร่วม (ต้อง login เป็น admin)

**Response:**
```json
{
  "data": [
    {
      "date": "2025-01-30",
      "count": 150
    },
    {
      "date": "2025-01-29",
      "count": 120
    }
  ],
  "total": 270
}
```

**Error Responses:**
- `401` - ไม่มี token หรือ token ไม่ถูกต้อง
- `403` - ไม่ใช่ admin

---

#### GET /api/admin/transcript-issues
ดึงรายการปัญหา transcript (ต้อง login เป็น admin)

**Response:**
```json
{
  "issues": [
    {
      "id": "...",
      "student_id": "6410001234",
      "name": "นาย สมชาย ใจดี",
      "year": "4",
      "dept": "วิศวกรรมคอมพิวเตอร์",
      "createdAt": "2025-01-30T10:30:00.000Z"
    }
  ]
}
```

---

#### POST /api/admin/transcript-issues
เพิ่มรายการปัญหา transcript (ต้อง login เป็น admin)

**Request Body:**
```json
{
  "student_id": "6410001234",
  "name": "นาย สมชาย ใจดี",
  "year": "4",
  "dept": "วิศวกรรมคอมพิวเตอร์"
}
```

**Response:**
```json
{
  "message": "เพิ่มรายชื่อสำเร็จ"
}
```

**Error Responses:**
- `400` - ข้อมูลไม่ครบถ้วน
- `401` - ไม่มี token หรือ token ไม่ถูกต้อง
- `403` - ไม่ใช่ admin

---

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Error message in Thai"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (ข้อมูลไม่ถูกต้อง)
- `401` - Unauthorized (ไม่มี token หรือ token หมดอายุ)
- `403` - Forbidden (ไม่มีสิทธิ์เข้าถึง)
- `404` - Not Found (ไม่พบข้อมูล)
- `409` - Conflict (ข้อมูลซ้ำ)
- `500` - Internal Server Error

---

## Business Logic Summary

### คะแนนระบบ (Scoring System)
- เข้าร่วมบูธ 1 ครั้ง = 1 คะแนน
- คะแนนสูงสุดต่อวัน = 30 คะแนน
- รับ transcript ต้องใช้ 6 คะแนน
- รับ transcript ได้วันละ 1 ครั้ง

### การ Authentication
- ใช้ JWT Token เก็บใน HTTP-only cookies
- Token มีอายุ 7 วัน
- มี 2 role: "user" และ "admin"

### การจัดการบูธ
- แต่ละบูธมี booth_code ที่ unique
- ผู้ใช้สามารถเข้าร่วมบูธเดิมได้เพียงครั้งเดียว
- บูธจัดกลุ่มตาม dept_type

---

## Environment Variables Required
```env
DATABASE_URL="mongodb://..."
JWT_SECRET="your-secret-key"
NODE_ENV="development" # หรือ "production"
```

---

## Notes
- ระบบใช้ MongoDB เป็น database
- เวลาทั้งหมดใช้ timezone ประเทศไทย (UTC+7)
- API ส่วนใหญ่ return ข้อความเป็นภาษาไทย
- ระบบมีการ logging การเข้าชมผ่าน VisitLog model
