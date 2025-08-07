"use client";

import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

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
      {/* Navbar Top Bar */}
      <div className="bg-blueBrand h-[106px] w-full flex justify-between items-end px-6 pb-5 relative z-50">
        {/* Logo */}
        <a href="/homepage">
          <img src="/brainbang_logo.png" alt="Logo" className="w-[75px] h-[45px]" />
        </a>

        {/* Hamburger Icon (Always visible) */}
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
        className={`absolute top-[106px] left-0 w-full bg-blue-700 text-white shadow-md transition-all duration-300 ease-in-out overflow-hidden z-40 ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="flex flex-col p-4 gap-6">
          <a href="/homepage">
            <li className="hover:text-blue-300 cursor-pointer font-light text-xl">หน้าหลัก</li>
          </a>
          <a href="/profile">
            <li className="hover:text-blue-300 cursor-pointer font-light text-xl">ข้อมูลผู้ใช้งาน</li>
          </a>
          <a href="/homepage">
            <li className="hover:text-blue-300 cursor-pointer font-light text-xl">ผลงาน</li>
          </a>
        </ul>
      </div>
    </>
  );
}
