// app/api/maintenance-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";

export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(_request: NextRequest) {
  try {
    // ใช้ updatedAt เพื่อให้ได้เรคอร์ดล่าสุดจริง ๆ
    const [m, w] = await Promise.all([
      prisma.maintenanceMode.findFirst({ orderBy: { updatedAt: "desc" } }),
      prisma.workingHours.findFirst({ orderBy: { updatedAt: "desc" } }),
    ]);

    // คำนวณสถานะกำลัง Maintenance ตามช่วงเวลา
    const now = new Date();
    const inWindow =
      (!!m?.startTime &&
        !!m?.endTime &&
        now >= m.startTime &&
        now <= m.endTime) ||
      (!!m?.startTime && !m?.endTime && now >= m.startTime) ||
      (!m?.startTime && !!m?.endTime && now <= m.endTime);

    const maintenance = {
      isEnabled: m?.isEnabled ?? false,
      title: m?.title ?? "ระบบอยู่ในช่วงปรับปรุง",
      message:
        m?.message ?? "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง",
      startTime: m?.startTime ? m.startTime.toISOString() : null,
      endTime: m?.endTime ? m.endTime.toISOString() : null,
      // ใช้ isActive ในฝั่ง FE เพื่อตัดสินใจแสดงผล
      isActive: Boolean(m?.isEnabled) || inWindow,
    };

    const workingHours = {
      startHour: w?.startHour ?? 6,
      endHour: w?.endHour ?? 16,
      isEnabled: w?.isEnabled ?? true,
    };

    return NextResponse.json(
      { maintenance, workingHours },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Error fetching maintenance status:", error);
    return NextResponse.json(
      {
        maintenance: {
          isEnabled: false,
          title: "ระบบอยู่ในช่วงปรับปรุง",
          message: "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง",
          startTime: null,
          endTime: null,
          isActive: false,
        },
        workingHours: { startHour: 6, endHour: 16, isEnabled: true },
      },
      { status: 500 }
    );
  }
}
