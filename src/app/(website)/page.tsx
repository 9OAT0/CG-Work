"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type AuthPhase = "checking" | "ready";

const LOGIN_DELAY_MS = 3000;
const PARTICLE_COUNT = 50;

export default function CombinedPage() {
  const [phase, setPhase] = useState<AuthPhase>("checking");
  const [showLogin, setShowLogin] = useState(false);
  const loginTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // เตรียมตำแหน่ง/ดีเลย์ของอนุภาคให้คงที่ตลอดอายุคอมโพเนนต์ (ไม่สุ่มทุก render)
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }).map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${2 + Math.random() * 3}s`,
      })),
    []
  );

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();

    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });

        if (!mounted) return;

        if (res.ok) {
          router.replace("/homepage");
          return;
        }
      } catch (err) {
        // ถ้าโดน abort จะเงียบ ๆ ไป
        if ((err as any)?.name !== "AbortError") {
          console.log("No session found:", err);
        }
      }

      if (!mounted) return;

      setPhase("ready");

      // ดีเลย์ปุ่มล็อกอินหลังเช็คเสร็จ
      loginTimerRef.current = setTimeout(() => {
        if (mounted) setShowLogin(true);
      }, LOGIN_DELAY_MS);
    };

    checkAuth();

    return () => {
      mounted = false;
      ac.abort();
      if (loginTimerRef.current) clearTimeout(loginTimerRef.current);
    };
  }, [router]);

  if (phase === "checking") {
    return (
      <div
        className="relative min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center text-white px-4"
        style={{ backgroundImage: "url('/Rectangle 140.png')" }}
      >
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] flex flex-col justify-center items-center gap-8 bg-gradient-to-br from-purple-900 via-purple-700 to-pink-500 relative px-4 overflow-hidden bg-no-repeat bg-cover bg-center"
      style={{
        backgroundImage: "url('/Rectangle 140.png')",
        backgroundBlendMode: "overlay",
      }}
    >
      {/* Animated particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white opacity-30 rounded-full"
            style={{
              left: p.left,
              top: p.top,
              // ลดแอนิเมชันเมื่อผู้ใช้ตั้งค่า reduce motion
              animation: prefersReducedMotion
                ? undefined
                : "pulse ease-in-out infinite",
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ y: 0 }}
          animate={showLogin ? { y: -50 } : { y: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 15 }}
          className="z-10 mb-8"
          aria-hidden
        >
          <Image
            src="/Ellipse 51.png"
            alt="BrainBang Logo"
            width={291}
            height={291}
            priority
            className="w-[150px] h-[150px] xs:w-[180px] xs:h-[180px] sm:w-[240px] sm:h-[240px] md:w-[280px] md:h-[280px] lg:w-[291px] lg:h-[291px]"
          />
        </motion.div>

        {/* Login Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={showLogin ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className={`flex flex-col items-center gap-4 w-full ${
            showLogin ? "mt-4" : "mt-12"
          } ${showLogin ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-live="polite"
        >
          <Link
            href="/login"
            className="w-full max-w-[280px] h-[50px] bg-pinkBrand hover:bg-pink-600 rounded-[30px] font-bold flex justify-center items-center text-white transition-colors duration-200 text-base sm:text-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            เข้าสู่ระบบ
          </Link>

          <div className="flex items-baseline gap-2 text-sm sm:text-base md:text-lg justify-center">
            <span className="font-bold text-white leading-none whitespace-nowrap">
              หรือ
            </span>
            <Link
              href="/register"
              className="font-bold text-white leading-none whitespace-nowrap
               underline decoration-white decoration-2 underline-offset-4
               hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              ลงทะเบียน
            </Link>
          </div>
        </motion.div>
      </div>

      {/* keyframes ติดไว้ในหน้านี้เลยเพื่อความง่าย */}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.15;
            transform: scale(1);
          }
          50% {
            opacity: 0.35;
            transform: scale(1.4);
          }
        }
      `}</style>
    </div>
  );
}
