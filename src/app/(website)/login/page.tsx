"use client";

import { useState, FormEvent, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
const LoginParticles = dynamic(() => import("../components/LoginParticles"), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const q = useSearchParams();

  // รองรับทั้ง ?from= และ ?next=  (ดีฟอลต์ /homepage)
  const returnTo = useMemo(() => {
    const raw = q.get("from") || q.get("next") || "/homepage";
    // กันวนลูปกลับเข้า /login /register /maintenance
    if (!raw.startsWith("/")) return "/homepage";
    if (raw.startsWith("/login") || raw.startsWith("/register") || raw.startsWith("/maintenance")) {
      return "/homepage";
    }
    return raw;
  }, [q]);

  const forced = q.get("forced"); // เช่น forced=daily จาก middleware

  const [studentID, setStudentID] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = { student_id: studentID.trim(), name: name.trim() };
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.error || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
        return;
      }

      // ใช้โดยระบบ overlay หลัง login
      sessionStorage.setItem("isNewLogin", "true");

      // แนะนำใช้ replace เพื่อลดการกด back กลับมาหน้า login
      router.replace(returnTo);
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="h-[100dvh] flex flex-col justify-center items-center gap-8 bg-gradient-to-br from-purple-900 via-purple-700 to-pink-500 relative px-4 overflow-hidden bg-no-repeat bg-cover bg-center"
      style={{
        backgroundImage: "url('/Rectangle 140.png')",
        backgroundBlendMode: "overlay",
      }}
    >
      {/* พื้นหลังอนุภาคแบบ client-only (เลี่ยง hydration mismatch) */}
      <LoginParticles count={50} />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-[380px]">
        <h1 className="text-white text-3xl sm:text-4xl font-bold">เข้าสู่ระบบ</h1>

        {/* แจ้งเตือนเมื่อถูกบังคับออกเพราะข้ามวัน/นโยบายรายวัน */}
        {forced === "daily" && (
          <div className="w-full text-center text-sm text-white/90 bg-white/10 rounded-xl px-4 py-2">
            เซสชันหมดอายุประจำวัน โปรดล็อกอินใหม่
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 w-full">
          <input
            type="text"
            inputMode="numeric"
            placeholder="รหัสนิสิต (สำหรับนิสิตเท่านั้น)"
            value={studentID}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, ""); // เฉพาะตัวเลข
              if (value.length <= 8) setStudentID(value);
            }}
            className="w-full h-[51px] rounded-[30px] px-4 text-base"
            maxLength={8}
            autoComplete="username"
          />

          <input
            type="text"
            placeholder="ชื่อ - นามสกุล*"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-[51px] rounded-[30px] px-4 text-base"
            required
            autoComplete="name"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-[250px] h-[49px] rounded-[30px] mt-2 text-white font-bold text-lg transition-colors duration-300 ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-pinkBrand hover:bg-pink-600"
              }`}
          >
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
