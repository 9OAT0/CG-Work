import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get('token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: ไม่พบ token' }, { status: 401 })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string }

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: ต้องเป็นผู้ดูแลระบบ' }, { status: 403 })
    }

    return decoded // ✅ ส่งข้อมูล decoded กลับไป
  } catch (err) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}