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

      alert(data.message || "เข้าสู่ระบบสำเร็จ");
      router.push("/homepage"); // ✅ Redirect หลัง login สำเร็จ
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center gap-16 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/Rectangle 140.png')" }}
    >
      <h1 className="text-white text-4xl font-bold">เข้าสู่ระบบ</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center gap-6"
      >
        <input
          type="text"
          placeholder="  รหัสนิสิต                                  ถ้ามีโปรดระบุ*"
          value={studentID}
          onChange={(e) => setStudentID(e.target.value)}
          className="w-[342px] h-[51px] rounded-[30px] px-4"
          required
        />

        <input
          type="text"
          placeholder="  ชื่อ - สกุล*"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-[342px] h-[51px] rounded-[30px] px-4"
          required
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-[250px] h-[49px] rounded-[30px] mt-4 text-white font-bold text-xl transition-colors duration-300 ${
            isSubmitting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-pinkBrand hover:bg-pink-600"
          }`}
        >
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
