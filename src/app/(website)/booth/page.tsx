// src/app/(website)/booth/page.tsx
"use client";

import Navbar from "../components/Navbar";
import { useSearchParams, useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useEffect, useRef, useState, Suspense, useMemo } from "react";
import dynamic from "next/dynamic";

// ✅ ใช้ Scanner ของ @yudiel/react-qr-scanner (client only)
const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false }
);

type Booth = {
  booth_name: string;
  description: string;
  pics: string[];
  owner_names: string[];
  owner_images: string[];
  dept_type: string;
};

function BoothContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const boothId = searchParams.get("id");

  const [booth, setBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);

  // modal: manual code
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");

  // modal: scanner
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [secureHint, setSecureHint] = useState<string | null>(null);
  const scanningLockRef = useRef(false); // กันยิงซ้ำ

  // รายการกล้อง & ตัวที่เลือก
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [preferFront, setPreferFront] = useState(true); // ✅ เริ่มต้นกล้องหน้า

  // result state
  const [showResult, setShowResult] = useState<"correct" | "wrong" | null>(null);
  const [checking, setChecking] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boothId) return;
    fetch(`/api/booth/${boothId}/basic`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setBooth({
            booth_name: data.booth_name,
            description: data.description,
            pics: data.pics || [],
            owner_names: data.owner_names || [],
            owner_images: data.owner_images || [],
            dept_type: data.dept_type || "ไม่ระบุประเภท",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [boothId]);

  // แจ้งเตือนถ้าไม่ใช่ HTTPS (ยกเว้น localhost)
  useEffect(() => {
    const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
    setSecureHint(!isLocalhost && !isSecure ? "ต้องเข้าผ่าน HTTPS เท่านั้นถึงจะเปิดกล้องได้" : null);
  }, [showScannerModal]);

  // เปิด modal สแกน → ขอ permission + enumerate อุปกรณ์
  useEffect(() => {
    if (!showScannerModal) return;
    (async () => {
      try {
        // ✅ ขอสิทธิ์พร้อมชี้นำให้เริ่มที่ 'user' (กล้องหน้า) เพื่อให้ browser เลือก stream ที่ถูก
        await navigator.mediaDevices.getUserMedia({
          video: { facingMode: preferFront ? "user" : "environment" },
        });

        const all = await navigator.mediaDevices.enumerateDevices();
        const vids = all.filter((d) => d.kind === "videoinput");
        setCameras(vids);

        if (!selectedDeviceId && vids.length) {
          // ✅ พยายามจับชื่อกล้องหน้า/หลังจาก label
          const front = vids.find((d) => /front|user|selfie|face/i.test(d.label));
          const back = vids.find((d) => /back|rear|environment/i.test(d.label));

          const firstChoice = preferFront ? (front || vids[0]) : (back || vids[0]);
          setSelectedDeviceId(firstChoice.deviceId);
        }
      } catch (e: any) {
        setScanError(e?.message || "เปิดกล้องไม่สำเร็จ (HTTPS หรือ permission?)");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScannerModal, preferFront]);

  // -------- join booth ----------
  async function doJoin(boothCode: string) {
    setChecking(true);
    try {
      const res = await fetch("/api/join-booth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ boothCode: boothCode.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setShowResult("correct");
        setTimeout(() => {
          setShowResult(null);
          setShowPasswordModal(false);
          setShowScannerModal(false);
          router.push("/profile");
        }, 1000);
      } else {
        setShowResult("wrong");
        setScanError(typeof data?.error === "string" ? data.error : "เข้าร่วมไม่สำเร็จ");
      }
    } catch {
      setShowResult("wrong");
      setScanError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setChecking(false);
      scanningLockRef.current = false; // ปลดล็อกให้สแกนใหม่ได้
    }
  }

  // ดึงรหัสบูธจากข้อความใน QR (รองรับ JSON, URL, โค้ดล้วน)
  function extractBoothCodeFromQR(text: string): string | null {
    const raw = (text || "").trim();
    if (!raw) return null;

    try {
      const o = JSON.parse(raw);
      if (o && typeof o.boothCode === "string" && o.boothCode.trim()) {
        return o.boothCode.trim();
      }
    } catch { /* not json */ }

    try {
      const u = new URL(raw);
      const code = u.searchParams.get("booth") || u.searchParams.get("boothCode");
      if (code && code.trim()) return code.trim();
    } catch { /* not url */ }

    if (/^[A-Za-z0-9_-]{2,}$/.test(raw)) return raw;

    return null;
  }

  // manual join
  const handleConfirmJoin = () => {
    setPassword("");
    setShowPasswordModal(true);
  };
  const handleCheckPassword = () => {
    if (!password.trim()) return;
    doJoin(password.trim());
  };

  // scanner
  const handleOpenScanner = () => {
    setScanError(null);
    setShowScannerModal(true);
  };
  const handleScanDecoded = (value: string) => {
    if (scanningLockRef.current) return;
    scanningLockRef.current = true;

    const code = extractBoothCodeFromQR(value);
    if (!code) {
      setShowResult("wrong");
      setScanError("รูปแบบ QR ไม่ถูกต้อง");
      scanningLockRef.current = false;
      return;
    }
    doJoin(code);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      setShowPasswordModal(false);
      setShowScannerModal(false);
      setShowResult(null);
      setScanError(null);
      scanningLockRef.current = false;
    }
  };

  // ✅ ใช้ constraints แบบอิง deviceId ถ้ามี, ไม่มีก็ชี้นำที่กล้องหน้า ('user') เพื่อเริ่มจากกล้องหน้า
  const constraints = useMemo<MediaTrackConstraints>(() => {
    if (selectedDeviceId) {
      return {
        deviceId: { exact: selectedDeviceId },
        // ✅ ลดความละเอียดเพื่อความเร็วในการสแกน
        width: { ideal: 640 },
        height: { ideal: 480 },
        aspectRatio: { ideal: 4 / 3 },
      };
    }
    return {
      facingMode: preferFront ? { ideal: "user" } : { ideal: "environment" },
      width: { ideal: 640 },
      height: { ideal: 480 },
      aspectRatio: { ideal: 4 / 3 },
    };
  }, [selectedDeviceId, preferFront]);

  if (loading) return <div className="text-center mt-10">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center gap-10 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
        <a href="/category">
          <img src="bbt.png" alt="back" className="w-[50px] h-[50px] sm:w-[60px] sm:h-[60px]" />
        </a>
        <div className="w-full sm:w-[281px] h-[50px] sm:h-[56px] rounded-[30px] flex justify-center items-center bg-blueBrand">
          <h1 className="text-[20px] sm:text-[24px] font-bold text-white">
            {booth?.dept_type || "ไม่ระบุประเภท"}
          </h1>
        </div>
      </div>

      {/* Swiper */}
      <div className="w-full max-w-[670px] h-[300px] sm:h-[450px] rounded-lg overflow-hidden">
        <Swiper
          modules={[Pagination, Autoplay]}
          pagination={{ clickable: true }}
          spaceBetween={20}
          slidesPerView={1.2}
          centeredSlides
          autoplay={{ delay: 10000, disableOnInteraction: false }}
          className="h-full"
        >
          {booth?.pics.map((img, idx) => (
            <SwiperSlide key={idx}>
              <img src={img} alt={`slide-${idx}`} className="rounded-xl w-full h-full object-cover" />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Details */}
      <div className="text-center text-blueBrand px-4 max-w-lg">
        <h2 className="font-bold text-lg">ชื่อบูธ/ผลงานวิจัย</h2>
        <p className="whitespace-pre-wrap">{booth?.booth_name || "-"}</p>
        <p className="mt-4 text-sm">รายละเอียด</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{booth?.description || "-"}</p>
      </div>

      {/* Owners */}
      <div>
        <div className="flex justify-center font-bold text-lg text-center sm:text-left">ผู้จัดทำ</div>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-6">
          {booth?.owner_names && booth.owner_names.length > 0 ? (
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-10">
              {booth.owner_names.map((ownerName, index) => (
                <div key={index} className="flex flex-col items-center text-center max-w-[150px]">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-md flex-shrink-0">
                    {booth.owner_images && booth.owner_images[index] ? (
                      <img
                        src={booth.owner_images[index]}
                        alt={`เจ้าของบูธ ${ownerName}`}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300">
                        <span className="text-gray-600 text-sm font-medium">รูป</span>
                      </div>
                    )}
                  </div>
                  {/* make owner name to be same line*/}
                  <p className="text-sm font-medium text-gray-800 mt-2 break-words line-clamp-2 text-center">{ownerName}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">ไม่มีข้อมูลเจ้าของบูธ</p>
          )}
        </div>
      </div>

      {/* Join Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleConfirmJoin}
          className="w-[220px] sm:w-[250px] h-[45px] sm:h-[50px] bg-pink-500 rounded-[30px] text-white font-bold"
        >
          กรอกรหัสเข้าร่วม
        </button>
        <button
          onClick={handleOpenScanner}
          className="w-[220px] sm:w-[250px] h-[45px] sm:h-[50px] bg-gray-800 rounded-[30px] text-white font-bold"
        >
          สแกน QR เข้าร่วม
        </button>
      </div>

      {/* Modal: manual code */}
      {showPasswordModal && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4"
        >
          {!showResult && (
            <div className="bg-blueBrand rounded-[30px] w-full max-w-[400px] p-6 text-white text-center">
              <h2 className="text-2xl font-bold mb-2">รหัสประจำบูธ</h2>
              <p className="text-sm mb-6">***กรุณาให้เจ้าของบูธกรอกรหัส***</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัส*"
                className="w-full h-12 rounded-full px-4 text-black mb-6"
              />
              <button
                onClick={handleCheckPassword}
                disabled={checking || !password.trim()}
                className="w-full bg-pink-500 py-2 rounded-full font-bold text-white disabled:opacity-50"
              >
                {checking ? "กำลังตรวจสอบ..." : "ยืนยัน"}
              </button>
            </div>
          )}

          {showResult === "correct" && (
            <div className="bg-blueBrand rounded-[30px] w-full max-w-[300px] p-6 text-white text-center">
              <h2 className="text-xl font-bold mb-4">สำเร็จ</h2>
              <img src="/correct.jpg" alt="correct" className="mx-auto w-[120px] mb-6" />
              <p>กำลังพากลับไปหน้าโปรไฟล์…</p>
            </div>
          )}

          {showResult === "wrong" && (
            <div className="bg-blueBrand rounded-[30px] w-full max-w-[300px] p-6 text-white text-center">
              <h2 className="text-xl font-bold mb-4">ไม่สำเร็จ</h2>
              <img src="/incorrec.jpg" alt="wrong" className="mx-auto w-[120px] mb-6" />
              <p className="text-sm mb-3">{scanError || "รหัสไม่ถูกต้อง"}</p>
              <button
                onClick={() => {
                  setShowResult(null);
                  setScanError(null);
                }}
                className="w-full bg-pink-500 py-2 rounded-full font-bold"
              >
                กลับ
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: scanner */}
      {showScannerModal && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4"
        >
          {!showResult && (
            <div className="bg-white rounded-2xl w-full max-w-[560px] p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3 text-center">
                สแกน QR เพื่อเข้าร่วมบูธ
              </h2>

              {secureHint && (
                <div className="mb-3 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
                  {secureHint}
                </div>
              )}

              {/* เลือกกล้อง & ปุ่มสลับ */}
              {(cameras.length > 1 || selectedDeviceId) && (
                <div className="mb-3 flex flex-wrap items-center gap-2 justify-center">
                  {cameras.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="px-3 py-2 border rounded-md text-sm"
                    >
                      {cameras.map((c) => (
                        <option key={c.deviceId} value={c.deviceId}>
                          {c.label || `Camera ${c.deviceId.slice(0, 6)}…`}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => {
                      setPreferFront((v) => !v);
                      // เคลียร์เลือกเดิมเพื่อบังคับ re-init scanner ด้วย facingMode ใหม่
                      setSelectedDeviceId("");
                      scanningLockRef.current = false;
                      setScanError(null);
                    }}
                    className="px-3 py-2 rounded-md bg-gray-800 text-white text-sm"
                  >
                    สลับกล้อง (หน้า/หลัง)
                  </button>
                </div>
              )}

              {/* กล้องสแกน */}
              <div className="rounded-xl overflow-hidden border bg-black">
                <Scanner
                  key={String(showScannerModal) + selectedDeviceId + String(preferFront)} // re-init เมื่อสลับกล้อง
                  constraints={constraints}
                  // ✅ ลด delay ให้สแกนถี่ขึ้น
                  scanDelay={100}
                  onScan={(results) => {
                    const text =
                      Array.isArray(results) && results.length > 0
                        ? results[0]?.rawValue
                        : undefined;
                    if (!text) return;
                    if (scanningLockRef.current) return;
                    scanningLockRef.current = true;
                    const code = extractBoothCodeFromQR(String(text));
                    if (!code) {
                      setShowResult("wrong");
                      setScanError("รูปแบบ QR ไม่ถูกต้อง");
                      scanningLockRef.current = false;
                      return;
                    }
                    doJoin(code);
                  }}
                  onError={(err: any) =>
                    setScanError(err?.message || "เปิดกล้องไม่สำเร็จ")
                  }
                  components={{ finder: true, torch: true }}
                />
              </div>

              {scanError && (
                <p className="mt-3 text-center text-sm text-red-600">⚠️ {scanError}</p>
              )}
              <div className="mt-4 flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setShowScannerModal(false);
                    setScanError(null);
                    scanningLockRef.current = false;
                  }}
                  className="px-4 py-2 rounded-full bg-gray-700 text-white"
                >
                  ปิด
                </button>
              </div>
            </div>
          )}

          {showResult === "correct" && (
            <div className="bg-blueBrand rounded-[30px] w-full max-w-[300px] p-6 text-white text-center">
              <h2 className="text-xl font-bold mb-4">สำเร็จ</h2>
              <img src="/correct.jpg" alt="correct" className="mx-auto w-[120px] mb-6" />
              <p>กำลังพากลับไปหน้าโปรไฟล์…</p>
            </div>
          )}

          {showResult === "wrong" && (
            <div className="bg-blueBrand rounded-[30px] w-full max-w-[300px] p-6 text-white text-center">
              <h2 className="text-xl font-bold mb-4">ไม่สำเร็จ</h2>
              <img src="/incorrec.jpg" alt="wrong" className="mx-auto w-[120px] mb-6" />
              <p className="text-sm mb-3">{scanError || "เข้าร่วมไม่สำเร็จ"}</p>
              <button
                onClick={() => {
                  setShowResult(null);
                  setScanError(null);
                  scanningLockRef.current = false;
                }}
                className="w-full bg-pink-500 py-2 rounded-full font-bold"
              >
                ลองใหม่
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BoothPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="text-center mt-10">กำลังโหลด...</div>}>
        <BoothContent />
      </Suspense>
    </>
  );
}
