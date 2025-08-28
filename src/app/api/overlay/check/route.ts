import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@/generated/prisma';
import jwt from "jsonwebtoken";
import { getThailandTime } from "@/lib/time";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    // Get user from token
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "ไม่พบ token" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json({ error: "Token ไม่ถูกต้อง" }, { status: 401 });
    }

    const userId = decoded.id;
    const { sessionId, isNewLogin } = await req.json();

    // Get current time in Thailand timezone
    const now = getThailandTime();
    const today = now.toDateString();
    
    console.log('🔍 API Debug:', { userId, sessionId, isNewLogin });

    // FAST PATH: If it's a new login, show overlay immediately without complex checks
    if (isNewLogin) {
      console.log('✅ EVERY_LOGIN trigger activated');
      
      // Log the overlay display
      await prisma.userOverlayLog.create({
        data: {
          userId,
          triggerType: 'EVERY_LOGIN',
          shownAt: now,
          sessionId: sessionId || null,
          dismissed: false
        }
      });

      const response = {
        shouldShow: true,
        triggerType: 'EVERY_LOGIN',
        reason: 'ผู้ใช้เข้าสู่ระบบใหม่',
        imageUrl: '/ovl29.png'
      };
      
      console.log('📤 API Response:', response);
      return NextResponse.json(response);
    }

    // For non-login cases, do minimal checks
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        overlayLogs: {
          select: {
            triggerType: true,
            shownAt: true
          },
          orderBy: { shownAt: 'desc' },
          take: 10 // Limit to recent logs only
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // Check for DAILY_FIRST_VISIT trigger only
    const todayOverlayLog = user.overlayLogs.find(
      log => log.triggerType === 'DAILY_FIRST_VISIT' && 
             log.shownAt.toDateString() === today
    );

    if (!todayOverlayLog) {
      // Log the overlay display
      await prisma.userOverlayLog.create({
        data: {
          userId,
          triggerType: 'DAILY_FIRST_VISIT',
          shownAt: now,
          sessionId: sessionId || null,
          dismissed: false
        }
      });

      return NextResponse.json({
        shouldShow: true,
        triggerType: 'DAILY_FIRST_VISIT',
        reason: 'ครั้งแรกของวันนี้',
        imageUrl: '/ovl29.png'
      });
    }

    return NextResponse.json({
      shouldShow: false
    });

  } catch (error) {
    console.error("Error checking overlay triggers:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการตรวจสอบ overlay" },
      { status: 500 }
    );
  }
}
