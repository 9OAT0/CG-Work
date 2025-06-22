import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

// กำหนด user type
function getRole(username: string): 'user' | 'admin' {
  if (/^\d{8}$/.test(username)) return 'user';
  return 'admin';
}

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  // ค้นหาหรือสร้างผู้ใช้
  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const role = getRole(username);
    user = await prisma.user.create({
      data: { username, role },
    });
  }

  // สร้าง JWT token
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token มีอายุ 7 วัน
  );

  // สร้าง response พร้อมเซ็ต cookie
  const res = NextResponse.json({ message: 'Authenticated', user });
  res.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 วัน
  });

  return res;
}