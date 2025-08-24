// app/api/admin/daily-logins/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// รันบน Node.js runtime เพื่อความเข้ากันได้ของ Prisma/ไลบรารี
export const runtime = "nodejs";

// ใช้ /api/me เพื่อตรวจ session + role แทนการ verify JWT เอง
async function getMe(request: NextRequest) {
  const res = await fetch(new URL("/api/me", request.url), {
    headers: { Cookie: request.headers.get("cookie") || "" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

// ตรวจรูปแบบวันที่ให้เป็น YYYY-MM-DD เท่านั้น
function isValidDateParam(s?: string | null) {
  if (!s) return true; // ไม่ส่งมา = ใช้วันนี้ได้
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// กำหนดช่วงวัน (เริ่ม/จบ) ตามเวลาไทย แล้วแปลงเป็น UTC สำหรับ query DB
function getBangkokDayRangeFromParam(dateParam?: string) {
  if (dateParam) {
    const startUtc = new Date(`${dateParam}T00:00:00.000+07:00`);
    const endUtc   = new Date(`${dateParam}T23:59:59.999+07:00`);
    return { startUtc, endUtc, dayStr: dateParam };
  }

  const nowTH = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = nowTH.getFullYear();
  const m = String(nowTH.getMonth() + 1).padStart(2, "0");
  const d = String(nowTH.getDate()).padStart(2, "0");
  const dayStr = `${y}-${m}-${d}`;

  const startUtc = new Date(`${dayStr}T00:00:00.000+07:00`);
  const endUtc   = new Date(`${dayStr}T23:59:59.999+07:00`);
  return { startUtc, endUtc, dayStr };
}

export async function GET(request: NextRequest) {
  try {
    // 1) ตรวจ session/role
    const me = await getMe(request);
    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (me.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 2) รับ/ตรวจพารามิเตอร์วันที่
    const url = new URL(request.url);
    const dateParamRaw = url.searchParams.get("date");
    if (!isValidDateParam(dateParamRaw)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // 3) คำนวณช่วงวันตามเวลาไทย
    const { startUtc, endUtc, dayStr } = getBangkokDayRangeFromParam(
      dateParamRaw || undefined
    );

    // 4) ดึงประวัติการล็อกอิน
    const dailyLogins = await prisma.loginHistory.findMany({
      where: { loginDate: { gte: startUtc, lte: endUtc } },
      include: {
        user: {
          select: { id: true, student_id: true, name: true, role: true },
        },
      },
      orderBy: { loginDate: "desc" },
    });

    // 5) หา unique users ของวันนั้น
    const uniqueUsers = await prisma.loginHistory.groupBy({
      by: ["userId"],
      where: { loginDate: { gte: startUtc, lte: endUtc } },
      _count: { userId: true },
    });

    // 6) เติมรายละเอียดผู้ใช้ (กันกรณี user ถูกลบ)
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueUsers.map((u) => u.userId) } },
      select: {
        id: true,
        student_id: true,
        name: true,
        role: true,
        lastLoginDate: true,
      },
    });

    const uniqueUsersWithDetails = uniqueUsers.map((u) => {
      const detail = users.find((x) => x.id === u.userId);
      return {
        id: u.userId,
        student_id: detail?.student_id ?? null,
        name: detail?.name ?? "(ไม่พบผู้ใช้)",
        role: detail?.role ?? "user",
        lastLoginDate: detail?.lastLoginDate ?? null,
        loginCount: u._count.userId,
      };
    });

    // 7) รวมสถิติ
    const stats = {
      totalLogins: dailyLogins.length,
      uniqueUsers: uniqueUsersWithDetails.length,
      adminLogins: dailyLogins.filter((l) => l.user?.role === "admin").length,
      userLogins: dailyLogins.filter((l) => l.user?.role === "user").length,
      date: dayStr,
    };

    // 8) ตอบกลับ
    return NextResponse.json({
      success: true,
      data: {
        stats,
        loginHistory: dailyLogins.map((l) => ({
          id: l.id,
          loginDate: l.loginDate,
          ipAddress: l.ipAddress,
          userAgent: l.userAgent,
          user: l.user,
        })),
        uniqueUsers: uniqueUsersWithDetails,
      },
    });
  } catch (err) {
    console.error("Daily logins API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}