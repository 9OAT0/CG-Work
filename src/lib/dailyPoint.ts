import type { Prisma, PrismaClient } from "@/generated/prisma";
import { getBangkokDay } from "./getBangkokDay";

export async function incDailyEarned(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  amount: number
) {
  const { dayKey } = getBangkokDay();
  await (tx as any).dailyPoints.upsert({
    where: { userId_dayKey: { userId, dayKey } },
    create: { userId, dayKey, earned: amount, net: amount },
    update: { earned: { increment: amount }, net: { increment: amount } },
  });
}

export async function incDailySpent(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  amount: number
) {
  const { dayKey } = getBangkokDay();
  await (tx as any).dailyPoints.upsert({
    where: { userId_dayKey: { userId, dayKey } },
    create: { userId, dayKey, spent: amount, net: -amount },
    update: { spent: { increment: amount }, net: { decrement: amount } },
  });
}

export async function incDailyAdjusted(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  amount: number
) {
  const { dayKey } = getBangkokDay();
  await (tx as any).dailyPoints.upsert({
    where: { userId_dayKey: { userId, dayKey } },
    create: { userId, dayKey, adjusted: amount, net: amount },
    update: { adjusted: { increment: amount }, net: { increment: amount } },
  });
}
