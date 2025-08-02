'use client';

import Navbar from "../components/Navbar";
import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TransferpointPage() {
  const [showPopup, setShowPopup] = useState(false);
  const [confirmPopup, setConfirmPopup] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const router = useRouter();

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    qrScannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
        },
        () => {
          html5QrCode.stop().then(() => html5QrCode.clear());
          setConfirmPopup(true);
        },
        () => {}
      )
      .catch((err) => console.error("QR Scan Error", err));

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().then(() => {
          qrScannerRef.current?.clear();
        });
      }
    };
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col justify-center items-center gap-10 px-4 py-6">
        {/* Profile Section */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 text-center md:text-left">
          <div className="text-blueBrand flex flex-col gap-1">
            <h1 className="text-[22px] font-bold">รลิตา เครือระยา</h1>
            <h1 className="text-[16px]">65023938 สถานะ : นิสิต</h1>
            <h1 className="text-[16px]">คณะเทคโนโลยีสารสนเทศและการสื่อสาร</h1>
          </div>
          <img src="/prog.jpg" alt="โปรไฟล์" className="w-[110px] h-[110px]" />
        </div>

        {/* QR Scanner */}
        <div className="w-full max-w-[300px] aspect-square bg-gray-300 rounded-[20px] relative border-2 border-blueBrand overflow-hidden flex justify-center items-center">
          <div id="qr-reader" className="w-full h-full" />
          {/* Scanner Frame Corners */}
          <div className="absolute top-4 left-4 w-[40px] h-[40px] border-t-[6px] border-l-[6px] border-blueBrand rounded-tl-[12px]" />
          <div className="absolute top-4 right-4 w-[40px] h-[40px] border-t-[6px] border-r-[6px] border-blueBrand rounded-tr-[12px]" />
          <div className="absolute bottom-4 left-4 w-[40px] h-[40px] border-b-[6px] border-l-[6px] border-blueBrand rounded-bl-[12px]" />
          <div className="absolute bottom-4 right-4 w-[40px] h-[40px] border-b-[6px] border-r-[6px] border-blueBrand rounded-br-[12px]" />
        </div>

        {/* Back Button */}
        <a
          href="/profile"
          className="w-full max-w-[250px] h-[49px] rounded-[30px] bg-pinkBrand flex justify-center items-center text-white text-[16px]"
        >
          กลับ
        </a>

        {/* Confirm Popup */}
        {confirmPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 px-4">
            <div className="bg-white rounded-xl p-6 shadow-xl text-center flex flex-col gap-4 w-full max-w-[320px]">
              <h1 className="text-blueBrand font-bold text-lg">ยืนยันแลกคะแนนรับของรางวัลหรือไม่</h1>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => router.push("/profile")}
                  className="w-full sm:w-auto px-6 py-2 bg-blueBrand text-white rounded-[30px]"
                >
                  ยืนยัน
                </button>
                <button
                  onClick={() => setConfirmPopup(false)}
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
