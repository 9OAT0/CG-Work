// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---- ตั้งค่าหน้า/เส้นทางที่ไม่ต้องตรวจอะไรเลย ----
const PUBLIC_PATHS = [
  "/",            // หน้าแรก ต้องเข้าถึงได้เสมอ
  "/login",
  "/register",
  "/maintenance",
];

const isStaticAsset = (p: string) =>
  p.startsWith("/_next") ||
  p.startsWith("/favicon") ||
  p.endsWith(".png") ||
  p.endsWith(".jpg") ||
  p.endsWith(".jpeg") ||
  p.endsWith(".gif") ||
  p.endsWith(".svg") ||
  p.endsWith(".ico") ||
  p.endsWith(".webp") ||
  p.endsWith(".avif") ||
  p.endsWith(".css") ||
  p.endsWith(".js") ||
  p.endsWith(".txt") ||
  p.endsWith(".json");

// ---- เส้นทางที่ต้องล็อกอิน/ผ่านเงื่อนไขต่าง ๆ ----
const PROTECTED_PREFIXES = [
  "/homepage",
  "/profile",
  "/transferpoint",
  "/dashboard",
  "/admin", // ถ้าต้องการกันเฉพาะ admin ให้เช็ค role เพิ่มด้านล่าง
];

// ---------- Helpers ----------
function isWithinAllowedTime(
  startHour: number,
  endHour: number,
  isEnabled: boolean
): boolean {
  if (!isEnabled) return true;
  const now = new Date();
  const thailandTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const h = thailandTime.getHours();
  return h >= startHour && h < endHour;
}

async function fetchMe(request: NextRequest): Promise<{
  ok: boolean;
  role?: string;
  username?: string;
  lastLoginDate?: string;
}> {
  try {
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/me`, {
      headers: { Cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, role: data.role, username: data.username, lastLoginDate: data.lastLoginDate };
  } catch {
    return { ok: false };
  }
}

async function getWorkingHours(request: NextRequest): Promise<{
  startHour: number;
  endHour: number;
  isEnabled: boolean;
}> {
  try {
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/admin/working-hours`, {
      headers: { Cookie: request.headers.get("cookie") || "" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data) return data.data;
    }
  } catch {}
  return { startHour: 6, endHour: 16, isEnabled: true };
}

async function getMaintenanceMode(request: NextRequest): Promise<{
  isEnabled: boolean;
  title: string;
  message: string;
  startTime?: string;
  endTime?: string;
}> {
  try {
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/maintenance-status`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.maintenanceMode) return data.maintenanceMode;
    }
  } catch {}
  return {
    isEnabled: false,
    title: "ระบบอยู่ในช่วงปรับปรุง",
    message: "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง",
  };
}

async function forceLogoutUser(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) return;
    const baseUrl = request.nextUrl.origin;
    await fetch(`${baseUrl}/api/maintenance/force-logout`, {
      method: "POST",
      headers: {
        Cookie: request.headers.get("cookie") || "",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch {}
}

// ---------- Middleware ----------
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) ข้าม API/ไฟล์ static/หน้า public
  if (pathname.startsWith("/api") || isStaticAsset(pathname) || PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 2) โหลดข้อมูลผู้ใช้ครั้งเดียว
  const me = await fetchMe(request);
  const isAdmin = me.ok && me.role === "admin";

  // 3) ถ้าเป็น admin → ผ่านทุกอย่าง
  if (isAdmin) return NextResponse.next();

  // 4) Maintenance check (ยกเว้นหน้า /maintenance ซึ่งเรา exclude ไปแล้ว)
  const maintenance = await getMaintenanceMode(request);
  if (maintenance.isEnabled) {
    const resp = NextResponse.redirect(new URL("/maintenance", request.url));
    resp.cookies.delete("token");
    await forceLogoutUser(request);
    return resp;
  }

  // 5) ถ้าไม่ใช่เส้นทางที่ป้องกัน → ให้ผ่าน (เช่น หน้า landing, about ฯลฯ)
  const needsProtection = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsProtection) {
    return NextResponse.next();
  }

  // 6) บังคับ daily login เฉพาะเส้นทางที่ป้องกัน
  let hasValidDailyLogin = false;
  if (me.ok && me.lastLoginDate) {
    const last = new Date(me.lastLoginDate).toDateString();
    const today = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
    ).toDateString();
    hasValidDailyLogin = last === today;
  }
  if (!hasValidDailyLogin) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete("token");
    return resp;
  }

  // 7) Working hours เฉพาะเส้นทางที่ป้องกัน
  const working = await getWorkingHours(request);
  if (!isWithinAllowedTime(working.startHour, working.endHour, working.isEnabled)) {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // จับทุกอย่างยกเว้น static/ภาพ/ไอคอน/maintenance (กัน loop)
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|maintenance).*)",
  ],
};