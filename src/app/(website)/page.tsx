"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function CombinedPage() {
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogin(true); // หลัง 3 วิ → โลโก้ขยับ + ปุ่มโผล่
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center text-white"
      style={{ backgroundImage: "url('/Rectangle 140.png')" }}
    >
      {/* Logo */}
      <motion.img
        src="/Ellipse 51.png"
        alt="Logo"
        initial={{ y: 0 }}
        animate={showLogin ? { y: -100 } : { y: 0 }} // ลดระยะเลื่อนขึ้นให้ใกล้กว่าเดิม
        transition={{ type: "spring", stiffness: 70, damping: 15 }}
        className="w-[291px] h-[291px] z-10"
      />

      {/* Login Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={showLogin ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
        className={`flex flex-col items-center gap-4 ${
          showLogin ? "mt-4" : "mt-12" // หลัง fade-out ลดห่างเหลือ mt-4
        } ${showLogin ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <a
          href="/login"
          className="w-[250px] h-[49px] bg-pink-500 rounded-[30px] font-bold flex justify-center items-center"
        >
          เข้าสู่ระบบ
        </a>
        <div className="flex gap-2">
          <h1 className="font-bold">หรือ</h1>
          <a href="/register" className="border-b font-bold">
            ลงทะเบียน
          </a>
        </div>
      </motion.div>
    </div>
  );
}
