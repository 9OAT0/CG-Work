import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");

export function signBoothJoinToken(boothId: string, ttlMinutes = 120) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlMinutes * 60;
  // purpose ช่วยจำกัดการใช้งาน token ให้เฉพาะ join_booth
  return jwt.sign({ purpose: "join_booth", boothId, iat: now, exp }, JWT_SECRET);
}

export function parseQRTextToToken(text: string): string | null {
  // รูปแบบ QR: "BBJOIN:<jwt>"
  return text?.startsWith("BBJOIN:") ? text.slice(7) : null;
}
