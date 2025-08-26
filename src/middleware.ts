import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/", "/login", "/register", "/maintenance"]; // ✅ อนุญาต maintenance
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

// สวิตช์ผ่าน ENV
const FORCE_DAILY_RELOGIN =
  (process.env.FORCE_DAILY_RELOGIN ?? "true") !== "false";
const FORCE_LOGOUT_ON_MAINTENANCE =
  (process.env.FORCE_LOGOUT_ON_MAINTENANCE ?? "true") !== "false";
const FORCE_LOGOUT_OUT_OF_HOURS =
  (process.env.FORCE_LOGOUT_OUT_OF_HOURS ?? "true") !== "false";

function bangkokYMD() {
  const th = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const y = th.getFullYear();
  const m = String(th.getMonth() + 1).padStart(2, "0");
  const d = String(th.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function toBangkokYMD(d: Date) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }))
    .toLocaleString("en-CA", { timeZone: "Asia/Bangkok", hour12: false })
    .slice(0, 10);
}

function withinHours(startHour: number, endHour: number, enabled: boolean) {
  if (!enabled) return true;
  const th = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const h = th.getHours();
  return h >= startHour && h < endHour;
}

async function readClaims(
  req: NextRequest
): Promise<Record<string, any> | null> {
  try {
    if (!JWT_SECRET) return null;
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

    // เข้า /login หรือ /register → เคลียร์ token กัน state ค้าง
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      const resp = NextResponse.next();
      resp.cookies.delete("token");
      return resp;
    }

    // ข้าม static และ /api
    if (pathname.startsWith("/api") || isStaticAsset(pathname)) {
      return NextResponse.next();
    }

    // หน้า public
    if (PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    // ต้องป้องกัน?
    const needsProtection = PROTECTED_PREFIXES.some((p) =>
      pathname.startsWith(p)
    );
    if (!needsProtection) return NextResponse.next();

    // อ่าน JWT
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
      // ----- DAILY LOGIN -----
      if (FORCE_DAILY_RELOGIN) {
        const today = bangkokYMD();

        const iatYMD =
          typeof claims.iat === "number"
            ? toBangkokYMD(new Date(claims.iat * 1000))
            : undefined;
        const claimedLastDate =
          typeof claims.lastLoginDate === "number"
            ? new Date(claims.lastLoginDate)
            : typeof claims.lastLoginDate === "string"
            ? new Date(claims.lastLoginDate)
            : undefined;

        const lastYMD: string | undefined =
          (claims.lastLoginYMD as string) ||
          (claimedLastDate ? toBangkokYMD(claimedLastDate) : undefined) ||
          iatYMD;

        if (lastYMD !== today) {
          const url = new URL("/login", request.url);
          url.searchParams.set("from", pathname);
          url.searchParams.set("forced", "daily");
          const resp = NextResponse.redirect(url);
          resp.cookies.delete("token");
          return resp;
        }
      }

      // ----- Maintenance / Working hours จาก API (fail-open ถ้า API ล่ม) -----
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
            // ✅ เปลี่ยนไป /maintenance เพื่อไม่วนลูปกับ /login
            const url = new URL("/maintenance", request.url);
            url.searchParams.set("reason", "maintenance");
            const resp = NextResponse.redirect(url);
            if (FORCE_LOGOUT_ON_MAINTENANCE) resp.cookies.delete("token");
            return resp;
          }

          if (workingHours) {
            const start = Number(workingHours.startHour ?? 0);
            const end = Number(workingHours.endHour ?? 0);
            const enabled = Boolean(workingHours.isEnabled);
            const ok = withinHours(start, end, enabled);
            if (!ok) {
              // ✅ เปลี่ยนไป /maintenance พร้อมพารามิเตอร์
              const url = new URL("/maintenance", request.url);
              url.searchParams.set("reason", "working_hours");
              url.searchParams.set("start", String(start));
              url.searchParams.set("end", String(end));
              const resp = NextResponse.redirect(url);
              if (FORCE_LOGOUT_OUT_OF_HOURS) resp.cookies.delete("token");
              return resp;
            }
          }
        }
        // res !ok → fail-open
      } catch {
        // fetch error → fail-open
      }
    }

    return NextResponse.next();
  } catch (err) {
    console.error("Middleware fatal:", err);
    return NextResponse.next(); // fail-open
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
  ],
};
