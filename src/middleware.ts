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

const RAW_SECRET = process.env.JWT_SECRET;
const JWT_SECRET = RAW_SECRET ? new TextEncoder().encode(RAW_SECRET) : null;

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
): Promise<Record<string, any> | null> {
  try {
    if (!JWT_SECRET) return null; // ไม่มี secret → ข้าม verify
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as Record<string, any>;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // ✅ เข้าหน้า /login หรือ /register เคลียร์ token ทันที
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      const resp = NextResponse.next();
      resp.cookies.delete("token");
      return resp;
    }

    // ผ่านเลยสำหรับ static และ api
    if (pathname.startsWith("/api") || isStaticAsset(pathname)) {
      return NextResponse.next();
    }

    // public pages อื่น ๆ
    if (PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    // ไม่ใช่เส้นทางที่ป้องกัน → ผ่าน
    const needsProtection = PROTECTED_PREFIXES.some((p) =>
      pathname.startsWith(p)
    );
    if (!needsProtection) return NextResponse.next();

    // อ่าน JWT (ไม่ล้มถ้า SECRET ไม่มี/ไม่ถูกต้อง)
    const claims = await readClaims(request);
    if (!claims) {
      const url = new URL("/login", request.url);
      url.searchParams.set("from", pathname);
      const resp = NextResponse.redirect(url);
      resp.cookies.delete("token");
      return resp;
    }

    // admin bypass
    const isAdmin = claims?.role === "admin";
    if (!isAdmin) {
      // บังคับ daily login
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
        url.searchParams.set("forced", "daily");
        const resp = NextResponse.redirect(url);
        resp.cookies.delete("token");
        return resp;
      }

      // โหลดสถานะจาก DB ผ่าน API (fail-open)
      try {
        const apiUrl = new URL("/api/maintenance-status", request.url);
        const res = await fetch(apiUrl, {
          cache: "no-store",
          headers: {
            Cookie: request.headers.get("cookie") ?? "",
            "x-from-middleware": "1",
          },
        });

        if (res.ok) {
          const data = await res.json().catch(() => null);
          const maintenance =
            data?.maintenance ?? data?.maintenanceMode ?? null;
          const workingHours =
            data?.workingHours ?? data?.working_hours ?? null;

          const maintenanceActive = Boolean(
            maintenance?.isActive ?? maintenance?.isEnabled
          );
          if (maintenanceActive) {
            const url = new URL("/maintenance", request.url);
            url.searchParams.set("forced", "maintenance");
            const resp = NextResponse.redirect(url);
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
            // ถ้าต้องการบังคับออกตอนนอกเวลาให้บริการด้วย ให้ใช้ 3 บรรทัดล่างแทน:
            // const resp = NextResponse.redirect(url);
            // resp.cookies.delete("token");
            // return resp;
            return NextResponse.redirect(url);
          }
        }
        // res !ok → ปล่อยผ่าน (fail-open)
      } catch {
        // fetch error → ปล่อยผ่าน (fail-open)
      }
    }

    return NextResponse.next();
  } catch (err) {
    // กัน middleware พังทั้งก้อน
    console.error("Middleware fatal:", err);
    // fail-open: ให้ผู้ใช้ผ่านไป แทนการล่มทั้งไซต์
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // ตัด /api ออกจาก middleware (กัน recursion) และคงไฟล์ static ไว้
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
  ],
};
