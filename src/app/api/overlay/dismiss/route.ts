import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@/generated/prisma';
import jwt from "jsonwebtoken";

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
    const { triggerType, sessionId } = await req.json();

    // Find the most recent overlay log for this trigger type and mark as dismissed
    const overlayLog = await prisma.userOverlayLog.findFirst({
      where: {
        userId,
        triggerType,
        dismissed: false,
        ...(sessionId && { sessionId })
      },
      orderBy: { shownAt: 'desc' }
    });

    if (overlayLog) {
      await prisma.userOverlayLog.update({
        where: { id: overlayLog.id },
        data: { dismissed: true }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error dismissing overlay:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการปิด overlay" },
      { status: 500 }
    );
  }
}
