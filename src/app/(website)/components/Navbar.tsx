"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

/* ---------- Dedupe & Cache /api/me (module-scope) ---------- */
type MeResponse = { role?: string } | { user?: { role?: string } } | null;

let meCache: MeResponse | undefined; // undefined = ยังไม่โหลด, null = ไม่มีข้อมูล
let inflight: Promise<MeResponse> | null = null;

async function fetchMeOnce(): Promise<MeResponse> {
  if (meCache !== undefined) return meCache;
  if (inflight) return inflight;

  inflight = fetch("/api/me", {
    credentials: "include",
    cache: "no-store",
  })
    .then(async (res) => {
      if (!res.ok) return null; // 401/500 → ไม่มีข้อมูล
      const data = (await res.json().catch(() => null)) as MeResponse;
      return data ?? null;
    })
    .finally(() => {
      inflight = null;
    })
    .then((val) => {
      meCache = val;
      return val;
    });

  return inflight;
}
/* ---------------------------------------------------------- */

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const didInitRef = useRef(false);

  const router = useRouter();
  const pathname = usePathname();

  const toggleMenu = () => setMenuOpen((v) => !v);

  // ✅ โหลด /api/me ครั้งเดียวทั่วแอป (กันยิงซ้ำ/กันลูป)
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    let mounted = true;
    fetchMeOnce().then((data) => {
      if (!mounted) return;
      const role =
        (data && "user" in (data as any) ? (data as any).user?.role : (data as any)?.role) ?? null;
      setUserRole(role);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ ปิดเมนูเมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ ปิดเมนูเมื่อเปลี่ยนเส้นทาง
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // ✅ ปิดเมนูเมื่อกด ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ✅ Logout (เคลียร์คุกกี้ด้วย credentials)
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        // รีเซ็ต cache เพื่อให้รีเฟรชชื่อผู้ใช้รอบถัดไป (ถ้าจำเป็น)
        meCache = undefined;
        router.push("/");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // helper: active class
  const linkCls = (href: string) =>
    `hover:text-blue-300 cursor-pointer font-light text-xl ${
      pathname === href ? "text-blue-200" : ""
    }`;

  return (
    <>
      {/* Top Navbar */}
      <div className="bg-blueBrand h-[80px] sm:h-[106px] w-full flex justify-between items-center px-4 sm:px-6 relative z-50">
        {/* Logo */}
        <Link href="/homepage" className="flex-shrink-0" aria-label="ไปหน้าหลัก">
          <Image
            src="/brainbang_logo.png"
            alt="Logo"
            width={75}
            height={45}
            priority
            className="w-[60px] h-[36px] sm:w-[75px] sm:h-[45px]"
          />
        </Link>

        {/* Hamburger Button */}
        <button
          ref={buttonRef}
          onClick={toggleMenu}
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="main-nav-menu"
          className="relative z-[60] flex flex-col justify-center items-center w-10 h-10 focus:outline-none appearance-none bg-transparent cursor-pointer hover:bg-white/10 rounded-md transition-colors duration-200"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <div className="flex flex-col justify-between w-6 h-4">
            <span
              className={`block w-full h-0.5 bg-white rounded transition-all duration-300 ${
                menuOpen ? "rotate-45 translate-y-1.5" : ""
              }`}
            />
            <span
              className={`block w-full h-0.5 bg-white rounded transition-all duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block w-full h-0.5 bg-white rounded transition-all duration-300 ${
                menuOpen ? "-rotate-45 -translate-y-1.5" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Dropdown Menu */}
      <div
        id="main-nav-menu"
        ref={menuRef}
        role="menu"
        className={`absolute top-[80px] sm:top-[106px] left-0 w-full bg-blueBrand text-white shadow-md transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden z-40 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{ overflow: menuOpen ? "visible" : "hidden" }}
      >
        <ul className="flex flex-col p-4 gap-6">
          <li role="menuitem">
            <Link href="/homepage" className={linkCls("/homepage")}>
              หน้าหลัก
            </Link>
          </li>
          <li role="menuitem">
            <Link href="/profile" className={linkCls("/profile")}>
              ข้อมูลผู้ใช้งาน
            </Link>
          </li>
          {userRole === "admin" && (
            <li role="menuitem">
              <Link href="/admin" className={linkCls("/admin")}>
                หน้าแอดมิน
              </Link>
            </li>
          )}
          <li role="menuitem">
            <Link href="/homepage" className={linkCls("/homepage")}>
              ผลงาน
            </Link>
          </li>
          <li role="menuitem">
            <button
              onClick={handleLogout}
              className="text-left hover:text-blue-300 font-light text-xl"
            >
              ออกจากระบบ
            </button>
          </li>
        </ul>
      </div>

      {/* Overlay for mobile */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/25 z-30"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
