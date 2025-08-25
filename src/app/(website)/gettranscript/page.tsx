"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Navbar from "../components/Navbar";

/** ===== Test Mode (ควบคุมด้วย env) =====
 * true  = ใช้ข้อมูล localStorage เพื่อตรวจสิทธิ์ (ไม่ POST)
 * false = โหมดจริง: ตรวจสิทธิ์ผ่าน /api/profile (ไม่ POST ซ้ำ)
 */
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";
const TEST_LS_KEY = "test_transcriptDates";

function GetTranscriptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const day = searchParams.get("day") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // แปะหัวเรื่องให้โชว์วันแบบสั้น ๆ (ไม่ใส่ปี)
  const dayLabel = ["27", "28", "29"].includes(day) ? day : "";

  useEffect(() => {
    // วันต้องเป็น 27/28/29 เท่านั้น
    if (!["27", "28", "29"].includes(day)) {
      setError("ไม่พบวันที่ที่ถูกต้อง");
      setLoading(false);
      return;
    }

    // โหมดทดสอบ: อ่านสิทธิ์จาก localStorage
    if (TEST_MODE && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(TEST_LS_KEY);
        const dates: string[] = raw ? JSON.parse(raw) : [];
        const hasClaimed = dates.some((d) => d.split("-")[2] === day);
        if (!hasClaimed) {
          setError("คะแนนรายวันไม่เพียงพอหรือยังไม่ได้รับสิทธิ์วันนี้");
        }
      } catch {
        setError("คะแนนรายวันไม่เพียงพอหรือยังไม่ได้รับสิทธิ์วันนี้");
      } finally {
        setLoading(false);
      }
      return;
    }

    // โหมดจริง: เช็กสิทธิ์จาก /api/profile เท่านั้น (ไม่ POST ซ้ำ)
    (async () => {
      try {
        const res = await fetch("/api/profile", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || "ไม่สามารถโหลดข้อมูลได้");
          return;
        }

        const transcriptDates: string[] = Array.isArray(data?.transcriptDates)
          ? data.transcriptDates
          : [];

        const hasClaimed = transcriptDates.some((d) => {
          if (typeof d !== "string") return false;
          const dDay = d.split("-")[2];
          return dDay === day;
        });

        if (!hasClaimed) {
          setError("คะแนนรายวันไม่เพียงพอหรือยังไม่ได้รับสิทธิ์วันนี้");
        }
      } catch {
        setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    })();
  }, [day]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-blueBrand text-lg">กำลังโหลด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center px-4">
        <p className="text-red-500 text-lg">{error}</p>
        <button
          onClick={() => router.push("/profile")}
          className="mt-6 bg-blueBrand text-white px-6 py-2 rounded-full text-sm md:text-base"
        >
          กลับหน้าโปรไฟล์
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center pt-10 px-4">
      {/* หัวข้อ (สั้น ไม่ใส่ปี) */}
      <div className="text-center font-bold leading-tight mb-4">
        <h1 className="text-lg sm:text-xl md:text-2xl">แลกคะแนน</h1>
        <h1 className="text-lg sm:text-xl md:text-2xl">
          รับทรานสคริปต์วันที่ {dayLabel} แล้ว
        </h1>
      </div>

      {/* การ์ดสรุปแบบ responsive */}
      <div className="w-full max-w-[424px] rounded-[20px] bg-blueBrand text-white p-6 sm:p-8 flex flex-col items-center gap-8">
        <div className="w-full grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-y-8 sm:gap-x-10">
          {/* ซ้าย: ไอคอนเป็นแนวตั้ง (เลย์เอาต์จะสลับแนวนอนบนจอเล็ก) */}
          <div className="flex flex-row sm:flex-col items-center justify-center gap-6">
            <img src="/check.png" alt="สำเร็จ" className="w-10 h-10 sm:w-14 sm:h-14" />
            <div className="flex items-center sm:flex-col gap-4">
              <img src="/prog.jpg" alt="รูปโปรไฟล์" className="w-10 h-10 sm:w-14 sm:h-14 rounded-full object-cover" />
              <img src="/arrow.jpg" alt="" aria-hidden className="w-5 h-7 sm:w-6 sm:h-8 sm:rotate-0 rotate-90" />
            </div>
            <img src="/staff.png" alt="Staff" className="w-10 h-10 sm:w-14 sm:h-14" />
          </div>

          {/* ขวา: ข้อความ */}
          <div className="flex flex-col justify-between gap-8 sm:gap-14">
            <h1 className="text-base sm:text-lg">แลก 06 คะแนนสำเร็จแล้ว</h1>
            <div className="space-y-1">
              <h1 className="font-semibold text-base sm:text-lg">รลิตา เครือระยา</h1>
              <h1 className="text-sm sm:text-base">65023938 นิสิต</h1>
              <h1 className="text-sm sm:text-base">คณะเทคโนโลยีและสารสนเทศ</h1>
            </div>
            <h1 className="text-base sm:text-lg">Staff ดูแลบูธ</h1>
          </div>
        </div>
      </div>

      <button
        className="mt-8 bg-blueBrand text-white px-6 py-2 md:py-3 rounded-full text-sm md:text-base"
        onClick={() => router.push("/profile")}
      >
        กลับหน้าโปรไฟล์
      </button>
    </div>
  );
}

export default function GetTranscriptPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="text-center mt-10">กำลังโหลด...</div>}>
        <GetTranscriptContent />
      </Suspense>
    </>
  );
}
