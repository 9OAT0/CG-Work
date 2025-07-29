## ภาพรวม

เอกสารนี้รวบรวมรายละเอียดของทุก Endpoints ในระบบ Exhibition Management System (CG-Work) พัฒนาด้วย Next.js 14 App Router และใช้ MongoDB กับ Prisma ORM

**Base URL**: `http://localhost:3000/api`

---

## การ Authentication

ระบบใช้ JWT Token เก็บใน HTTP-only cookies (อายุ 7 วัน) สำหรับการยืนยันตัวตน และมี 2 บทบาทคือ `user` และ `admin` (Admin endpoints ต้องตรวจสอบ `role` ใน payload ด้วย)

**Headers**:

```
Content-Type: application/json
Cookie: token=<jwt_token>
```

### ข้อผิดพลาดมาตรฐาน

```json
{
  "error": "ข้อความผิดพลาด",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-30T00:00:00.000Z"
}
```

**Common Codes**:

* `VALIDATION_ERROR` (400)
* `AUTHENTICATION_ERROR` (401)
* `AUTHORIZATION_ERROR` (403)
* `NOT_FOUND_ERROR` (404)
* `CONFLICT_ERROR` (409)
* `RATE_LIMIT_EXCEEDED` (429)
* `INTERNAL_SERVER_ERROR` (500)

**Rate Limiting**:

* Authentication: 5 req / 15 นาที
* Upload: 10 req / นาที
* ทั่วไป: 100 req / นาที
* เข้มงวด: 10 req / นาที

---

## 🔐 Authentication Endpoints

### POST /api/register

ลงทะเบียนผู้ใช้ใหม่ (นิสิตหรือบุคคลทั่วไป)
**Request**:

```json
{
  "status": "นิสิต" | "บุคคลทั่วไป",
  "studentId": "string", // จำเป็นถ้า status เป็น นิสิต
  "name": "string",
  "dept": "string",
  "year": "string" // ไม่บังคับ
}
```

**Response (201)**:

```json
{
  "message": "ลงทะเบียนสำเร็จ",
  "user": {
    "id": "string",
    "name": "string",
    "dept": "string",
    "role": "user"
  }
}
```

**Error**:

* 400: ข้อมูลไม่ครบถ้วน
* 409: รหัสนิสิตซ้ำ

### POST /api/login

เข้าสู่ระบบ
**Request**:

```json
{
  "student_id": "string",
  "name": "string"
}
```

**Response (200)**:

```json
{
  "message": "เข้าสู่ระบบสำเร็จ",
  "user": {
    "id": "string",
    "name": "string",
    "dept": "string",
    "role": "user",
    "score": 0
  }
}
```

### POST /api/logout

**Response**:

```json
{ "message": "ออกจากระบบสำเร็จ" }
```

### GET /api/me

ดึงข้อมูลผู้ใช้ปัจจุบัน
**Response**:

```json
{
  "user": {
    "id": "string",
    "name": "string",
    "dept": "string",
    "role": "user",
    "score": 0,
    "student_id": "string",
    "status": "นิสิต",
    "year": "string"
  }
}
```

---

## 👤 User Profile Endpoints

### GET /api/profile

ดึงโปรไฟล์ผู้ใช้พร้อมสถิติ
**Response**:

```json
{
  "user": {
    "id": "string",
    "name": "string",
    "dept": "string",
    "score": 0,
    "student_id": "string",
    "status": "นิสิต",
    "stats": {
      "joinedBooths": 5,
      "ratingsGiven": 3,
      "transcriptsReceived": 2,
      "favoriteBooths": 4
    },
    "recentActivity": [ ... ]
  }
}
```

### PUT /api/profile

อัปเดตโปรไฟล์
**Request**:

```json
{ "name?": "string", "dept?": "string", "year?": "string" }
```

**Response**:

```json
{ "message": "อัปเดตโปรไฟล์สำเร็จ", "user": { ... } }
```

---

## 🏢 Booth Management

### GET /api/booth

ดึงรายการบูธทั้งหมด (pagination, filtering)
**Query**: `page`, `limit`, `search`, `dept_type`, `sortBy`, `sortOrder`
**Response**:

```json
{
  "booths": [ ... ],
  "pagination": { ... }
}
```

### GET /api/booth/\[id]

ดึงรายละเอียดบูธ
**Response**:

```json
{
  "id": "string",
  "booth_name": "string",
  "booth_code": "string",
  "dept_type": "string",
  "description": "string",
  "pics": ["string"],
  "owners": [ ... ],
  "stats": { ... },
  "ratings": [ ... ],
  "comments": [ ... ]
}
```

### POST /api/register-booth

สร้างบูธใหม่ (ต้อง login)
**Request**:

```json
{
  "booth_name": "string",
  "booth_code": "string",
  "dept_type": "string",
  "description": "string",
  "pics?": ["string"]
}
```

**Response (201)**:

```json
{ "message": "สร้างบูธสำเร็จ", "booth": { ... } }
```

### PUT /api/booth/\[id]

อัปเดตบูธ (Owner/Admin)
**Request**: fields ใดๆ ที่ต้องการอัปเดต
**Response**:

```json
{ "message": "อัปเดตบูธสำเร็จ", "booth": { ... } }
```

### DELETE /api/booth/\[id]

ลบบูธ (Owner/Admin)
**Response**:

```json
{ "message": "ลบบูธสำเร็จ" }
```

### POST /api/jjoin-booth

เข้าร่วมบูธด้วย booth code
**Request**:

```json
{ "boothCode": "string" }
```

**Response**:

```json
{
  "message": "เข้าร่วมบูธสำเร็จ",
  "booth": { "id","booth_name","dept_type" },
  "newScore": 10
}
```

### GET /api/booth/by-dept

ดึงบูธตามหมวดหมู่
**Query**: `dept_type`
**Response**:

```json
{ "departments": [ { "dept_type": "string", "booths": [ ... ] } ] }
```

---

## ⭐ Booth Rating & Social

### POST /api/booth/\[id]/rating

ให้คะแนนบูธ
**Request**: `{ "rating": 1-5, "comment?": "string" }`
**Response**:

```json
{ "message": "ให้คะแนนสำเร็จ", "rating": { ... } }
```

### GET /api/booth/\[id]/rating

ดึงคะแนนทั้งหมดและสถิติ
**Response**:

```json
{ "ratings": [ ... ], "stats": { totalRatings, averageRating } }
```

### POST /api/booth/\[id]/favorite

สลับสถานะโปรด
**Response**:

```json
{ "message": "เพิ่มเข้ารายการโปรดแล้ว", "isFavorited": true }
```

### GET /api/booth/\[id]/favorite

ตรวจสถานะโปรด
**Response**:

```json
{ "isFavorited": true }
```

### GET /api/booth/favorites

ดึงรายการโปรดผู้ใช้ (pagination)
**Response**:

```json
{ "favorites": [ ... ], "pagination": { ... } }
```

---

## 📜 Transcript Management

### POST /api/claim-transcript

รับ transcript (ต้อง login, ใช้คะแนน 6 คะแนน วันละ 1 ครั้ง)
**Response**:

```json
{ "message": "รับ transcript สำเร็จ และหัก 6 คะแนนแล้ว" }
```

**Business Rules**:

* คะแนน ≥ 6
* วันละ 1 ครั้ง

---

## 📊 Statistics & Analytics

### GET /api/leaderboard

ดึงกระดานผู้นำ (pagination, filter dept, period)
**Response**:

```json
{ "leaderboard": [ ... ], "pagination": { ... }, "departmentStats": [ ... ], "filters": { ... } }
```

---

## 👨‍💼 Admin Endpoints

### GET /api/admin/stats

สถิติภาพรวม (period: 7d,30d,90d,all)
**Response**: overview, topBooths, topUsers, departmentStats, dailyActivity

### GET /api/admin/participants

ดึงผู้ใช้งาน (pagination, search, filter dept)

### GET /api/admin/transcript-issues

ดึงรายการปัญหา transcript

### POST /api/admin/transcript-issues

เพิ่มปัญหา transcript
**Request**: `{ student_id, name, year, dept }`

---

## 📁 File Upload

### POST /api/upload

อัปโหลดรูปภาพ (JPEG, PNG, WebP, GIF; max 5MB)
**Response**: รายละเอียดไฟล์ที่อัปโหลด

---

## ✅ System

### GET /api/health

ตรวจสอบสถานะระบบ
**Response**:

```json
{ "status": "healthy", "timestamp": "...", "version": "1.0.0", "database": "connected" }
```

---

## โมเดลข้อมูล

```typescript
interface User { id, username, status, role, year?, name, student_id?, dept, score, createdAt }
interface Booth { id, booth_name, booth_code, dept_type, description?, pics }
interface BoothRating { id, userId, boothId, rating, comment?, createdAt }
interface BoothFavorite { id, userId, boothId, createdAt }
```

---

## สรุปโลจิกธุรกิจ

* เข้าร่วมบูธ 1 ครั้ง = 1 คะแนน (max 30/day)
* รับ transcript ใช้ 6 คะแนน (max 1/day)

---

## ตัวแปรสภาพแวดล้อม

```
DATABASE_URL="mongodb://..."
JWT_SECRET="your-secret-key"
NODE_ENV="development" # หรือ "production"
```
