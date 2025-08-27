// app/admin/qr/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
// import Navbar from "@/app/components/Navbar"; // ถ้ามี Navbar ให้เปิดบรรทัดนี้และแก้ path ให้ตรงโปรเจกต์

type BoothMini = { id: string; booth_name: string; booth_code: string };
type PayloadMode = "BOOTH_CODE" | "JSON" | "DEEPLINK";

export default function AdminQRPage() {
  // always send cookies + avoid cache
  const authedFetch: typeof fetch = (input, init) =>
    fetch(input as any, { credentials: "include", cache: "no-store", ...(init || {}) });

  const [loading, setLoading] = useState(true);
  const [booths, setBooths] = useState<BoothMini[]>([]);
  const [selectedBoothId, setSelectedBoothId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // ตัวเลือก payload ของ QR
  const [mode, setMode] = useState<PayloadMode>("BOOTH_CODE");
  // พรีวิวผลลัพธ์
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrString, setQrString] = useState<string>("");

  const selectedBooth = useMemo(
    () => booths.find((b) => b.id === selectedBoothId) || null,
    [booths, selectedBoothId]
  );

  async function fetchBooths() {
    const res = await authedFetch("/api/admin/booths");
    if (!res.ok) throw new Error("โหลดรายชื่อบูธไม่สำเร็จ");
    const j = await res.json();
    const data: BoothMini[] = j.data || [];
    setBooths(data);
    if (data.length && !selectedBoothId) setSelectedBoothId(data[0].id);
  }

  useEffect(() => {
    (async () => {
      try {
        await fetchBooths();
      } catch (e: any) {
        setError(e?.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // สร้างข้อความที่จะใส่ใน QR ตาม mode ที่เลือก
  const buildQRString = () => {
    if (!selectedBooth) return "";
    const code = selectedBooth.booth_code.trim();

    switch (mode) {
      case "BOOTH_CODE":
        // เรียบง่ายสุด: สแกนแล้วได้ code ตรง ๆ -> ฝั่ง client ไป POST /api/join-booth { boothCode: code }
        return code;
      case "JSON":
        // ชัดเจน/กันชน พร้อมชนิด
        return JSON.stringify({ type: "JOIN_BOOTH", boothCode: code });
      case "DEEPLINK": {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "https://your-domain";
        // เลือก path ที่ทีมคุณจะให้สแกนแล้วพาไป (เช่น /scanner หรือ /join)
        // ทีมสแกนเพียงอ่าน query แล้วเรียก /api/join-booth
        return `${origin}/scanner?booth=${encodeURIComponent(code)}`;
      }
      default:
        return code;
    }
  };

  // เรนเดอร์ QR ฝั่ง client ด้วยไลบรารี qrcode
  const generateQR = async () => {
    if (!selectedBooth) {
      alert("กรุณาเลือกบูธ");
      return;
    }
    try {
      const content = buildQRString();
      setQrString(content);

      // dynamic import เพื่อลด bundle และกันกรณีไม่มีใน SSR
      const QR = await import("qrcode");
      const dataUrl = await QR.toDataURL(content, { width: 512, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch (e: any) {
      if (e?.code === "MODULE_NOT_FOUND") {
        alert('ไม่พบไลบรารี "qrcode" กรุณาติดตั้งด้วยคำสั่ง: npm i qrcode');
      } else {
        alert(e?.message || "สร้าง QR ไม่สำเร็จ");
      }
    }
  };

  const downloadPNG = () => {
    if (!qrDataUrl || !selectedBooth) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR_JOIN_${selectedBooth.booth_code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <>
        {/* <Navbar /> */}
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-xl">กำลังโหลด...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {/* <Navbar /> */}
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-xl text-red-600">เกิดข้อผิดพลาด: {error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* <Navbar /> */}
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">🎟️ Admin — สร้าง QR เข้าร่วมบูธ</h1>

          {/* เลือกบูธ + โหมด payload */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">เลือกบูธ</label>
                <select
                  value={selectedBoothId}
                  onChange={(e) => setSelectedBoothId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {booths.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.booth_name} ({b.booth_code})
                    </option>
                  ))}
                </select>
                {selectedBooth && (
                  <p className="mt-2 text-sm text-gray-600">
                    รหัสบูธ: <span className="font-mono">{selectedBooth.booth_code}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">รูปแบบข้อมูลใน QR</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as PayloadMode)}
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BOOTH_CODE">BOOTH_CODE (เช่น ABC123)</option>
                  <option value="JSON">JSON ({"{ type: 'JOIN_BOOTH', boothCode }"})</option>
                  <option value="DEEPLINK">DEEPLINK (/scanner?booth=...)</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  * ทีมสแกนสามารถเลือกใช้โหมดที่รองรับได้สะดวกที่สุด — ทุกโหมดนำไปสู่การเรียก POST /api/join-booth
                  โดยส่ง boothCode เข้าร่วม 1 บูธ = +1 คะแนน
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={generateQR}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                สร้าง QR
              </button>
            </div>
          </div>

          {/* พรีวิว QR */}
          {qrDataUrl && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-4">พรีวิว QR</h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <img src={qrDataUrl} alt="QR" className="w-56 h-56 border rounded bg-white" />
                <div className="space-y-3">
                  <div className="text-sm text-gray-700 break-all">
                    QR Content:
                    <div className="mt-1 p-2 rounded bg-gray-50 border font-mono text-xs">{qrString}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadPNG}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      ⬇️ ดาวน์โหลด PNG
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(qrString)}
                      className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
                    >
                      📋 คัดลอกข้อความใน QR
                    </button>
                  </div>
                  {mode === "DEEPLINK" && (
                    <p className="text-xs text-gray-500">
                      * ถ้าใช้โหมดลิงก์ ให้ตรวจสอบว่าเส้นทาง <code className="font-mono">/scanner</code> ของคุณรองรับ
                      query <code className="font-mono">booth</code> และเรียก <code className="font-mono">/api/join-booth</code>{' '}
                      ด้วย <code className="font-mono">boothCode</code> ที่ได้รับ
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500">
            * หน้านี้ต้องการสิทธิ์แอดมิน (ป้องกันด้วย middleware ที่ /admin/*).<br />
            * “สแกนได้ = เข้าร่วมบูธ 1 ครั้ง = +1 คะแนน” (จำกัดรายวันตามระบบเดิมโดย middleware + API).
          </div>
        </div>
      </div>
    </>
  );
}
