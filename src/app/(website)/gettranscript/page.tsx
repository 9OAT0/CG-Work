"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Navbar from "../components/Navbar";

/** ===== Test Mode (ให้ตรงกับหน้า Profile) =====
 * true  = ใช้ข้อมูลที่บันทึกใน localStorage (ไม่เรียก POST)
 * false = โหมดจริง: เช็กสิทธิ์จาก /api/profile ว่าได้เคลมวันนี้แล้วหรือยัง
 */
const TEST_MODE = true;
const TEST_LS_KEY = "test_transcriptDates";

function GetTranscriptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const day = searchParams.get("day") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const dayText: Record<string, string> = {
    "27": "วันที่ 27 สิงหาคม 2568",
    "28": "วันที่ 28 สิงหาคม 2568",
    "29": "วันที่ 29 สิงหาคม 2568",
  };

  useEffect(() => {
    // วันต้องเป็น 27/28/29 เท่านั้น
    if (!["27", "28", "29"].includes(day)) {
      setError("ไม่พบวันที่ที่ถูกต้อง");
      setLoading(false);
      return;
    }

    // โหมดทดสอบ: อ่านสิทธิ์จาก localStorage (หน้าโปรไฟล์เป็นคนเขียนค่าไว้แล้ว)
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

    // โหมดจริง: ***ไม่ POST ซ้ำ*** ให้เช็กสิทธิ์จาก /api/profile แทน
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

        // ตรวจว่ามีสิทธิ์ของวันนั้นแล้วหรือยัง
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
      <h1 className="text-xl md:text-2xl font-bold text-blueBrand mb-4 text-center">
        Transcript สำหรับ {dayText[day]}
      </h1>
      <img
        src={`/${day}c.png`}
        alt="transcript"
        className="w-full max-w-xs sm:max-w-sm md:max-w-md rounded-lg shadow-lg"
      />
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
