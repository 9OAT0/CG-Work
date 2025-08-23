import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { verify as verifyJwt } from "jsonwebtoken";
import { getThailandTime } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;
const QR_JWT_SECRET = process.env.QR_JWT_SECRET || JWT_SECRET;

type QrPayload = {
  code?: string; // mapping ไป QrCode.code
  codeId?: string; // หรือใช้ id โดยตรง
  overrideCost?: number;
  jti?: string;
  exp?: number;
};

// คำนวณช่วงวันไทย (UTC+7) สำหรับกฎ ONCE_PER_DAY
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
    // 1) Auth ผู้ใช้
    const token = req.cookies.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded: any = verifyJwt(token, JWT_SECRET);
    const userId: string = decoded.id;

    // 2) รับ qr string
    const body = await req.json().catch(() => ({}));
    const qr: unknown = body?.qr;
    if (typeof qr !== "string" || !qr) {
      return NextResponse.json(
        { error: 'ต้องส่งฟิลด์ "qr" เป็น string' },
        { status: 400 }
      );
    }

    // 3) ตรวจว่ามาเป็น JWT หรือสตริงธรรมดา
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

    // 4) ดึง QrCode + Booth
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

    // 5) กำหนด cost
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

    // 6) ตรวจ rule (กันแลกซ้ำก่อนหักคะแนน)
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

    // 7) ธุรกรรม: หักคะแนน → อัปเดต uses → ออกสิทธิ์ → log (flow จบที่ออกสิทธิ์)
    const result = await prisma.$transaction(async (tx) => {
      // 7.1) หักคะแนนแบบป้องกันแข่งกันกด
      const dec = await tx.user.updateMany({
        where: { id: userId, score: { gte: cost } },
        data: { score: { decrement: cost } },
      });
      if (dec.count !== 1) throw new Error("INSUFFICIENT_POINTS");

      // 7.2) เพิ่ม uses ของ QR (เคารพ maxUses)
      if (qrCode.maxUses != null) {
        const upd = await tx.qrCode.updateMany({
          where: { id: qrCode.id, uses: { lt: qrCode.maxUses } },
          data: { uses: { increment: 1 }, updatedAt: nowTH },
        });
        if (upd.count !== 1) {
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

      // 7.3) ออกสิทธิ์ (นี่คือ “จุดจบของกระบวนการ”)
      const pass = await tx.playPass.create({
        data: {
          userId,
          boothId: qrCode.boothId,
          qrCodeId: qrCode.id,
          entitlementKey: qrCode.entitlementKey,
          issuedAt: nowTH,
        },
      });

      // 7.4) Log
      await tx.qrScanLog.create({
        data: { userId, qrCodeId: qrCode.id, scannedAt: nowTH },
      });

      // 7.5) คะแนนคงเหลือ
      const updatedUser = await tx.user.findUnique({ where: { id: userId } });

      return { passId: pass.id, remaining: updatedUser?.score ?? null };
    });

    return NextResponse.json({
      message: `แลกสิทธิ์สำเร็จ หัก ${cost} คะแนน`,
      booth: { id: qrCode.boothId, name: qrCode.booth.booth_name },
      entitlementKey: qrCode.entitlementKey,
      playPassId: result.passId, // ใช้โชว์หรือเก็บใน client
      remainingScore: result.remaining,
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
