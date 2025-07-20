"use client";

import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  // ✅ ปิดเมื่อคลิกนอก
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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      {/* Navbar */}
      <div className="bg-blueBrand h-[106px] w-full flex justify-between items-end px-[29px] pb-5 relative z-50">
        {/* Logo */}
        <div>
          <img src="/logo.jpg" alt="Logo" className="w-[75px] h-[45px]" />
        </div>

        {/* Hamburger Icon */}
        <button
          ref={buttonRef}
          onClick={toggleMenu}
          className="flex flex-col justify-between w-8 h-6 focus:outline-none"
        >
          <span
            className={`block h-1 bg-white rounded transition-all duration-300 ${
              menuOpen ? "rotate-45 translate-y-2" : ""
            }`}
          ></span>
          <span
            className={`block h-1 bg-white rounded transition-all duration-300 ${
              menuOpen ? "opacity-0" : ""
            }`}
          ></span>
          <span
            className={`block h-1 bg-white rounded transition-all duration-300 ${
              menuOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          ></span>
        </button>
      </div>

      {/* Dropdown Menu */}
      <div
        ref={menuRef}
        className={`absolute top-[106px] left-0 w-full bg-blue-700 text-white shadow-md transition-all duration-500 ease-in-out overflow-hidden ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="flex flex-col p-4 gap-4">
          <li className="hover:text-blue-300 cursor-pointer">หน้าแรก</li>
          <li className="hover:text-blue-300 cursor-pointer">เกี่ยวกับเรา</li>
          <li className="hover:text-blue-300 cursor-pointer">บริการ</li>
          <li className="hover:text-blue-300 cursor-pointer">ติดต่อ</li>
        </ul>
      </div>
    </>
  );
}
