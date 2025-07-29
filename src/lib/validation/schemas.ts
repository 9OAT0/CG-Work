import { z } from 'zod'

// User schemas
export const registerSchema = z.object({
  status: z.enum(['นิสิต', 'บุคคลทั่วไป'], {
    message: 'กรุณาเลือกสถานะ'
  }),
  studentId: z.string().optional(),
  name: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล'),
  dept: z.string().min(1, 'กรุณาเลือกสาขาวิชา'),
  year: z.string().optional()
}).refine((data) => {
  if (data.status === 'นิสิต' && !data.studentId) {
    return false
  }
  return true
}, {
  message: 'กรุณากรอกรหัสนิสิต',
  path: ['studentId']
})

export const loginSchema = z.object({
  student_id: z.string().min(1, 'กรุณากรอกรหัสนิสิต'),
  name: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล')
})

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล').optional(),
  dept: z.string().min(1, 'กรุณาเลือกสาขาวิชา').optional(),
  year: z.string().optional()
})

// Booth schemas
export const createBoothSchema = z.object({
  booth_name: z.string().min(1, 'กรุณากรอกชื่อบูธ'),
  booth_code: z.string().min(1, 'กรุณากรอกรหัสบูธ'),
  dept_type: z.string().min(1, 'กรุณาเลือกหมวดหมู่'),
  description: z.string().min(1, 'กรุณากรอกรายละเอียดบูธ'),
  pics: z.array(z.string().url()).optional()
})

export const updateBoothSchema = z.object({
  booth_name: z.string().min(1, 'กรุณากรอกชื่อบูธ').optional(),
  booth_code: z.string().min(1, 'กรุณากรอกรหัสบูธ').optional(),
  dept_type: z.string().min(1, 'กรุณาเลือกหมวดหมู่').optional(),
  description: z.string().min(1, 'กรุณากรอกรายละเอียดบูธ').optional(),
  pics: z.array(z.string().url()).optional()
})

export const joinBoothSchema = z.object({
  boothCode: z.string().min(1, 'กรุณากรอกรหัสบูธ')
})

// Rating and comment schemas
export const rateBoothSchema = z.object({
  rating: z.number().min(1, 'คะแนนต้องมากกว่า 0').max(5, 'คะแนนต้องไม่เกิน 5'),
  comment: z.string().optional()
})

export const commentSchema = z.object({
  comment: z.string().min(1, 'กรุณากรอกความคิดเห็น').max(500, 'ความคิดเห็นต้องไม่เกิน 500 ตัวอักษร')
})

// Admin schemas
export const createTranscriptIssueSchema = z.object({
  student_id: z.string().min(1, 'กรุณากรอกรหัสนิสิต'),
  name: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล'),
  year: z.string().min(1, 'กรุณากรอกชั้นปี'),
  dept: z.string().min(1, 'กรุณากรอกสาขาวิชา')
})

export const updateUserSchema = z.object({
  username: z.string().optional(),
  name: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล').optional(),
  dept: z.string().min(1, 'กรุณาเลือกสาขาวิชา').optional(),
  year: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['นิสิต', 'บุคคลทั่วไป']).optional()
})

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// File upload schemas
export const fileUploadSchema = z.object({
  files: z.array(z.object({
    filename: z.string(),
    mimetype: z.string(),
    size: z.number().max(5 * 1024 * 1024, 'ไฟล์ต้องมีขนาดไม่เกิน 5MB')
  }))
})

// Notification schemas
export const createNotificationSchema = z.object({
  title: z.string().min(1, 'กรุณากรอกหัวข้อ'),
  message: z.string().min(1, 'กรุณากรอกข้อความ'),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  userId: z.string().optional() // ถ้าไม่ระบุจะส่งให้ทุกคน
})

// Feedback schema
export const feedbackSchema = z.object({
  subject: z.string().min(1, 'กรุณากรอกหัวข้อ'),
  message: z.string().min(1, 'กรุณากรอกข้อความ'),
  type: z.enum(['bug', 'feature', 'general']).default('general'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional()
})

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง')
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'กรุณาระบุ token'),
  newPassword: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
})

// Export validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.issues.map((err: any) => err.message).join(', ')
    throw new Error(errors)
  }
  return result.data
}
