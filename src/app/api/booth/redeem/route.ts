// app/api/qr/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { verify as verifyJwt } from "jsonwebtoken";
import { getThailandTime } from "@/lib/time";
import { getBangkokDay } from "@/lib/getBangkokDay";
import { incDailySpent } from "@/lib/dailyPoint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;
const QR_JWT_SECRET = process.env.QR_JWT_SECRET || JWT_SECRET;

type QrPayload = {
  code?: string;
  codeId?: string;
  overrideCost?: number;
  jti?: string;
  exp?: number;
};

function thailandDayRange(date: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const thOffsetMs = 7 * 60 * 60 * 1000;
  const t = date.getTime();
  const startUtcMs =
    Math.floor((t + thOffsetMs) / msPerDay) * msPerDay - thOffsetMs;
  const endUtcMs = startUtcMs + msPerDay - 1;
  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

export async function POST(req: NextRequest) {
  try {
    // 1) Auth
    const token = req.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded: any = verifyJwt(token, JWT_SECRET);
    const userId: string = decoded.id;

    // 2) body.qr
    const body = await req.json().catch(() => ({}));
    const qr: unknown = body?.qr;
    if (typeof qr !== "string" || !qr) {
      return NextResponse.json(
        { error: 'ต้องส่งฟิลด์ "qr" เป็น string' },
        { status: 400 }
      );
    }

    // 3) decode QR (JWT หรือสตริง)
    let qrFromToken: QrPayload | null = null;
    const looksLikeJwt = qr.split(".").length === 3;
    if (looksLikeJwt) {
      try {
        qrFromToken = verifyJwt(qr, QR_JWT_SECRET) as QrPayload;
      } catch {
        return NextResponse.json(
          { error: "QR token ไม่ถูกต้อง" },
          { status: 400 }
        );
      }
    }

    // 4) โหลด QrCode + Booth
    const qrCode = await prisma.qrCode.findFirst({
      where: qrFromToken?.codeId
        ? { id: qrFromToken.codeId }
        : qrFromToken?.code
        ? { code: qrFromToken.code }
        : { code: qr },
      include: { booth: true },
    });
    if (!qrCode)
      return NextResponse.json({ error: "ไม่พบ QR code" }, { status: 404 });
    if (!qrCode.active)
      return NextResponse.json(
        { error: "QR code ถูกปิดใช้งาน" },
        { status: 400 }
      );
    if (qrCode.expiresAt && qrCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "QR code หมดอายุแล้ว" },
        { status: 400 }
      );
    }

    // 5) cost
    const cost =
      Number.isInteger(qrFromToken?.overrideCost) &&
      (qrFromToken!.overrideCost as number) > 0
        ? (qrFromToken!.overrideCost as number)
        : qrCode.cost;
    if (!Number.isInteger(cost) || cost <= 0) {
      return NextResponse.json(
        { error: "ค่า cost ของ QR ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // 6) rule
    const nowTH = getThailandTime();
    const { start, end } = thailandDayRange(nowTH);
    if (qrCode.rule !== "UNLIMITED") {
      const whereBase = {
        userId,
        entitlementKey: qrCode.entitlementKey,
      } as const;
      const duplicate = await prisma.playPass.findFirst({
        where:
          qrCode.rule === "ONCE_PER_EVENT"
            ? whereBase
            : { ...whereBase, issuedAt: { gte: start, lte: end } },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error:
              qrCode.rule === "ONCE_PER_EVENT"
                ? "คุณแลกสิทธิ์นี้ไปแล้วในงานนี้"
                : "คุณแลกสิทธิ์นี้ไปแล้วสำหรับวันนี้",
          },
          { status: 400 }
        );
      }
    }

    // 7) ธุรกรรม: ใช้แต้ม "ก่อนวัน" ก่อน → ถ้าไม่พอค่อยใช้ "วันนี้"
    const result = await prisma.$transaction(async (tx) => {
      const { dayKey } = getBangkokDay();

      // 7.0) คะแนนรวมปัจจุบัน + คะแนนวันนี้ (จาก DailyPoints)
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { score: true },
      });
      const currentScore = u?.score ?? 0;
      if (currentScore < cost) throw new Error("INSUFFICIENT_POINTS");

      const dp = await tx.dailyPoints.findUnique({
        where: { userId_dayKey: { userId, dayKey } },
        select: { net: true },
      });
      const todayPoints = Math.max(0, dp?.net ?? 0);
      const previousBalance = Math.max(0, currentScore - todayPoints);

      // ✅ ใช้ก่อนวันก่อน จากนั้นค่อยกินของวันนี้
      const useFromPrev = Math.min(cost, previousBalance);
      const useFromToday = cost - useFromPrev;

      // 7.1) ตัดคะแนนรวม (atomic)
      const dec = await tx.user.updateMany({
        where: { id: userId, score: { gte: cost } },
        data: { score: { decrement: cost } },
      });
      if (dec.count !== 1) throw new Error("INSUFFICIENT_POINTS");

      // 7.2) อัปเดต uses ของ QR (เคารพ maxUses)
      if (qrCode.maxUses != null) {
        const upd = await tx.qrCode.updateMany({
          where: { id: qrCode.id, uses: { lt: qrCode.maxUses } },
          data: { uses: { increment: 1 }, updatedAt: nowTH },
        });
        if (upd.count !== 1) {
          // rollback ภายใน tx
          await tx.user.update({
            where: { id: userId },
            data: { score: { increment: cost } },
          });
          throw new Error("QR_EXHAUSTED");
        }
      } else {
        await tx.qrCode.update({
          where: { id: qrCode.id },
          data: { uses: { increment: 1 }, updatedAt: nowTH },
        });
      }

      // 7.3) ถ้ามีการใช้ “ของวันนี้” ให้บันทึก DailyPoints.spent (ลด net ของวันนี้)
      if (useFromToday > 0) {
        await incDailySpent(tx, userId, useFromToday);

        // NOTE: ถ้าระบบเก่าของคุณยังอ้างอิง PointAdjustment เพื่อแสดงผล
        // และต้องการเห็นผลลด dailyPoints เช่นกัน ให้เปิดคอมเมนต์ด้านล่าง
        // await tx.pointAdjustment.create({
        //   data: { userId, amount: -useFromToday, reason: "QR_REDEEM", appliedAt: nowTH },
        // });
      }

      // 7.4) ออกสิทธิ์
      const pass = await tx.playPass.create({
        data: {
          userId,
          boothId: qrCode.boothId,
          qrCodeId: qrCode.id,
          entitlementKey: qrCode.entitlementKey,
          issuedAt: nowTH,
        },
      });

      // 7.5) Log
      await tx.qrScanLog.create({
        data: { userId, qrCodeId: qrCode.id, scannedAt: nowTH },
      });

      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { score: true },
      });

      return {
        passId: pass.id,
        remaining: updatedUser?.score ?? null,
        breakdown: {
          useFromPrev,
          useFromToday,
          todayPointsBefore: todayPoints,
        },
      };
    });

    return NextResponse.json({
      message:
        result.breakdown.useFromToday > 0
          ? `แลกสิทธิ์สำเร็จ หัก ${cost} คะแนน (ก่อนวัน ${result.breakdown.useFromPrev} + วันนี้ ${result.breakdown.useFromToday})`
          : `แลกสิทธิ์สำเร็จ หัก ${cost} คะแนน (หักจากแต้มก่อนวันทั้งหมด)`,
      booth: { id: qrCode.boothId, name: qrCode.booth.booth_name },
      entitlementKey: qrCode.entitlementKey,
      playPassId: result.passId,
      remainingScore: result.remaining,
      deduction: result.breakdown,
    });
  } catch (err: any) {
    console.error(err);
    const map: Record<string, [number, string]> = {
      INSUFFICIENT_POINTS: [400, "คะแนนไม่เพียงพอ"],
      QR_EXHAUSTED: [400, "QR code ถูกใช้ครบจำนวนแล้ว"],
    };
    const key = typeof err?.message === "string" ? err.message : "";
    if (key && map[key]) {
      const [status, message] = map[key];
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
