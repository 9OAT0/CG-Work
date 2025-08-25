"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface MaintenanceData {
  isEnabled: boolean;
  isActive?: boolean; // ✅ รองรับคีย์ใหม่จาก API
  title: string;
  message: string;
  startTime?: string | null; // ✅ ให้เป็น string | null ตรงกับ API
  endTime?: string | null; // ✅ ให้เป็น string | null ตรงกับ API
}

interface WorkingHours {
  startHour: number; // 0-23 (เวลาไทย)
  endHour: number; // 0-23 (เวลาไทย)
  isEnabled: boolean;
}

function formatThaiDateTime(d: Date) {
  return d.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function msToHHMMSS(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

// ใช้ “เวลาไทย” สำหรับการโชว์/เทียบแบบภายในหน้า
function nowInBangkok(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
}
function todayAtBangkok(hour: number, minute = 0, second = 0): Date {
  const th = nowInBangkok();
  th.setHours(hour, minute, second, 0);
  return th;
}

function MaintenanceContent() {
  const searchParams = useSearchParams();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [timeUntilOpen, setTimeUntilOpen] = useState<string>("00:00:00");
  const [maintenanceData, setMaintenanceData] =
    useState<MaintenanceData | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);

  // ใช้เพื่อโชว์ข้อความพิเศษหลัง login
  const isWorkingHoursReason = searchParams.get("reason") === "working_hours";

  // --- ดึงข้อมูลจาก API ---
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/maintenance-status", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch maintenance status");
        const data = await res.json();

        const m: MaintenanceData | null =
          data?.maintenance ?? data?.maintenanceMode ?? null;
        const w: WorkingHours | null =
          data?.workingHours ?? data?.working_hours ?? null;

        setMaintenanceData(m);
        setWorkingHours(w);
        // ✅ ใช้คีย์ isActive ก่อน ถ้าไม่มีค่อย fallback isEnabled
        setIsMaintenanceMode(Boolean(m?.isActive ?? m?.isEnabled));
      } catch (e) {
        console.error("Error fetching /api/maintenance-status:", e);
        // ค่า fallback
        setMaintenanceData({
          isEnabled: false,
          isActive: false,
          title: "ระบบอยู่ในช่วงปรับปรุง",
          message: "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง",
          startTime: null,
          endTime: null,
        });
        setWorkingHours({ startHour: 6, endHour: 16, isEnabled: true });
        setIsMaintenanceMode(false);
      }
    };
    fetchStatus();
  }, []);

  // --- นาฬิกา & นับถอยหลัง ---
  useEffect(() => {
    const tick = () => {
      const nowTH = nowInBangkok();
      setCurrentTime(formatThaiDateTime(nowTH));

      // 1) Maintenance เปิด + มี endTime → นับถอยหลังถึง endTime (ISO พร้อม timezone)
      if (isMaintenanceMode && maintenanceData?.endTime) {
        const end = new Date(maintenanceData.endTime).getTime();
        const diffMs = end - Date.now();
        setTimeUntilOpen(msToHHMMSS(diffMs));
        return;
      }

      // 2) ไม่อยู่ใน Maintenance → ใช้ Working Hours จาก API
      if (workingHours?.isEnabled) {
        const startH = workingHours.startHour;
        const endH = workingHours.endHour;

        const openToday = todayAtBangkok(startH, 0, 0);
        const closeToday = todayAtBangkok(endH, 0, 0);

        if (nowTH < openToday) {
          setTimeUntilOpen(msToHHMMSS(openToday.getTime() - nowTH.getTime()));
        } else if (nowTH >= openToday && nowTH < closeToday) {
          setTimeUntilOpen("00:00:00");
        } else {
          const openTomorrow = todayAtBangkok(startH, 0, 0);
          openTomorrow.setDate(openTomorrow.getDate() + 1);
          setTimeUntilOpen(
            msToHHMMSS(openTomorrow.getTime() - nowTH.getTime())
          );
        }
        return;
      }

      // 3) ไม่เปิดใช้ working hours → ไม่นับถอยหลัง
      setTimeUntilOpen("00:00:00");
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [isMaintenanceMode, maintenanceData, workingHours]);

  const titleText = isWorkingHoursReason
    ? "นอกเวลาให้บริการ"
    : maintenanceData?.title || "ระบบอยู่ในช่วงปรับปรุง";

  const subBlock = (() => {
    if (isMaintenanceMode) {
      const startLabel = maintenanceData?.startTime
        ? formatThaiDateTime(new Date(maintenanceData.startTime))
        : null;
      const endLabel = maintenanceData?.endTime
        ? formatThaiDateTime(new Date(maintenanceData.endTime))
        : null;

      return (
        <>
          <p className="text-xl md:text-2xl text-white/90 mb-6 leading-relaxed">
            {maintenanceData?.message ||
              "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง"}
          </p>
          {(startLabel || endLabel) && (
            <div className="text-white/80 mb-4">
              {startLabel && (
                <p>
                  เริ่มปรับปรุง:{" "}
                  <span className="font-semibold">{startLabel}</span>
                </p>
              )}
              {endLabel && (
                <p>
                  สิ้นสุดการปรับปรุง:{" "}
                  <span className="font-semibold">{endLabel}</span>
                </p>
              )}
            </div>
          )}
        </>
      );
    }

    const label = workingHours
      ? `${workingHours.startHour
          .toString()
          .padStart(2, "0")}:00 - ${workingHours.endHour
          .toString()
          .padStart(2, "0")}:00 น.`
      : "06:00 - 16:00 น.";

    return (
      <>
        {isWorkingHoursReason && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200 text-lg font-semibold mb-2">
              🔐 การเข้าสู่ระบบสำเร็จแล้ว
            </p>
            <p className="text-yellow-100 text-sm">
              แต่ขณะนี้อยู่นอกเวลาให้บริการ กรุณารอจนถึงเวลาเปิดให้บริการ
            </p>
          </div>
        )}
        <p className="text-xl md:text-2xl text-white/90 mb-6 leading-relaxed">
          เว็บไซต์เปิดให้ใช้งานเวลา{" "}
          <span className="font-semibold text-yellow-300">{label}</span>
          <br />
          {!isWorkingHoursReason && (
            <span className="text-lg">ขณะนี้อยู่นอกเวลาให้บริการ</span>
          )}
        </p>
      </>
    );
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* ไอคอน */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-full backdrop-blur-sm border border-white/20 mb-6">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        {/* หัวเรื่อง */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {titleText}
        </h1>

        {/* การ์ดเนื้อหา */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 mb-8">
          {subBlock}

          {/* เวลาปัจจุบัน */}
          <div className="mb-6">
            <p className="text-white/70 text-sm mb-2">เวลาปัจจุบัน</p>
            <p className="text-2xl font-mono text-white bg-black/20 rounded-lg py-2 px-4 inline-block">
              {currentTime}
            </p>
          </div>

          {/* นับถอยหลังจนเปิดใช้งาน */}
          <div>
            <p className="text-white/70 text-sm mb-2">
              {isMaintenanceMode
                ? maintenanceData?.endTime
                  ? "สิ้นสุดการปรับปรุงในอีก"
                  : "กำลังปรับปรุง"
                : "เปิดให้ใช้งานอีก"}
            </p>
            <p className="text-3xl font-mono font-bold text-yellow-300 bg-black/20 rounded-lg py-3 px-6 inline-block">
              {isMaintenanceMode && !maintenanceData?.endTime
                ? "--:--:--"
                : timeUntilOpen}
            </p>
          </div>
        </div>

        {/* แถบข้อมูล Working Hours จาก API */}
        <div className="text-white/60 text-sm">
          <p className="mb-2">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            เวลาให้บริการ:{" "}
            {workingHours
              ? `${workingHours.startHour
                  .toString()
                  .padStart(2, "0")}:00 - ${workingHours.endHour
                  .toString()
                  .padStart(2, "0")}:00 น. (เวลาประเทศไทย)`
              : "06:00 - 16:00 น. (เวลาประเทศไทย)"}
          </p>
          <p>
            <span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-2"></span>
            ปิดให้บริการนอกช่วงเวลาข้างต้น
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-full backdrop-blur-sm border border-white/20 mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              กำลังโหลด...
            </h1>
          </div>
        </div>
      }
    >
      <MaintenanceContent />
    </Suspense>
  );
}
