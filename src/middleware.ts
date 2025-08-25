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
  /\.(png|jpe?g|gif|svg|ico|webp|avif|css|js|txt|json|woff2?)$/.test(p);

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

  // 3) อ่าน JWT claims ก่อน (เพื่อให้ admin bypass ได้จริง)
  const claims = await readClaims(request);
  if (!claims) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    const resp = NextResponse.redirect(url);
    resp.cookies.delete("token");
    return resp;
  }

  // 4) Admin bypass (ไม่ติด maintenance/working-hours)
  const isAdmin = claims?.role === "admin";
  if (!isAdmin) {
    // 5) บังคับ daily login (Bangkok)
    const today = bangkokYMD();
    const lastYMD: string | undefined =
      (claims.lastLoginYMD as string) ||
      (claims.lastLoginDate
        ? new Date(claims.lastLoginDate)
            .toLocaleString("en-CA", {
              timeZone: "Asia/Bangkok",
              hour12: false,
            })
            .slice(0, 10)
        : undefined);

    if (lastYMD !== today) {
      const url = new URL("/login", request.url);
      url.searchParams.set("from", pathname);
      const resp = NextResponse.redirect(url);
      resp.cookies.delete("token");
      return resp;
    }

    // 6) โหลดสถานะจาก DB ผ่าน API (ถูก exclude จาก matcher แล้ว จึงไม่วนซ้ำ)
    try {
      const origin = request.nextUrl.origin;
      const res = await fetch(`${origin}/api/maintenance-status`, {
        cache: "no-store",
        headers: {
          // ส่ง cookie ไปด้วยเผื่อ API ต้องการตรวจสิทธิ์
          Cookie: request.headers.get("cookie") ?? "",
          "x-from-middleware": "1",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const maintenance = data?.maintenance ?? data?.maintenanceMode ?? null;
        const workingHours = data?.workingHours ?? data?.working_hours ?? null;

        const maintenanceActive = Boolean(
          maintenance?.isActive ?? maintenance?.isEnabled
        );

        if (maintenanceActive) {
          const resp = NextResponse.redirect(
            new URL("/maintenance", request.url)
          );
          // เพื่อกัน state ค้าง ให้ลบ token ออกในช่วง maintenance
          resp.cookies.delete("token");
          return resp;
        }

        if (
          workingHours &&
          !withinHours(
            Number(workingHours.startHour ?? 0),
            Number(workingHours.endHour ?? 0),
            Boolean(workingHours.isEnabled)
          )
        ) {
          const url = new URL("/maintenance", request.url);
          url.searchParams.set("reason", "working_hours");
          url.searchParams.set("start", String(workingHours.startHour ?? 0));
          url.searchParams.set("end", String(workingHours.endHour ?? 0));
          return NextResponse.redirect(url);
        }
      } else {
        // ถ้า API ล่ม: fail-open (อนุญาตผ่าน) เพื่อไม่ล็อกผู้ใช้ทั้งหมด
        // หากอยาก fail-close ให้ redirect ไป /maintenance ตรงนี้แทน
      }
    } catch {
      // network/API error → fail-open
    }
  }

  // 7) ผ่านได้
  return NextResponse.next();
}

export const config = {
  matcher: [
    // ตัด /api ออกจาก middleware (กัน recursion) และคงไฟล์ static ไว้
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
  ],
};
