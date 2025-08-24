// helpers.ts (หรือวางไว้บนไฟล์ route เดิมก็ได้)
import type { Prisma } from "@/generated/prisma";

export const MAX_DAILY_SCORE = 30;

export function getBangkokDayRange(date = new Date()) {
  const th = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const y  = th.getFullYear();
  const m  = String(th.getMonth() + 1).padStart(2, "0");
  const d  = String(th.getDate()).padStart(2, "0");
  const dayStr = `${y}-${m}-${d}`;
  return {
    dayStr,
    startUtc: new Date(`${dayStr}T00:00:00.000+07:00`),
    endUtc:   new Date(`${dayStr}T23:59:59.999+07:00`),
  };
}

export async function getTodaysPoints(
  tx: Prisma.TransactionClient,
  userId: string,
  startUtc: Date,
  endUtc: Date
) {
  const [joinsToday, adjSum] = await Promise.all([
    tx.boothJoin.count({ where: { userId, joinedAt: { gte: startUtc, lt: endUtc } } }),
    tx.pointAdjustment.aggregate({
      _sum: { amount: true },
      where: { userId, appliedAt: { gte: startUtc, lt: endUtc } },
    }),
  ]);
  return joinsToday + (adjSum._sum.amount ?? 0);
}

/**
 * ปรับแต้มรายวัน (ผ่าน PointAdjustment) และเชื่อมกับ score พร้อมกันใน Tx
 * - เคารพเพดาน dailyPoints 0..MAX_DAILY_SCORE ด้วยการ clamp ปริมาณที่ใช้จริง
 * - คืน dailyPoints หลังปรับ และ score ปัจจุบัน
 */
export async function applyDailyAndScoreLinked(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    delta: number; // + เพิ่มแต้มรายวัน, - ลดแต้มรายวัน
    reason?: string;
    startUtc: Date;
    endUtc: Date;
  }
) {
  const { userId, delta, reason, startUtc, endUtc } = params;

  // แต้มวันนี้ก่อนปรับ
  const before = await getTodaysPoints(tx, userId, startUtc, endUtc);

  // คำนวณปริมาณที่ “อนุญาต” ให้ปรับจริง ๆ เพื่อไม่ให้หลุดช่วง 0..30
  let applied = delta;
  if (delta > 0) {
    applied = Math.min(delta, MAX_DAILY_SCORE - before);
  } else if (delta < 0) {
    applied = -Math.min(-delta, before);
  }
  // ไม่เหลือช่องให้ปรับ
  if (applied === 0) {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { score: true } });
    return { dailyPoints: before, totalScore: u?.score ?? 0, applied: 0 };
  }

  // บันทึก PointAdjustment (รายวัน) และอัปเดต score ด้วยปริมาณเดียวกัน
  await tx.pointAdjustment.create({
    data: { userId, amount: applied, reason: reason ?? "ADJUST_DAILY", appliedAt: new Date() },
  });

  const user = await tx.user.update({
    where: { id: userId },
    data: { score: { increment: applied } },
    select: { score: true },
  });

  const after = before + applied;
  return { dailyPoints: after, totalScore: user.score, applied };
}
