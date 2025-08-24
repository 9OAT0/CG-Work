// app/admin/points-adjust/page.tsx
"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";

type AdjustResponse =
  | {
      message: string;
      data: { dailyPoints: number; totalScore: number };
      error?: never;
    }
  | { error: string; message?: never };

const authedFetch: typeof fetch = (input, init) =>
  fetch(input as any, { credentials: "include", cache: "no-store", ...(init || {}) });

const isObjectId = (s: string) => /^[a-f0-9]{24}$/i.test(s);

export default function PointsAdjustPage() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AdjustResponse | null>(null);

  const disabled = submitting || !isObjectId(userId) || !Number.isInteger(amount);

  const submit = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await authedFetch("/api/admin/points/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount, reason: reason || undefined }),
      });
      const json: AdjustResponse = await res.json();
      setResult(json);
    } catch (e) {
      setResult({ error: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ" });
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
            🎯 ปรับคะแนนวันนี้ (แอดมิน)
          </h1>

          <div className="bg-white rounded-lg shadow p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID (Mongo ObjectId)
              </label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value.trim())}
                placeholder="เช่น 667f0c5e4f8e8d7c8b6a1c23"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  isObjectId(userId) ? "border-gray-300 focus:ring-blue-500" : "border-red-300 focus:ring-red-400"
                }`}
              />
              {!userId ? (
                <p className="text-xs text-gray-500 mt-1">วาง ID ผู้ใช้ 24 ตัวอักษรฐานสิบหก</p>
              ) : !isObjectId(userId) ? (
                <p className="text-xs text-red-600 mt-1">รูปแบบไม่ถูกต้อง (ต้องเป็น 24-hex)</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวนคะแนน (จำนวนเต็ม บวก/ลบได้)
                </label>
                <input
                  type="number"
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setAmount((a) => a + 1)}
                  className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setAmount((a) => a + 5)}
                  className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => setAmount((a) => a - 1)}
                  className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(0)}
                  className="px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  0
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เหตุผล (ไม่บังคับ)
              </label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น โบนัสวันนี้ / แก้ไขคะแนน"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={submit}
                disabled={disabled}
                className={`px-5 py-2 rounded-md font-medium text-white ${
                  disabled ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? "กำลังบันทึก..." : "บันทึกการปรับคะแนน"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setUserId("");
                  setAmount(1);
                  setReason("");
                  setResult(null);
                }}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
              >
                ล้างฟอร์ม
              </button>
            </div>

            {/* ผลลัพธ์ */}
            {result && (
              <div
                className={`mt-4 rounded-md p-4 ${
                  "error" in result ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"
                }`}
              >
                {"error" in result ? (
                  <div>❌ {result.error}</div>
                ) : (
                  <div className="space-y-1">
                    <div>✅ {result.message}</div>
                    <div className="text-sm text-gray-700">
                      คะแนนวันนี้รวมล่าสุด: <b>{result.data.dailyPoints}</b>
                      <br />
                      คะแนนสะสมปัจจุบัน: <b>{result.data.totalScore}</b>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 pt-2 border-t">
              ระบบจะคิด “วันนี้” ตามเวลาไทย (UTC+7) และบันทึกเวลาในฐานข้อมูลเป็น UTC ตามมาตรฐาน
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
