import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

// กำหนด role จาก username
function getRole(username: string): 'user' | 'admin' {
  return /^\d{8}$/.test(username) ? 'user' : 'admin';
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, name, year, dept } = body;

  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const role = getRole(username);
    user = await prisma.user.create({
      data: {
        username,
        role,
        name: name || '',
        year: year || '',
        student_id: username,
        dept: dept || '',
      },
    });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const res = NextResponse.json({ message: 'Authenticated', user });

  res.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}