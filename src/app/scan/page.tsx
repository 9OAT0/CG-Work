"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";

export default function ScanPage() {
    const router = useRouter();
    const divId = "qr-reader";
    const qrRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            try {
                const html5QrCode = new Html5Qrcode(divId);
                qrRef.current = html5QrCode;
                setScanning(true);

                await html5QrCode.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 280, height: 280 } },
                    async (text) => {
                        // หยุดทันทีเมื่อสแกนได้
                        if (!isMounted) return;
                        setScanning(false);
                        try {
                            await html5QrCode.stop();
                            await html5QrCode.clear();
                        } catch { }

                        // รองรับทั้ง “BBJOIN:<jwt>” และ boothCode ดิบ
                        const qrToken = text.startsWith("BBJOIN:") ? text.slice(7) : null;
                        const payload = qrToken ? { qrToken } : { boothCode: text };

                        const res = await fetch("/api/join-booth", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                        });
                        const data = await res.json().catch(() => ({}));

                        if (res.ok) {
                            alert(data.message || "เข้าร่วมบูธสำเร็จ");
                            router.replace("/homepage");
                        } else if (res.status === 401) {
                            alert("เซสชันหมดอายุ โปรดล็อกอินใหม่");
                            router.replace("/login?from=/scan");
                        } else {
                            alert(data.error || "ไม่สามารถเข้าร่วมบูธได้");
                            // กลับไปหน้าเดิม หรือเริ่มสแกนใหม่
                            router.replace("/homepage");
                        }
                    },
                    (decodeErr) => {
                        // ignore decode errors (ปกติจะเด้งตลอด)
                    }
                );
            } catch (e: any) {
                setError(e?.message || "ไม่สามารถใช้กล้องได้ (ต้องใช้งานผ่าน HTTPS)");
            }
        };
        init();

        return () => {
            isMounted = false;
            const q = qrRef.current;
            if (q) {
                Promise.resolve(q.stop()).catch(() => { });
                Promise.resolve(q.clear()).catch(() => { });
            }

        };
    }, []);

    return (
        <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center relative">
            <div id={divId} className="w-full max-w-md aspect-square" />

            {/* กรอบไกด์สีฟ้า */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[70vmin] max-w-[320px] aspect-square border-4 border-sky-400 rounded-xl shadow-[0_0_40px_rgba(56,189,248,0.6)]" />
            </div>

            {!scanning && !error && (
                <div className="absolute bottom-4 text-center text-sm opacity-80">กำลังเตรียมกล้อง...</div>
            )}
            {error && (
                <div className="absolute bottom-4 text-center text-red-300 text-sm">
                    {error} — เปิดสิทธิ์กล้อง/ใช้ HTTPS
                </div>
            )}
        </div>
    );
}
