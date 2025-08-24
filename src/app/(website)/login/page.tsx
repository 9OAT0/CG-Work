"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [studentID, setStudentID] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentID, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
        return;
      }

      // Store login flag for overlay system - ALWAYS set for every login
      sessionStorage.setItem('isNewLogin', 'true');

      alert(data.message || "เข้าสู่ระบบสำเร็จ");
      router.push("/homepage");
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
      {/* Animated particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white opacity-30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-[380px]">
        <h1 className="text-white text-3xl sm:text-4xl font-bold">เข้าสู่ระบบ</h1>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-6 w-full"
        >
        <input
          type="text"
          placeholder="รหัสนิสิต (สำหรับนิสิตเท่านั้น)"
          value={studentID}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, ''); // Only allow digits
            if (value.length <= 8) {
              setStudentID(value);
            }
          }}
          className="w-full h-[51px] rounded-[30px] px-4 text-base"
          maxLength={8}
        />

        <input
          type="text"
          placeholder="ชื่อ - นามสกุล*"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-[51px] rounded-[30px] px-4 text-base"
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-[250px] h-[49px] rounded-[30px] mt-2 text-white font-bold text-lg transition-colors duration-300 ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-pinkBrand hover:bg-pink-600"
          }`}
        >
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
        </form>
      </div>
    </div>
  );
}
