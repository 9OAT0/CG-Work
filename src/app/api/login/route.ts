import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// กำหนดรูปแบบ username ที่เป็นนิสิต (user) และ admin
function getRole(username: string): 'user' | 'admin' {
  // สมมติ: ถ้า username เป็นตัวเลข 10 หลัก = นิสิต
  if (/^\d{8}$/.test(username)) return 'user';
  // อื่นๆ เป็น admin (หรือจะปรับ logic เพิ่มเติมก็ได้)
  return 'admin';
}

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    // ถ้ายังไม่มี user นี้ ให้ register
    const role = getRole(username);
    user = await prisma.user.create({
      data: { username, role },
    });
    return NextResponse.json({ message: 'Registered', user });
  }
  // ถ้ามี user แล้ว ให้ login
  return NextResponse.json({ message: 'Logged in', user });
} 