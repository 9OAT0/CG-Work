"use client";

import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileData {
  name: string;
  student_id: string;
  status: string;
  dept: string;
  dailyPoints: number;
  totalPoints: number;
  transcriptDates: string[];
}

/** ===== Test Mode =====
 * true  = โหมดทดสอบ: ล้าง localStorage ทุกครั้งที่ refresh และจำลองการเคลมในฝั่ง client
 * false = โหมดจริง: ใช้ API /api/profile และ /api/claim-transcript ตามเดิม (และส่ง day/date ให้ API)
 */
const TEST_MODE = true;
const TEST_LS_KEY = "test_transcriptDates";

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

  // ล้าง localStorage ทุกครั้งที่ refresh เมื่อ TEST_MODE = true
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

        let transcriptDatesSource: string[] = Array.isArray(data.transcriptDates)
          ? data.transcriptDates
          : [];

        // ใน TEST_MODE ใช้ localStorage เป็นแหล่งความจริง
        if (TEST_MODE && typeof window !== "undefined") {
          try {
            const fromLS = localStorage.getItem(TEST_LS_KEY);
            transcriptDatesSource = fromLS ? JSON.parse(fromLS) : [];
          } catch {
            transcriptDatesSource = [];
          }
        }

        const claimedMap: { [key: string]: boolean } = { "27": false, "28": false, "29": false };
        transcriptDatesSource.forEach((date: string) => {
          if (typeof date === "string") {
            const day = date.split("-")[2];
            if (["27", "28", "29"].includes(day)) claimedMap[day] = true;
          }
        });

        const dailyPoints =
          TEST_MODE && typeof data.dailyPoints === "number" && data.dailyPoints < 6
            ? 12
            : data.dailyPoints ?? 0;

        if (!isMounted) return;
        setUser({
          name: data.name,
          student_id: data.student_id,
          status: data.status,
          dept: data.dept,
          dailyPoints,
          totalPoints: data.totalPoints ?? 0,
          transcriptDates: transcriptDatesSource,
        });

        setRedeemed(claimedMap);
      } catch (err) {
        if (isMounted) {
          setError("Failed to load profile");
          console.error("Failed to load profile:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // เคลมทรานสคริปต์ (รองรับ TEST_MODE)
  const handleRedeem = async (day: string) => {
    if (!user) return;
    if (redeemed[day]) return;
    if (redeemingDay) return;

    if (user.dailyPoints < 6) {
      const missing = 6 - user.dailyPoints;
      setPopupMessage(`ท่านยังขาดคะแนนอีก ${missing} คะแนนในการแลกรับทรานสคริปต์`);
      setShowPopup(true);
      return;
    }

    // ใช้เดือน/ปีอ้างอิงเดียวกันกับงานจริงของคุณ
    const base = "2025-08";
    const dateStr = `${base}-${day}`; // เช่น "2025-08-27"

    // ------- TEST_MODE: จำลองการเคลมในฝั่ง client -------
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
            ? { ...prev, dailyPoints: Math.max(0, prev.dailyPoints - 6), transcriptDates: lsDates }
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

    // ------- โหมดจริง: ส่ง day/date ไปยัง API ให้ชัดเจน (แก้ 400) -------
    try {
      setRedeemingDay(day);

      const res = await fetch("/api/claim-transcript", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,      // เช่น "27"
          date: dateStr, // เช่น "2025-08-27" (เผื่อฝั่งเซิร์ฟเวอร์ต้องการวันที่เต็ม)
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error || "รับทรานสคริปต์ไม่สำเร็จ";
        setPopupMessage(msg);
        setShowPopup(true);

        if (typeof msg === "string" && msg.includes("รับ transcript วันนี้แล้ว")) {
          setRedeemed((prev) => ({ ...prev, [day]: true }));
        }
        return;
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              dailyPoints:
                typeof data.dailyPoints === "number"
                  ? data.dailyPoints
                  : Math.max(0, prev.dailyPoints - 6),
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
            <h1 className="text-[12px] font-medium">*ต้องมีอย่างน้อย 6 คะแนนจึงจะรับทรานสคริปต์ได้*</h1>
            <div className="flex gap-4 sm:gap-8 mt-2">
              {(["27", "28", "29"] as const).map((day) => (
                <div key={`day-${day}`}>
                  <button
                    onClick={() => handleRedeem(day)}
                    disabled={redeemed[day] || redeemingDay === day}
                    className={`${redeemed[day] || redeemingDay === day ? "opacity-60 cursor-not-allowed" : ""}`}
                    aria-label={`รับทรานสคริปต์วันที่ ${day}`}
                  >
                    <img
                      src={redeemed[day] ? `/${day}c.png` : `/${day}.png`}
                      className="w-[70px] sm:w-[86px] h-[70px] sm:h-[86px]"
                      alt={`day-${day}`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <h1 className="font-bold text-[16px] text-blueBrand pt-4 text-center">
            เปิดหน้านี้เมื่อต้องการรับทรานสคริปต์
          </h1>
        </div>

        {/* ปุ่มกลับหน้าหลัก */}
        <div className="flex justify-center mt-6">
          <a href="/homepage" className="bg-blueBrand w-[250px] h-[49px] rounded-[30px] flex justify-center items-center">
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
            <h1 className="text-blueBrand font-semibold text-[18px] mb-4">{popupMessage}</h1>
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
