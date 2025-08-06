"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    // Prevent body scroll when menu is open (iOS fix)
    if (!menuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Redirect to login page after successful logout
        router.push('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
        // Reset body scroll when menu closes
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      }
    };

    // Add both mouse and touch events for iOS compatibility
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      // Cleanup body styles on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  return (
    <nav className="relative">
      <div className="bg-blueBrand h-[106px] w-full flex justify-between items-end px-6 md:px-12 pb-5 relative z-50">
        {/* Logo */}
        <a href="/homepage">
          <img src="/brainbang_logo.png" alt="Logo" className="w-[75px] h-[45px]" />
        </a>

        {/* Desktop Navigation - Hidden on mobile */}
        <div className="hidden lg:flex items-center space-x-8">
          <a href="/homepage" className="text-white hover:text-blue-300 font-light text-xl">หน้าหลัก</a>
          <a href="/profile" className="text-white hover:text-blue-300 font-light text-xl">ข้อมูลผู้ใช้งาน</a>
          <a href="/homepage" className="text-white hover:text-blue-300 font-light text-xl">ผลงาน</a>
          <button 
            onClick={handleLogout}
            className="text-white hover:text-blue-300 font-light text-xl">
            ออกจากระบบ
          </button>
        </div>

        {/* Hamburger Icon - Only visible on mobile and tablet */}
        <button
          ref={buttonRef}
          onClick={toggleMenu}
          className="lg:hidden flex flex-col justify-between w-8 h-6 focus:outline-none z-50 touch-manipulation"
          aria-label="Toggle menu"
          style={{ 
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        >
          <span
            className={`block h-1 bg-white rounded transition-all duration-300 ${
              menuOpen ? "rotate-45 translate-y-2.5" : ""
            }`}
            style={{ transformOrigin: 'center' }}
          ></span>
          <span
            className={`block h-1 bg-white rounded transition-all duration-300 ${
              menuOpen ? "opacity-0" : ""
            }`}
          ></span>
          <span
            className={`block h-1 bg-white rounded transition-all duration-300 ${
              menuOpen ? "-rotate-45 -translate-y-2.5" : ""
            }`}
            style={{ transformOrigin: 'center' }}
          ></span>
        </button>
      </div>

      {/* Mobile Dropdown Menu - Only visible on mobile and tablet */}
      <div
        ref={menuRef}
        className={`lg:hidden fixed top-[106px] left-0 w-full bg-blueBrand text-white shadow-lg transition-all duration-300 ease-in-out z-40 ${
          menuOpen ? "max-h-screen opacity-100 visible" : "max-h-0 opacity-0 invisible"
        }`}
        style={{ 
          overflow: menuOpen ? 'visible' : 'hidden',
          WebkitOverflowScrolling: 'touch',
          transform: 'translateZ(0)', // Force hardware acceleration on iOS
          backfaceVisibility: 'hidden'
        }}
      >
        <ul className="flex flex-col p-6 gap-6">
          <li>
            <a 
              href="/homepage" 
              className="block active:text-blue-300 hover:text-blue-300 cursor-pointer font-light text-xl py-3 px-2 rounded touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                window.location.href = '/homepage';
              }}
              style={{ 
                WebkitTapHighlightColor: 'rgba(59, 130, 246, 0.3)',
                WebkitTouchCallout: 'none'
              }}
            >
              หน้าหลัก
            </a>
          </li>
          <li>
            <a 
              href="/profile" 
              className="block active:text-blue-300 hover:text-blue-300 cursor-pointer font-light text-xl py-3 px-2 rounded touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                window.location.href = '/profile';
              }}
              style={{ 
                WebkitTapHighlightColor: 'rgba(59, 130, 246, 0.3)',
                WebkitTouchCallout: 'none'
              }}
            >
              ข้อมูลผู้ใช้งาน
            </a>
          </li>
          <li>
            <a 
              href="/homepage" 
              className="block active:text-blue-300 hover:text-blue-300 cursor-pointer font-light text-xl py-3 px-2 rounded touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                window.location.href = '/homepage';
              }}
              style={{ 
                WebkitTapHighlightColor: 'rgba(59, 130, 246, 0.3)',
                WebkitTouchCallout: 'none'
              }}
            >
              ผลงาน
            </a>
          </li>
          <li>
            <button 
              onClick={() => {
                setMenuOpen(false);
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                handleLogout();
              }}
              className="block active:text-blue-300 hover:text-blue-300 cursor-pointer font-light text-xl py-3 px-2 text-left w-full rounded touch-manipulation"
              style={{ 
                WebkitTapHighlightColor: 'rgba(59, 130, 246, 0.3)',
                WebkitTouchCallout: 'none'
              }}
            >
              ออกจากระบบ
            </button>
          </li>
        </ul>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => {
            setMenuOpen(false);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
          }}
          onTouchStart={() => {
            setMenuOpen(false);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
          }}
          style={{ 
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        />
      )}
    </nav>
  );
}
