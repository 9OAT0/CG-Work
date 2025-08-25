// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/", "/login", "/register", "/maintenance"];
const PROTECTED_PREFIXES = [
  "/homepage",
  "/profile",
  "/transferpoint",
  "/dashboard",
  "/admin",
];

const isStaticAsset = (p: string) =>
  p.startsWith("/_next") ||
  p.startsWith("/favicon") ||
  /\.(png|jpe?g|gif|svg|ico|webp|avif|css|js|txt|json)$/.test(p);

const JWT_SECRET = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

function bangkokYMD() {
  const th = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function withinHours(startHour: number, endHour: number, enabled: boolean) {
  if (!enabled) return true;
  const now = new Date();
  const th = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const h = th.getHours();
  return h >= startHour && h < endHour;
}

async function readClaims(
  req: NextRequest
): Promise<null | Record<string, any>> {
  const token = req.cookies.get("token")?.value;
  if (!token || !JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as Record<string, any>;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) ผ่านเลยสำหรับ static, public, และหน้า api
  if (
    pathname.startsWith("/api") ||
    isStaticAsset(pathname) ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // 2) ไม่ใช่เส้นทางที่ป้องกัน → ผ่าน
  const needsProtection = PROTECTED_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  if (!needsProtection) return NextResponse.next();

  // 3) Maintenance จาก ENV (หรือสลับไปใช้ Vercel Edge Config ก็ได้)
  const MAINTENANCE_ENABLED = process.env.MAINTENANCE_ENABLED === "true";
  if (MAINTENANCE_ENABLED) {
    const resp = NextResponse.redirect(new URL("/maintenance", request.url));
    resp.cookies.delete("token");
    return resp;
  }

  // 4) อ่าน JWT claims ตรง ๆ (ไม่ fetch)
  const claims = await readClaims(request);
  const isAdmin = claims?.role === "admin";
  if (isAdmin) return NextResponse.next();

  if (!claims) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete("token");
    return resp;
  }

  // 5) บังคับ daily login จาก claim (แนะนำให้ฝัง lastLoginYMD ลง JWT ตอน login)
  const today = bangkokYMD();
  const lastYMD: string | undefined =
    (claims.lastLoginYMD as string) ||
    (claims.lastLoginDate
      ? new Date(claims.lastLoginDate)
          .toLocaleString("en-CA", { timeZone: "Asia/Bangkok", hour12: false })
          .slice(0, 10)
      : undefined);

  if (lastYMD !== today) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete("token");
    return resp;
  }

  // 6) Working hours จาก ENV (ลดการ fetch)
  const HOURS_ENABLED =
    (process.env.WORKING_HOURS_ENABLED ?? "true") !== "false";
  const START_HOUR = Number(process.env.WORKING_HOURS_START ?? 6);
  const END_HOUR = Number(process.env.WORKING_HOURS_END ?? 16);

  if (!withinHours(START_HOUR, END_HOUR, HOURS_ENABLED)) {
    const url = new URL("/maintenance", request.url);
    url.searchParams.set("reason", "working_hours");
    url.searchParams.set("start", START_HOUR.toString());
    url.searchParams.set("end", END_HOUR.toString());
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // ตัด /api ออกจาก middleware ไปเลย
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|maintenance).*)",
  ],
};
