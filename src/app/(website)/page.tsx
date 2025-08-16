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
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/me', {
          credentials: 'include'
        });
        
        if (!isMounted) return; // Prevent state updates if component unmounted
        
        if (response.ok) {
          // มี session แล้ว redirect ไป homepage
          router.replace("/homepage");
          return;
        }
      } catch (error) {
        console.log('No session found:', error);
      }
      
      if (isMounted) {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
    
    return () => {
      isMounted = false;
    };
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
      className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center text-white px-4 overflow-hidden"
      style={{ 
        backgroundImage: "url('/Rectangle 140.png')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Mobile-optimized container */}
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
        {/* Logo */}
        <motion.img
          src="/Ellipse 51.png"
          alt="Logo"
          initial={{ y: 0 }}
          animate={showLogin ? { y: -50 } : { y: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 15 }}
          className="w-[150px] h-[150px] xs:w-[180px] xs:h-[180px] sm:w-[240px] sm:h-[240px] md:w-[280px] md:h-[280px] lg:w-[291px] lg:h-[291px] z-10 mb-8"
        />

        {/* Login Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={showLogin ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className={`flex flex-col items-center gap-4 w-full ${
            showLogin ? "mt-4" : "mt-12"
          } ${showLogin ? "pointer-events-auto" : "pointer-events-none"}`}
        >
          <a
            href="/login"
            className="w-full max-w-[280px] h-[50px] bg-pinkBrand hover:bg-pink-600 rounded-[30px] font-bold flex justify-center items-center text-white transition-colors duration-200 text-base sm:text-lg shadow-lg"
          >
            เข้าสู่ระบบ
          </a>
          <div className="flex gap-2 text-sm sm:text-base md:text-lg items-center">
            <span className="font-bold text-white">หรือ</span>
            <a 
              href="/register" 
              className="border-b border-white font-bold text-white hover:text-gray-200 transition-colors duration-200"
            >
              ลงทะเบียน
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
