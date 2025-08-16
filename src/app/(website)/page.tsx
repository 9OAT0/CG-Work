"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function CombinedPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // ตรวจสอบ session ผ่าน API
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/me', {
          credentials: 'include'
        });
        if (response.ok) {
          // มี session แล้ว redirect ไป homepage
          router.replace("/homepage");
          return;
        }
      } catch (error) {
        console.log('No session found');
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  // ถ้าเช็ค session อยู่ให้ return loading
  if (isCheckingAuth) {
    return (
      <div className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center text-white px-4"
           style={{ backgroundImage: "url('/Rectangle 140.png')" }}>
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogin(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center text-white px-4"
      style={{ backgroundImage: "url('/Rectangle 140.png')" }}
    >
      {/* Logo */}
      <motion.img
        src="/Ellipse 51.png"
        alt="Logo"
        initial={{ y: 0 }}
        animate={showLogin ? { y: -100 } : { y: 0 }}
        transition={{ type: "spring", stiffness: 70, damping: 15 }}
        className="w-[180px] h-[180px] sm:w-[240px] sm:h-[240px] md:w-[280px] md:h-[280px] lg:w-[291px] lg:h-[291px] z-10"
      />

      {/* Login Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={showLogin ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
        className={`flex flex-col items-center gap-4 ${
          showLogin ? "mt-4" : "mt-12"
        } ${showLogin ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <a
          href="/login"
          className="w-full max-w-[250px] h-[49px] bg-pink-500 rounded-[30px] font-bold flex justify-center items-center"
        >
          เข้าสู่ระบบ
        </a>
        <div className="flex gap-2 text-sm sm:text-base md:text-lg">
          <h1 className="font-bold">หรือ</h1>
          <a href="/register" className="border-b font-bold">
            ลงทะเบียน
          </a>
        </div>
      </motion.div>
    </div>
  );
}
