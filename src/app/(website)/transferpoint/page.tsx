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

export default function TransferpointPage() {
  const [confirmPopup, setConfirmPopup] = useState(false);
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [result, setResult] = useState<RedeemSuccess | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const router = useRouter();

  // เริ่มสแกน
  useEffect(() => {
    const startScanner = async () => {
      try {
        if (!qrScannerRef.current) {
          qrScannerRef.current = new Html5Qrcode("qr-reader");
        }
        await qrScannerRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            // ทำให้กรอบสแกนใหญ่เกือบเต็ม container (90%)
            qrbox: (vw: number, vh: number) => {
              const s = Math.floor(Math.min(vw, vh) * 0.9);
              return { width: s, height: s };
            },
            aspectRatio: 1.0, // บังคับเป็นสี่เหลี่ยมจัตุรัส
          },
          async (decodedText /*, decodedResult*/) => {
            try {
              await qrScannerRef.current?.stop();
              await qrScannerRef.current?.clear();
            } catch {}
            setScannedQR(decodedText.trim());
            setConfirmPopup(true);
            setErrorMsg(null);
            setResult(null);
          },
          () => {} // ไม่ต้องทำอะไรเมื่ออ่านไม่สำเร็จในแต่ละเฟรม
        );
      } catch (err) {
        console.error("QR Scan Error", err);
        setErrorMsg(
          "ไม่สามารถเปิดกล้องเพื่อสแกนได้ กรุณาอนุญาตการเข้าถึงกล้อง"
        );
      }
    };

    startScanner();

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().finally(() => {
          qrScannerRef.current?.clear();
        });
      }
    };
  }, []);

  const restartScan = async () => {
    setConfirmPopup(false);
    setScannedQR(null);
    setResult(null);
    setErrorMsg(null);
    try {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5Qrcode("qr-reader");
      } else {
        // เผื่อบางอุปกรณ์ต้อง clear ก่อน
        await qrScannerRef.current.clear();
      }
      await qrScannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          try {
            await qrScannerRef.current?.stop();
            await qrScannerRef.current?.clear();
          } catch {}
          setScannedQR(decodedText.trim());
          setConfirmPopup(true);
          setErrorMsg(null);
          setResult(null);
        },
        () => {}
      );
    } catch (e) {
      console.error(e);
      setErrorMsg("ไม่สามารถเริ่มสแกนใหม่ได้");
    }
  };

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
        setResult(data as RedeemSuccess);
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
        {/* Profile Section (ตัวอย่าง) */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 text-center md:text-left">
          <div className="text-blueBrand flex flex-col gap-1">
            <h1 className="text-[22px] font-bold">รลิตา เครือระยา</h1>
            <h1 className="text-[16px]">65023938 สถานะ : นิสิต</h1>
            <h1 className="text-[16px]">คณะเทคโนโลยีสารสนเทศและการสื่อสาร</h1>
          </div>
          <img src="/prog.jpg" alt="โปรไฟล์" className="w-[110px] h-[110px]" />
        </div>

        {/* QR Scanner */}
        <div className="w-full max-w-[320px]">
          <div className="relative aspect-square rounded-[20px] border-2 border-blueBrand overflow-hidden">
            {/* html5-qrcode จะใส่ <video> ลงใน div นี้ */}
            <div
              id="qr-reader"
              className="
        absolute inset-0
        [&_video]:w-full [&_video]:h-full [&_video]:object-cover
        [&_video]:rounded-[20px]
      "
            />
            {/* มุมกรอบสีน้ำเงิน (คงไว้ได้) */}
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
            🔄 สแกนอีกครั้ง
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
                <div className="font-semibold">
                  {result.remainingScore ?? "—"}
                </div>
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
                  onClick={() => {
                    setConfirmPopup(false);
                    // ยกเลิกแล้วให้สแกนต่อได้เลย
                    restartScan();
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
