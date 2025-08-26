"use client";

import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  name: string;
  student_id: string;
  status: string;
  dept: string;
  dailyPoints: number;            // ✅ จาก DailyPoints.net
  totalPoints: number;            // คะแนนสะสมรวม (User.score)
  transcriptDates: string[];      // ["YYYY-MM-DD", ...]
  // optional เผื่ออนาคตอยากโชว์ breakdown
  dailyBreakdown?: { earned: number; spent: number; adjusted: number };
}

/** ===== Test Mode =====
 * true  = โหมดทดสอบ: ใช้ localStorage เก็บ transcriptDates และจำลองเคลม (ไม่หักแต้ม)
 * false = โหมดจริง: ใช้ API ตามจริง
 */
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";
const TEST_LS_KEY = "test_transcriptDates";
const EVENT_BASE = process.env.NEXT_PUBLIC_EVENT_MONTH || "2025-08"; // YYYY-MM

// แต้มรายวันขั้นต่ำของแต่ละวัน
const REQUIRED_POINTS: Record<"27" | "28" | "29", number> = {
  "27": 6,
  "28": 10,
  "29": 8,
};

// วันปัจจุบัน (2 หลัก) ตามโซนเวลา Asia/Bangkok
function getBangkokDay(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
  }).format(new Date());
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [redeemed, setRedeemed] = useState<{ [key: string]: boolean }>({
    "27": false,
    "28": false,
    "29": false,
  });

  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [redeemingDay, setRedeemingDay] = useState<string | null>(null);
  const [todayDay, setTodayDay] = useState<string | null>(null);

  // คำนวณวันปัจจุบันฝั่ง client (กัน hydration mismatch)
  useEffect(() => {
    setTodayDay(getBangkokDay());
  }, []);

  // โหมดทดสอบ: ล้าง localStorage ทุกครั้งที่ refresh เฉพาะตอน TEST_MODE = true เท่านั้น
  useEffect(() => {
    if (TEST_MODE && typeof window !== "undefined") {
      try {
        localStorage.removeItem(TEST_LS_KEY);
      } catch {}
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }

        const res = await fetch("/api/profile", {
          credentials: "include",
          cache: "no-store",
        });

        if (!isMounted) return;

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load profile");
          console.error("Error:", data.error);
          return;
        }

        if (!data || typeof data !== "object") {
          setError("Invalid response format");
          console.error("Invalid data format:", data);
          return;
        }

        // transcriptDates จาก API
        let transcriptDatesSource: string[] = Array.isArray(data.transcriptDates)
          ? data.transcriptDates
          : [];

        // โหมดทดสอบ: อ่าน/ทับจาก localStorage
        if (TEST_MODE && typeof window !== "undefined") {
          try {
            const fromLS = localStorage.getItem(TEST_LS_KEY);
            transcriptDatesSource = fromLS ? JSON.parse(fromLS) : [];
          } catch {
            transcriptDatesSource = [];
          }
        }

        // map วันว่าเคลมแล้วหรือยัง
        const claimedMap: { [key: string]: boolean } = {
          "27": false,
          "28": false,
          "29": false,
        };
        transcriptDatesSource.forEach((date: string) => {
          if (typeof date === "string") {
            const day = date.split("-")[2];
            if (["27", "28", "29"].includes(day)) claimedMap[day] = true;
          }
        });

        // แต้มรายวัน (API ให้ dailyPoints ที่คำนวณจาก DailyPoints.net แล้ว)
        // ถ้า TEST_MODE อยากให้ทดสอบง่าย สามารถยกเพดานขั้นต่ำได้ตามเดิม:
        const dailyPoints: number =
          TEST_MODE ? Math.max(data.dailyPoints ?? 0, 12) : data.dailyPoints ?? 0;

        if (!isMounted) return;
        setUser({
          name: data.name,
          student_id: data.student_id,
          status: data.status,
          dept: data.dept,
          dailyPoints,
          totalPoints: data.totalPoints ?? 0,
          transcriptDates: transcriptDatesSource,
          dailyBreakdown: data.dailyBreakdown,
        });

        setRedeemed(claimedMap);
      } catch (err) {
        if (isMounted) {
          setError("Failed to load profile");
          console.error("Failed to load profile:", err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // เคลมทรานสคริปต์
  const handleRedeem = async (day: "27" | "28" | "29") => {
    if (!user) return;
    if (redeemed[day]) return;
    if (redeemingDay) return;

    // เฉพาะวันนั้น ๆ เท่านั้น
    if (!todayDay || day !== todayDay) {
      setPopupMessage(`สามารถรับทรานสคริปต์ของวันที่ ${day} ได้เฉพาะวันที่ ${day} เท่านั้น`);
      setShowPopup(true);
      return;
    }

    // ✅ เช็คแต้มขั้นต่ำเฉพาะ “คะแนนรายวัน” ตามวันที่กด
    const required = REQUIRED_POINTS[day];
    if (user.dailyPoints < required) {
      const missing = required - user.dailyPoints;
      setPopupMessage(`วันที่ ${day} ต้องมีอย่างน้อย ${required} คะแนน (ขาดอีก ${missing} คะแนน)`);
      setShowPopup(true);
      return;
    }

    const dateStr = `${EVENT_BASE}-${day}`; // เช่น "2025-08-27"

    // ------- TEST_MODE: จำลองใน client (ไม่หักแต้ม) -------
    if (TEST_MODE && typeof window !== "undefined") {
      try {
        setRedeemingDay(day);

        let lsDates: string[] = [];
        try {
          const raw = localStorage.getItem(TEST_LS_KEY);
          lsDates = raw ? JSON.parse(raw) : [];
        } catch {}

        if (!lsDates.includes(dateStr)) lsDates.push(dateStr);
        localStorage.setItem(TEST_LS_KEY, JSON.stringify(lsDates));

        setRedeemed((prev) => ({ ...prev, [day]: true }));
        setUser((prev) =>
          prev
            ? {
                ...prev,
                transcriptDates: lsDates,
              }
            : prev
        );

        router.push(`/gettranscript?day=${day}`);
      } catch (e) {
        console.error(e);
        setPopupMessage("เกิดข้อผิดพลาดในโหมดทดสอบ");
        setShowPopup(true);
      } finally {
        setRedeemingDay(null);
      }
      return;
    }

    // ------- โหมดจริง: เรียก API จริง -------
    try {
      setRedeemingDay(day);

      const res = await fetch("/api/claim-transcript", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,     // "27" | "28" | "29"
          date: dateStr,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error || "รับทรานสคริปต์ไม่สำเร็จ";
        setPopupMessage(msg);
        setShowPopup(true);

        // ถ้าเซิร์ฟเวอร์บอกว่าเคลมไปแล้ว ให้ mark ใช้แล้ว
        if (typeof msg === "string" && msg.includes("รับ transcript วันนี้แล้ว")) {
          setRedeemed((prev) => ({ ...prev, [day]: true }));
        }
        return;
      }

      // ✅ ใช้ค่าจาก API โดยตรง (ไม่มี fallback หักแต้มเอง)
      setUser((prev) =>
        prev
          ? {
              ...prev,
              dailyPoints:
                typeof data.dailyPoints === "number" ? data.dailyPoints : prev.dailyPoints,
              totalPoints:
                typeof data.totalScore === "number" ? data.totalScore : prev.totalPoints,
              transcriptDates: Array.isArray(prev.transcriptDates)
                ? Array.from(new Set([...prev.transcriptDates, dateStr]))
                : [dateStr],
            }
          : prev
      );

      setRedeemed((prev) => ({ ...prev, [day]: true }));
      router.push(`/gettranscript?day=${day}`);
    } catch (err) {
      console.error(err);
      setPopupMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setShowPopup(true);
    } finally {
      setRedeemingDay(null);
    }
  };

  // ---------- helper สำหรับแสดง requirement เฉพาะ “วันนี้” ----------
  const isEventDay = (d: string | null): d is "27" | "28" | "29" =>
    d === "27" || d === "28" || d === "29";
  const todayReq = isEventDay(todayDay) ? REQUIRED_POINTS[todayDay] : null;

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col justify-center items-center py-10 px-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blueBrand"></div>
          <p className="mt-4 text-blueBrand">กำลังโหลดข้อมูล...</p>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col justify-center items-center py-10 px-4">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blueBrand text-white px-6 py-2 rounded-full"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </>
    );
  }

  // No user data
  if (!user) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col justify-center items-center py-10 px-4">
          <p className="text-blueBrand">ไม่พบข้อมูลผู้ใช้</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col gap-8 py-10 px-4 max-w-2xl mx-auto">
        {/* ข้อมูลผู้ใช้ */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-10">
          <img src="/prog.jpg" alt="profile" className="w-[110px] h-[110px]" />
          <div className="text-blueBrand flex flex-col gap-1 text-center sm:text-left">
            <h1 className="text-[22px] sm:text-[24px] font-bold">{user.name}</h1>
            <h1 className="text-[16px]">
              {user.student_id} สถานะ : {user.status}
            </h1>
            <h1 className="text-[16px]">{user.dept}</h1>
          </div>
        </div>

        {/* คะแนนประจำวัน */}
        <div className="border border-gray-300 w-full flex flex-col items-center py-6 px-4 rounded-xl">
          <h1 className="text-blueBrand text-[14px]">คะแนนประจำวันของการร่วมกิจกรรม</h1>
          <div className="w-full max-w-[366px] h-auto bg-blueBrand rounded-[20px] flex flex-col justify-center items-center text-white gap-3 mt-4 py-6 px-4">
            <div className="flex flex-col items-center">
              <h1 className="text-[40px] sm:text-[50px] font-bold">{user.dailyPoints}/30</h1>
              <h1 className="font-medium text-[16px]">คะแนนรวมทั้งหมด {user.totalPoints}/90</h1>
            </div>
            <button
              className="w-[250px] h-[49px] rounded-[30px] bg-pinkBrand"
              onClick={() => {
                router.push("/transferpoint");
              }}
            >
              แลกรับของรางวัล
            </button>
          </div>
        </div>

        {/* รับทรานสคริปต์ */}
        <div className="border border-gray-300 w-full flex flex-col items-center py-6 px-4 rounded-xl">
          <h1 className="text-blueBrand text-[14px]">รับทรานสคริปต์</h1>
          <div className="w-full max-w-[366px] bg-blueBrand rounded-[20px] flex flex-col justify-center items-center text-white gap-3 mt-4 py-6 px-4">
            {/* ✅ แสดง requirement ของ “วันนี้” เท่านั้น */}
            {todayReq && (
              <h1 className="text-[12px] font-medium">
                *วันนี้ ({todayDay}) ต้องมีแต้มรายวันอย่างน้อย {todayReq} คะแนน*
              </h1>
            )}

            <div className="flex gap-4 sm:gap-8 mt-2">
              {(["27", "28", "29"] as const).map((day) => {
                const isActiveToday = !!todayDay && day === todayDay;
                const isDisabled = redeemed[day] || redeemingDay === day || !isActiveToday;
                return (
                  <div key={`day-${day}`}>
                    <button
                      onClick={() => handleRedeem(day)}
                      disabled={isDisabled}
                      className={`${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                      aria-label={`รับทรานสคริปต์วันที่ ${day}`}
                    >
                      <img
                        src={redeemed[day] ? `/${day}c.png` : `/${day}.png`}
                        className="w-[70px] sm:w-[86px] h-[70px] sm:h-[86px]"
                        alt={`day-${day}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <h1 className="font-bold text-[16px] text-blueBrand pt-4 text-center">
            เปิดหน้านี้เมื่อต้องการรับทรานสคริปต์
          </h1>
        </div>

        {/* ปุ่มกลับหน้าหลัก */}
        <div className="flex justify-center mt-6">
          <a
            href="/homepage"
            className="bg-blueBrand w-[250px] h-[49px] rounded-[30px] flex justify-center items-center"
          >
            <h1 className="text-white text-[16px]">กลับหน้าหลัก</h1>
          </a>
        </div>
      </div>

      {/* Popup แจ้งเตือน */}
      {showPopup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 px-4"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg text-center w-full max-w-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="text-blueBrand font-semibold text-[18px] mb-4">
              {popupMessage}
            </h1>
            <button
              onClick={() => setShowPopup(false)}
              className="mt-2 bg-pinkBrand text-white px-4 py-2 rounded-full w-[200px]"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </>
  );
}
