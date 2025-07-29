# API Documentation

## Overview
This document provides comprehensive documentation for all API endpoints in the CG-Work project. The API is built with Next.js 14 App Router and uses MongoDB with Prisma ORM.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require authentication via JWT token stored in HTTP-only cookies. Admin endpoints require additional role verification.

### Headers
```
Content-Type: application/json
Cookie: token=<jwt_token>
```

## Error Responses
All endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-30T00:00:00.000Z"
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400) - Invalid input data
- `AUTHENTICATION_ERROR` (401) - Missing or invalid token
- `AUTHORIZATION_ERROR` (403) - Insufficient permissions
- `NOT_FOUND_ERROR` (404) - Resource not found
- `CONFLICT_ERROR` (409) - Resource conflict (e.g., duplicate data)
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_SERVER_ERROR` (500) - Server error

## Rate Limiting
- **Authentication endpoints**: 5 requests per 15 minutes
- **Upload endpoints**: 10 requests per minute
- **General API endpoints**: 100 requests per minute
- **Strict endpoints**: 10 requests per minute

---

## Authentication Endpoints

### POST /api/register
Register a new user account.

**Request Body:**
```json
{
  "status": "นิสิต" | "บุคคลทั่วไป",
  "studentId": "string", // Required if status is "นิสิต"
  "name": "string",
  "dept": "string",
  "year": "string" // Optional
}
```

**Response:**
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

### POST /api/login
Login with existing credentials.

**Request Body:**
```json
{
  "student_id": "string",
  "name": "string"
}
```

**Response:**
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
Logout current user.

**Response:**
```json
{
  "message": "ออกจากระบบสำเร็จ"
}
```

### GET /api/me
Get current user information.

**Response:**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "dept": "string",
    "role": "user",
    "score": 0,
    "student_id": "string",
    "status": "นิสิต"
  }
}
```

---

## User Profile Endpoints

### GET /api/profile
Get detailed user profile with statistics.

**Response:**
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
    "recentActivity": [
      {
        "type": "join_booth",
        "boothName": "Booth Name",
        "timestamp": "2025-01-30T00:00:00.000Z"
      }
    ]
  }
}
```

### PUT /api/profile
Update user profile information.

**Request Body:**
```json
{
  "name": "string", // Optional
  "dept": "string", // Optional
  "year": "string"  // Optional
}
```

**Response:**
```json
{
  "message": "อัปเดตโปรไฟล์สำเร็จ",
  "user": {
    "id": "string",
    "name": "string",
    "dept": "string"
  }
}
```

---

## Booth Management Endpoints

### GET /api/booth
Get list of all booths with pagination and filtering.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10, max: 100) - Items per page
- `search` (string) - Search in booth name, description, or code
- `dept_type` (string) - Filter by department type
- `sortBy` (string, default: "createdAt") - Sort field
- `sortOrder` ("asc" | "desc", default: "desc") - Sort order

**Response:**
```json
{
  "booths": [
    {
      "id": "string",
      "booth_name": "string",
      "booth_code": "string",
      "dept_type": "string",
      "description": "string",
      "pics": ["string"],
      "owners": [
        {
          "name": "string"
        }
      ],
      "stats": {
        "participants": 10,
        "ratings": 5,
        "favorites": 3,
        "averageRating": 4.2
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "hasNextPage": true,
    "hasPrevPage": false,
    "limit": 10
  }
}
```

### GET /api/booth/[id]
Get detailed information about a specific booth.

**Response:**
```json
{
  "id": "string",
  "booth_name": "string",
  "booth_code": "string",
  "dept_type": "string",
  "description": "string",
  "pics": ["string"],
  "owners": [
    {
      "id": "string",
      "name": "string"
    }
  ],
  "stats": {
    "participants": 10,
    "ratings": 5,
    "favorites": 3,
    "averageRating": 4.2
  },
  "ratings": [
    {
      "id": "string",
      "rating": 5,
      "comment": "string",
      "userName": "string",
      "createdAt": "2025-01-30T00:00:00.000Z"
    }
  ],
  "comments": [
    {
      "id": "string",
      "comment": "string",
      "userName": "string",
      "createdAt": "2025-01-30T00:00:00.000Z"
    }
  ]
}
```

### PUT /api/booth/[id]
Update booth information (Owner or Admin only).

**Request Body:**
```json
{
  "booth_name": "string", // Optional
  "booth_code": "string", // Optional
  "dept_type": "string",  // Optional
  "description": "string", // Optional
  "pics": ["string"]      // Optional
}
```

**Response:**
```json
{
  "message": "อัปเดตบูธสำเร็จ",
  "booth": {
    "id": "string",
    "booth_name": "string",
    "booth_code": "string",
    "dept_type": "string",
    "description": "string",
    "pics": ["string"]
  }
}
```

### DELETE /api/booth/[id]
Delete a booth (Owner or Admin only).

**Response:**
```json
{
  "message": "ลบบูธสำเร็จ"
}
```

### POST /api/register-booth
Create a new booth.

**Request Body:**
```json
{
  "booth_name": "string",
  "booth_code": "string",
  "dept_type": "string",
  "description": "string",
  "pics": ["string"] // Optional
}
```

**Response:**
```json
{
  "message": "สร้างบูธสำเร็จ",
  "booth": {
    "id": "string",
    "booth_name": "string",
    "booth_code": "string",
    "dept_type": "string",
    "description": "string"
  }
}
```

### POST /api/join-booth
Join a booth using booth code.

**Request Body:**
```json
{
  "boothCode": "string"
}
```

**Response:**
```json
{
  "message": "เข้าร่วมบูธสำเร็จ",
  "booth": {
    "id": "string",
    "booth_name": "string",
    "dept_type": "string"
  },
  "newScore": 10
}
```

### GET /api/booth/by-dept
Get booths grouped by department type.

**Response:**
```json
{
  "departments": [
    {
      "dept_type": "string",
      "booths": [
        {
          "id": "string",
          "booth_name": "string",
          "booth_code": "string",
          "description": "string",
          "pics": ["string"]
        }
      ]
    }
  ]
}
```

---

## Booth Rating & Social Features

### POST /api/booth/[id]/rating
Rate a booth (1-5 stars).

**Request Body:**
```json
{
  "rating": 5,
  "comment": "string" // Optional
}
```

**Response:**
```json
{
  "message": "ให้คะแนนสำเร็จ",
  "rating": {
    "id": "string",
    "rating": 5,
    "comment": "string",
    "userName": "string",
    "createdAt": "2025-01-30T00:00:00.000Z"
  }
}
```

### GET /api/booth/[id]/rating
Get all ratings for a booth.

**Response:**
```json
{
  "ratings": [
    {
      "id": "string",
      "rating": 5,
      "comment": "string",
      "userName": "string",
      "createdAt": "2025-01-30T00:00:00.000Z"
    }
  ],
  "stats": {
    "totalRatings": 10,
    "averageRating": 4.2
  }
}
```

### POST /api/booth/[id]/favorite
Toggle booth favorite status.

**Response:**
```json
{
  "message": "เพิ่มเข้ารายการโปรดแล้ว",
  "isFavorited": true
}
```

### GET /api/booth/[id]/favorite
Get booth favorite status for current user.

**Response:**
```json
{
  "isFavorited": true
}
```

### GET /api/booth/favorites
Get user's favorite booths.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)

**Response:**
```json
{
  "favorites": [
    {
      "id": "string",
      "booth_name": "string",
      "booth_code": "string",
      "dept_type": "string",
      "description": "string",
      "pics": ["string"],
      "owners": [{"name": "string"}],
      "stats": {
        "participants": 10,
        "ratings": 5,
        "favorites": 3,
        "averageRating": 4.2
      },
      "favoritedAt": "2025-01-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 2,
    "totalCount": 15,
    "hasNextPage": true,
    "hasPrevPage": false,
    "limit": 10
  }
}
```

---

## File Upload Endpoints

### POST /api/upload
Upload files (images only, max 5MB each).

**Request:** Multipart form data with `files` field

**Response:**
```json
{
  "message": "อัพโหลดไฟล์สำเร็จ",
  "files": [
    {
      "id": "string",
      "filename": "string",
      "originalName": "string",
      "url": "/uploads/filename.jpg",
      "size": 1024000,
      "mimetype": "image/jpeg"
    }
  ]
}
```

---

## Statistics & Analytics

### GET /api/leaderboard
Get user leaderboard with rankings.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `dept` (string) - Filter by department
- `period` ("all" | "7d" | "30d", default: "all") - Time period

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "id": "string",
      "name": "string",
      "dept": "string",
      "score": 100,
      "student_id": "string",
      "status": "นิสิต",
      "stats": {
        "totalParticipations": 10,
        "participationsInPeriod": 5,
        "ratingsGiven": 8,
        "transcriptsReceived": 3
      },
      "joinedAt": "2025-01-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 100,
    "hasNextPage": true,
    "hasPrevPage": false,
    "limit": 20
  },
  "departmentStats": [
    {
      "department": "Computer Science",
      "userCount": 25,
      "averageScore": 45.6
    }
  ],
  "filters": {
    "period": "all",
    "department": "all"
  }
}
```

---

## Admin Endpoints

### GET /api/admin/stats
Get comprehensive system statistics (Admin only).

**Query Parameters:**
- `period` ("7d" | "30d" | "90d" | "all", default: "7d")

**Response:**
```json
{
  "overview": {
    "totalUsers": 150,
    "totalBooths": 25,
    "totalParticipations": 500,
    "totalRatings": 200,
    "totalTranscripts": 75,
    "period": {
      "newUsers": 10,
      "newBooths": 2,
      "newParticipations": 50,
      "days": "7d"
    }
  },
  "topBooths": [
    {
      "id": "string",
      "booth_name": "string",
      "dept_type": "string",
      "participants": 25,
      "ratings": 15,
      "favorites": 8,
      "averageRating": 4.5
    }
  ],
  "topUsers": [
    {
      "id": "string",
      "name": "string",
      "score": 100,
      "dept": "string",
      "_count": {
        "joinedBooths": 10
      }
    }
  ],
  "departmentStats": [
    {
      "department": "Computer Science",
      "userCount": 25
    }
  ],
  "dailyActivity": [
    {
      "date": "2025-01-30",
      "newUsers": 5,
      "newParticipations": 15,
      "newRatings": 8
    }
  ]
}
```

### GET /api/admin/participants
Get all participants with filtering (Admin only).

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)
- `search` (string) - Search in name or student ID
- `dept` (string) - Filter by department
- `sortBy` (string, default: "createdAt")
- `sortOrder` ("asc" | "desc", default: "desc")

**Response:**
```json
{
  "participants": [
    {
      "id": "string",
      "name": "string",
      "student_id": "string",
      "dept": "string",
      "score": 50,
      "status": "นิสิต",
      "role": "user",
      "stats": {
        "joinedBooths": 5,
        "ratingsGiven": 3,
        "transcriptsReceived": 2
      },
      "createdAt": "2025-01-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 15,
    "totalCount": 150,
    "hasNextPage": true,
    "hasPrevPage": false,
    "limit": 10
  }
}
```

### GET /api/admin/transcript-issues
Get transcript issues (Admin only).

**Response:**
```json
{
  "issues": [
    {
      "id": "string",
      "student_id": "string",
      "name": "string",
      "year": "string",
      "dept": "string",
      "createdAt": "2025-01-30T00:00:00.000Z"
    }
  ]
}
```

### POST /api/admin/transcript-issues
Create a new transcript issue (Admin only).

**Request Body:**
```json
{
  "student_id": "string",
  "name": "string",
  "year": "string",
  "dept": "string"
}
```

**Response:**
```json
{
  "message": "บันทึกปัญหาใบรับรองสำเร็จ",
  "issue": {
    "id": "string",
    "student_id": "string",
    "name": "string",
    "year": "string",
    "dept": "string"
  }
}
```

---

## Transcript Management

### POST /api/claim-transcript
Claim transcript (increases user score).

**Response:**
```json
{
  "message": "รับใบรับรองสำเร็จ",
  "newScore": 60
}
```

---

## System Information

### GET /api/health
Check system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-30T00:00:00.000Z",
  "version": "1.0.0",
  "database": "connected"
}
```

---

## Data Models

### User
```typescript
{
  id: string
  username: string
  status: "นิสิต" | "บุคคลทั่วไป"
  role: "user" | "admin"
  year?: string
  name: string
  student_id?: string
  dept: string
  score: number
  createdAt: Date
}
```

### Booth
```typescript
{
  id: string
  booth_name: string
  booth_code: string
  dept_type: string
  description?: string
  pics: string[]
}
```

### BoothRating
```typescript
{
  id: string
  userId: string
  boothId: string
  rating: number // 1-5
  comment?: string
  createdAt: Date
}
```

### BoothFavorite
```typescript
{
  id: string
  userId: string
  boothId: string
  createdAt: Date
}
```

---

## Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request / Validation Error
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **409** - Conflict
- **429** - Too Many Requests
- **500** - Internal Server Error

---

## Notes

1. All timestamps are in ISO 8601 format
2. File uploads are limited to images only (JPEG, PNG, WebP, GIF)
3. Maximum file size is 5MB per file
4. Rate limiting is applied per IP address
5. Admin endpoints require `role: "admin"` in JWT payload
6. Pagination is 1-indexed (first page is page 1)
7. Search is case-insensitive and supports partial matches
