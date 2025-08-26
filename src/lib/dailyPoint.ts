// src/lib/dailyPoint.ts
import { PrismaClient, Prisma } from "@/generated/prisma";

type Tx = Prisma.TransactionClient;

/** dayKey ของ “วันนี้ (เวลาไทย)” -> 'YYYY-MM-DD' */
export function thaiDayKey(d = new Date()) {
  const th = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const dd = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** สร้าง/รับรองเอกสาร DailyPoints ของวันนั้น (ค่าเริ่มต้น 0) */
export async function ensureDailyDoc(tx: Tx, userId: string, dayKey = thaiDayKey()) {
  await tx.dailyPoints.upsert({
    where: { userId_dayKey: { userId, dayKey } },
    create: { userId, dayKey, earned: 0, spent: 0, adjusted: 0, net: 0 },
    update: {},
  });
}

/** คำนวณ net = earned + adjusted - spent (ไม่ติดลบ) */
async function recomputeNet(tx: Tx, userId: string, dayKey: string) {
  const doc = await tx.dailyPoints.findUnique({
    where: { userId_dayKey: { userId, dayKey } },
    select: { earned: true, adjusted: true, spent: true },
  });
  const net = Math.max(0, (doc?.earned ?? 0) + (doc?.adjusted ?? 0) - (doc?.spent ?? 0));
  await tx.dailyPoints.update({
    where: { userId_dayKey: { userId, dayKey } },
    data: { net },
  });
  return net;
}

/** +เพิ่มแต้ม “ที่ได้วันนี้” (เช่น join booth) */
export async function incDailyEarned(tx: Tx, userId: string, inc = 1) {
  const dayKey = thaiDayKey();
  await ensureDailyDoc(tx, userId, dayKey);
  await tx.dailyPoints.update({
    where: { userId_dayKey: { userId, dayKey } },
    data: { earned: { increment: inc } },
  });
  const net = await recomputeNet(tx, userId, dayKey);
  return { dayKey, net };
}

/** +เพิ่มแต้ม “ที่ใช้วันนี้” (เช่น redeem/หักจากแต้มของวันนั้นก่อน) */
export async function incDailySpent(tx: Tx, userId: string, inc = 1) {
  const dayKey = thaiDayKey();
  await ensureDailyDoc(tx, userId, dayKey);
  await tx.dailyPoints.update({
    where: { userId_dayKey: { userId, dayKey } },
    data: { spent: { increment: inc } },
  });
  const net = await recomputeNet(tx, userId, dayKey);
  return { dayKey, net };
}

/** ปรับแต้มพิเศษของวันนี้ (+/-) เช่น โบนัส/ปรับแก้ */
export async function incDailyAdjusted(tx: Tx, userId: string, inc = 0) {
  const dayKey = thaiDayKey();
  await ensureDailyDoc(tx, userId, dayKey);
  if (inc !== 0) {
    await tx.dailyPoints.update({
      where: { userId_dayKey: { userId, dayKey } },
      data: { adjusted: { increment: inc } },
    });
  }
  const net = await recomputeNet(tx, userId, dayKey);
  return { dayKey, net };
}