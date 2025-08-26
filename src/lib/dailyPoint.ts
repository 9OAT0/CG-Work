// src/lib/dailyPoint.ts
import type { PrismaClient, Prisma } from "@/generated/prisma";

type Tx = PrismaClient | Prisma.TransactionClient;

/** YYYY-MM-DD ของ “วันนี้ (เวลาไทย)” */
export function thaiDayKey(d = new Date()) {
  const th = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const dd = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** สร้าง/คงเอกสาร DailyPoints ของวันนั้นไว้ */
export async function ensureDailyDoc(tx: Tx, userId: string, dayKey = thaiDayKey()) {
  await (tx as PrismaClient).dailyPoints.upsert({
    where: { userId_dayKey: { userId, dayKey } },
    create: { userId, dayKey, earned: 0, adjusted: 0, spent: 0, net: 0 },
    update: {},
  });
}

/** +เพิ่มแต้ม “ที่ได้วันนี้” แล้วคำนวณ net = earned + adjusted - spent (ไม่ติดลบ) */
export async function incDailyEarned(tx: Tx, userId: string, inc = 1) {
  const dayKey = thaiDayKey();
  await ensureDailyDoc(tx, userId, dayKey);

  await (tx as PrismaClient).dailyPoints.update({
    where: { userId_dayKey: { userId, dayKey } },
    data: { earned: { increment: inc } },
  });

  const doc = await (tx as PrismaClient).dailyPoints.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
    select: { earned: true, adjusted: true, spent: true },
  });

  const net = Math.max(0, (doc?.earned ?? 0) + (doc?.adjusted ?? 0) - (doc?.spent ?? 0));
  await (tx as PrismaClient).dailyPoints.update({
    where: { userId_dayKey: { userId, dayKey } },
    data: { net },
  });

  return { dayKey, net };
}