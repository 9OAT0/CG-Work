"use client";

import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SlipPayload = {
  message: string;
  booth?: { id: string; name: string };
  entitlementKey?: string;
  playPassId?: string;
  remainingScore?: number | null;
  scannedQR?: string | null;
};

export default function SliptransferpointPage() {
  const router = useRouter();
  const [data, setData] = useState<SlipPayload | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lastRedeemSlip");
      if (raw) setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
  }, []);

  // กรณีเปิดหน้าเปล่าๆ ไม่มีข้อมูลล่าสุด
  if (!data) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col justify-center items-center gap-6 px-4 py-6">
          <p className="text-red-500 text-center">ไม่พบข้อมูลการแลกคะแนนล่าสุด</p>
          <button
            onClick={() => router.push("/transferpoint")}
            className="px-5 py-2 rounded-[30px] bg-blueBrand text-white"
          >
            กลับไปสแกน
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col justify-center items-center gap-8 px-4 py-6">
        <div className="bg-blueBrand w-full max-w-[480px] sm:max-w-[560px] rounded-[20px] text-white p-6 sm:p-8">
          {/* หัวเรื่อง */}
          <div className="text-center font-bold leading-tight mb-6 sm:mb-8">
            <h1 className="text-base sm:text-lg md:text-xl">แลกคะแนน</h1>
            <h1 className="text-base sm:text-lg md:text-xl">แลกสิทธิ์สำเร็จ</h1>
          </div>

          {/* ตัวเนื้อหา (responsive) */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-y-8 sm:gap-x-10 items-center">
            {/* ไอคอนแนวตั้ง */}
            <div className="flex flex-row sm:flex-col items-center justify-center gap-5 sm:gap-6">
              <img
                src="/check.png"
                alt="สำเร็จ"
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14"
              />
              <div className="flex items-center sm:flex-col gap-3 sm:gap-4">
                <img
                  src="/prog.jpg"
                  alt="โปรไฟล์"
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full object-cover"
                />
                <img
                  src="/arrow.jpg"
                  alt=""
                  className="w-5 h-7 sm:w-6 sm:h-8 sm:rotate-0 rotate-90"
                  aria-hidden
                />
              </div>
              <img
                src="/staff.png"
                alt="Staff"
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14"
              />
            </div>

            {/* ข้อความด้านขวา */}
            <div className="flex flex-col gap-6 sm:gap-8">
              <div>
                <h1 className="text-sm sm:text-base md:text-lg">
                  {data.message || "แลกสิทธิ์สำเร็จแล้ว"}
                </h1>
                {typeof data.remainingScore === "number" && (
                  <p className="opacity-90 mt-1 text-xs sm:text-sm md:text-base">
                    คะแนนคงเหลือ {data.remainingScore}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-sm sm:text-base md:text-lg">
                  บูธ: {data.booth?.name ?? "-"}
                </h1>
                {data.playPassId && (
                  <p className="text-xs sm:text-sm opacity-90">
                    Pass ID: {data.playPassId}
                  </p>
                )}
                {data.scannedQR && (
                  <p className="text-[10px] sm:text-xs opacity-70 break-all">
                    QR: {data.scannedQR}
                  </p>
                )}
              </div>

              <h1 className="text-sm sm:text-base md:text-lg">Staff ดูแลบูธ</h1>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center text-blueBrand text-center">
          <h1 className="text-sm sm:text-base">กรุณาแสดงหน้านี้</h1>
          <h1 className="text-sm sm:text-base">ให้ Staff ของจุดกิจกรรมดูก่อนยืนยัน</h1>
        </div>

        <a
          href="/profile"
          className="flex justify-center items-center rounded-[30px] h-11 sm:h-12 w-48 sm:w-[250px] bg-pinkBrand text-white text-sm sm:text-[16px]"
        >
          ยืนยัน
        </a>
      </div>
    </>
  );
}
