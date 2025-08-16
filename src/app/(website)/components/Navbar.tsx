"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const toggleMenu = () => setMenuOpen(!menuOpen);

  // ✅ Check user role on mount
  useEffect(() => {
    let isMounted = true;
    
    const checkUserRole = async () => {
      try {
        const response = await fetch("/api/me", {
          credentials: 'include'
        });
        
        if (!isMounted) return; // Prevent state updates if component unmounted
        
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };
    
    checkUserRole();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ Logout
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        router.push("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // ✅ Close menu when click outside
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

  return (
    <>
      {/* Top Navbar */}
      <div className="bg-blueBrand h-[80px] sm:h-[106px] w-full flex justify-between items-center px-4 sm:px-6 relative z-50">
        {/* Logo */}
        <a href="/homepage" className="flex-shrink-0">
          <img
            src="/brainbang_logo.png"
            alt="Logo"
            className="w-[60px] h-[36px] sm:w-[75px] sm:h-[45px]"
          />
        </a>

        {/* ✅ Hamburger Button */}
        <button
          ref={buttonRef}
          onClick={toggleMenu}
          type="button"
          aria-label="Toggle menu"
          className="relative z-[60] flex flex-col justify-between w-8 h-6 focus:outline-none appearance-none bg-transparent p-2"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <span
            className={`block w-full h-1 bg-white rounded transition-transform duration-300 ${
              menuOpen ? "rotate-45 translate-y-2.5" : ""
            }`}
          />
          <span
            className={`block w-full h-1 bg-white rounded transition-opacity duration-300 ${
              menuOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`block w-full h-1 bg-white rounded transition-transform duration-300 ${
              menuOpen ? "-rotate-45 -translate-y-2.5" : ""
            }`}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      <div
        ref={menuRef}
        className={`absolute top-[80px] sm:top-[106px] left-0 w-full bg-blueBrand text-white shadow-md transition-all duration-300 ease-in-out overflow-hidden z-40 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{ overflow: menuOpen ? "visible" : "hidden" }}
      >
        <ul className="flex flex-col p-4 gap-6">
          <a href="/homepage">
            <li className="hover:text-blue-300 cursor-pointer font-light text-xl">
              หน้าหลัก
            </li>
          </a>
          <a href="/profile">
            <li className="hover:text-blue-300 cursor-pointer font-light text-xl">
              ข้อมูลผู้ใช้งาน
            </li>
          </a>
          {userRole === "admin" && (
            <a href="/admin">
              <li className="hover:text-blue-300 cursor-pointer font-light text-xl">
                หน้าแอดมิน
              </li>
            </a>
          )}
          <a href="/homepage">
            <li className="hover:text-blue-300 cursor-pointer font-light text-xl">
              ผลงาน
            </li>
          </a>
          <button onClick={handleLogout} className="text-left">
            <li className="hover:text-blue-300 cursor-pointer font-light text-xl">
              ออกจากระบบ
            </li>
          </button>
        </ul>
      </div>

      {/* Overlay for mobile */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
