"use client";

import Navbar from "../components/Navbar";
import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RedeemSuccess = {
  message: string;
  booth: { id: string; name: string };
  entitlementKey: string;
  playPassId: string;
  remainingScore: number | null;
};

type ProfileHeader = {
  name: string;
  student_id: string;
  status: string;
  dept: string;
};

export default function TransferpointPage() {
  const [confirmPopup, setConfirmPopup] = useState(false);
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<RedeemSuccess | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ โปรไฟล์สำหรับแสดงหัวข้อด้านบน
  const [profile, setProfile] = useState<ProfileHeader | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false); // กัน start ซ้อน
  const mountedRef = useRef(false);
  const resizeTimerRef = useRef<number | null>(null);
  const lastStartAtRef = useRef<number>(0); // cooldown
  const lastSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const router = useRouter();

  const COOL_DOWN_MS = 1200;
  const RESIZE_DEBOUNCE_MS = 350;
  const SIZE_THRESHOLD_RATIO = 0.12; // เปลี่ยนเกิน 12% ค่อย restart

  const computeQrbox = (vw: number, vh: number) => {
    const minSide = Math.min(vw, vh);
    let scale = 0.92;
    if (minSide > 700) scale = 0.8;
    if (minSide > 1000) scale = 0.7;
    const size = Math.max(180, Math.min(Math.floor(minSide * scale), 640));
    return { width: size, height: size };
  };

  const stopScanner = async () => {
    try {
      if (qrScannerRef.current) {
        await qrScannerRef.current.stop();
      }
    } catch {}
    try {
      if (qrScannerRef.current) {
        // clear() ไม่คืน Promise → ห้าม .catch
        qrScannerRef.current.clear();
      }
    } catch {}
  };

  const startScanner = async () => {
    if (startingRef.current) return;
    startingRef.current = true;

    try {
      setErrorMsg(null);

      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5Qrcode("qr-reader");
      } else {
        // บางอุปกรณ์ต้องเคลียร์ DOM เดิมก่อนเริ่มใหม่ (clear() ไม่คืน Promise)
        try {
          qrScannerRef.current.clear();
        } catch {}
      }

      await qrScannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          aspectRatio: 1,
          qrbox: (vw: number, vh: number) => computeQrbox(vw, vh),
        },
        async (decodedText) => {
          try {
            await stopScanner();
          } catch {}
          setScannedQR(decodedText.trim());
          setConfirmPopup(true);
          setResult(null);
          setErrorMsg(null);
        },
        () => {}
      );

      lastStartAtRef.current = Date.now();
      lastSizeRef.current = { w: window.innerWidth, h: window.innerHeight };
    } catch (err) {
      console.error("QR Scan Error", err);
      setErrorMsg("ไม่สามารถเปิดกล้องเพื่อสแกนได้ กรุณาอนุญาตการเข้าถึงกล้อง");
    } finally {
      startingRef.current = false;
    }
  };

  const restartScan = async () => {
    // ป้องกัน spam
    if (Date.now() - lastStartAtRef.current < COOL_DOWN_MS) return;
    await stopScanner();
    // เว้นจังหวะเล็กน้อยให้ระบบคืนสิทธิ์กล้อง
    await new Promise((r) => setTimeout(r, 120));
    await startScanner();
  };

  // ✅ ดึงโปรไฟล์สำหรับโชว์ในหัวข้อ (เรียกครั้งเดียว ไม่ redirect)
  useEffect(() => {
    let isMounted = true;
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/profile", {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          const p: ProfileHeader = {
            name: data?.name ?? "—",
            student_id: data?.student_id ?? "—",
            status: data?.status ?? "—",
            dept: data?.dept ?? "—",
          };
          setProfile(p);
        } else {
          setProfile(null);
        }
      } catch {
        if (isMounted) setProfile(null);
      }
    })();

    return () => {
      isMounted = false;
      ac.abort();
    };
  }, []);

  // เริ่มสแกนครั้งแรก
  useEffect(() => {
    mountedRef.current = true;
    startScanner();

    return () => {
      mountedRef.current = false;
      // เคลียร์ debounce
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // แก้ 100vh บน iOS
  useEffect(() => {
    const setVh = () =>
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, []);

  // รีสตาร์ตกล้องแบบ debounce เมื่อหน้าจอเปลี่ยน "มากพอ"
  useEffect(() => {
    const onResize = () => {
      if (confirmPopup || result) return; // มี overlay อยู่ ไม่ต้องยุ่ง

      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = window.setTimeout(async () => {
        const { w: lw, h: lh } = lastSizeRef.current;
        const nw = window.innerWidth;
        const nh = window.innerHeight;

        // ยังไม่เคยบันทึกขนาด → บันทึกและไม่ restart รอบแรก
        if (lw === 0 && lh === 0) {
          lastSizeRef.current = { w: nw, h: nh };
          return;
        }

        const dw = Math.abs(nw - lw) / Math.max(lw, 1);
        const dh = Math.abs(nh - lh) / Math.max(lh, 1);
        const changedEnough = dw > SIZE_THRESHOLD_RATIO || dh > SIZE_THRESHOLD_RATIO;

        if (changedEnough) {
          await restartScan();
        } else {
          lastSizeRef.current = { w: nw, h: nh };
        }
      }, RESIZE_DEBOUNCE_MS) as unknown as number;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPopup, result]);

  // พัก/กลับมาเปิดกล้องตาม visibility (ลดภาระ/บัคบนมือถือ)
  useEffect(() => {
    const onVis = async () => {
      if (!mountedRef.current) return;
      if (document.hidden) {
        await stopScanner();
      } else if (!confirmPopup && !result) {
        await restartScan();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPopup, result]);

  const redeem = async () => {
    if (!scannedQR) return;
    setRedeeming(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch("/api/booth/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr: scannedQR }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || "แลกสิทธิ์ไม่สำเร็จ");
      } else {
        // ✅ เก็บข้อมูลการแลกล่าสุดไว้ที่ sessionStorage
        try {
          sessionStorage.setItem(
            "lastRedeemSlip",
            JSON.stringify({ ...data, scannedQR })
          );
        } catch {}

        // ถ้าจะคงไว้แสดงการ์ดในหน้านี้ด้วยก็ไม่ห้าม
        setResult(data as RedeemSuccess);

        // ✅ ไปหน้า slip
        router.push("/sliptransferpoint");
      }
    } catch (e) {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setRedeeming(false);
      setConfirmPopup(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col justify-center items-center gap-10 px-4 py-6">
        {/* Profile Section (ดึงจาก /api/profile) */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 text-center md:text-left">
          <div className="text-blueBrand flex flex-col gap-1">
            <h1 className="text-[22px] font-bold">{profile?.name ?? "กำลังโหลด..."}</h1>
            <h1 className="text-[16px]">
              {profile
                ? `${profile.student_id} สถานะ : ${profile.status}`
                : " "}
            </h1>
            <h1 className="text-[16px]">{profile?.dept ?? " "}</h1>
          </div>
          <img src="/prog.jpg" alt="โปรไฟล์" className="w-[110px] h-[110px]" />
        </div>

        {/* QR Scanner (responsive) */}
        <div className="w-[min(92vw,560px)] md:w-[min(70vw,560px)]">
          <div className="relative aspect-square rounded-[20px] border-2 border-blueBrand overflow-hidden">
            {/* html5-qrcode จะ inject <video> ลงใน div นี้ */}
            <div
              id="qr-reader"
              className="absolute inset-0 [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-[20px]"
            />
            {/* Corners */}
            <div className="pointer-events-none absolute top-4 left-4 w-[40px] h-[40px] border-t-[6px] border-l-[6px] border-blueBrand rounded-tl-[12px]" />
            <div className="pointer-events-none absolute top-4 right-4 w-[40px] h-[40px] border-t-[6px] border-r-[6px] border-blueBrand rounded-tr-[12px]" />
            <div className="pointer-events-none absolute bottom-4 left-4 w-[40px] h-[40px] border-b-[6px] border-l-[6px] border-blueBrand rounded-bl-[12px]" />
            <div className="pointer-events-none absolute bottom-4 right-4 w-[40px] h-[40px] border-b-[6px] border-r-[6px] border-blueBrand rounded-br-[12px]" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={restartScan}
            className="px-5 py-2 rounded-[30px] bg-blueBrand text-white text-[16px]"
          >
            เปิดกล้องใหม่
          </button>
          <a
            href="/profile"
            className="px-5 py-2 rounded-[30px] bg-pinkBrand text-white text-[16px] flex items-center justify-center"
          >
            กลับโปรไฟล์
          </a>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div className="w-full max-w-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Success card */}
        {result && (
          <div className="w-full max-w-lg bg-white border rounded-xl shadow p-5">
            <div className="flex items-center gap-3 text-green-700">
              <span className="text-2xl">✅</span>
              <h2 className="text-xl font-bold">แลกสิทธิ์สำเร็จ</h2>
            </div>
            <p className="mt-2 text-gray-700">{result.message}</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">บูธ</div>
                <div className="font-medium">{result.booth.name}</div>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <div className="text-gray-500">คะแนนคงเหลือ</div>
                <div className="font-semibold">{result.remainingScore ?? "—"}</div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={restartScan}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                สแกนต่อ
              </button>
              <button
                onClick={() => router.push("/profile")}
                className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-800"
              >
                กลับโปรไฟล์
              </button>
            </div>
          </div>
        )}

        {/* Confirm Popup */}
        {confirmPopup && scannedQR && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 px-4">
            <div className="bg-white rounded-xl p-6 shadow-xl text-center flex flex-col gap-4 w-full max-w-[340px]">
              <h1 className="text-blueBrand font-bold text-lg">
                ยืนยันแลกคะแนนเพื่อสิทธิ์เล่นกิจกรรมหรือไม่
              </h1>
              <div className="text-xs text-gray-600 break-all font-mono bg-gray-50 p-2 rounded">
                {scannedQR}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  onClick={redeem}
                  disabled={redeeming}
                  className="w-full sm:w-auto px-6 py-2 bg-blueBrand text-white rounded-[30px] disabled:opacity-60"
                >
                  {redeeming ? "กำลังแลก..." : "ยืนยันแลกสิทธิ์"}
                </button>
                <button
                  onClick={async () => {
                    setConfirmPopup(false);
                    setScannedQR(null);
                    await restartScan();
                  }}
                  className="w-full sm:w-auto px-6 py-2 bg-gray-400 text-white rounded-[30px]"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
