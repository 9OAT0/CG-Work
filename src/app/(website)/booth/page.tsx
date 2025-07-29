'use client';

import Navbar from "../components/Navbar";
import { useSearchParams, useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { useEffect, useRef, useState } from "react";

type Booth = {
  booth_name: string;
  description: string;
  pics: string[];
};

export default function BoothPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const boothId = searchParams.get("id");

  const [booth, setBooth] = useState<Booth | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showResult, setShowResult] = useState<"correct" | "wrong" | null>(null);
  const [checking, setChecking] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boothId) return;
    fetch(`/api/booth/${boothId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setBooth({
            booth_name: data.booth_name,
            description: data.description,
            pics: data.pics || [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, [boothId]);

  const handleConfirmJoin = () => {
    setPassword("");
    setShowPasswordModal(true);
  };

  const handleCheckPassword = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/booth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ boothCode: password }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowResult("correct");
        setTimeout(() => {
          setShowResult(null);
          setShowPasswordModal(false);
          router.push("/category");
        }, 2000);
      } else {
        setShowResult("wrong");
      }
    } catch {
      setShowResult("wrong");
    } finally {
      setChecking(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      setShowPasswordModal(false);
      setShowResult(null);
    }
  };

  if (loading) return <div className="text-center mt-10">กำลังโหลด...</div>;

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col justify-center items-center gap-10 px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
          <a href="/category">
            <img src="bbt.jpg" alt="back" className="w-[50px] h-[50px] sm:w-[60px] sm:h-[60px]" />
          </a>
          <div className="w-full sm:w-[281px] h-[50px] sm:h-[56px] rounded-[30px] flex justify-center items-center bg-blueBrand">
            <h1 className="text-[20px] sm:text-[24px] font-bold text-white">หมวดที่ 1</h1>
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
          <p>{booth?.booth_name || "-"}</p>
          <p className="mt-4 text-sm">รายละเอียด</p>
          <p className="text-sm text-gray-700">{booth?.description || "-"}</p>
        </div>

        {/* Join Button */}
        <button
          onClick={handleConfirmJoin}
          className="mt-4 w-[220px] sm:w-[250px] h-[45px] sm:h-[50px] bg-pink-500 rounded-[30px] text-white font-bold"
        >
          ยืนยันเข้าร่วมกิจกรรม
        </button>

        {/* Modal */}
        {showPasswordModal && (
          <div ref={overlayRef} onClick={handleOverlayClick} className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 px-4">
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
                  disabled={checking}
                  className="w-full bg-pink-500 py-2 rounded-full font-bold text-white disabled:opacity-50"
                >
                  {checking ? "กำลังตรวจสอบ..." : "ยืนยัน"}
                </button>
              </div>
            )}

            {showResult === "correct" && (
              <div className="bg-blueBrand rounded-[30px] w-full max-w-[300px] p-6 text-white text-center">
                <h2 className="text-xl font-bold mb-4">รหัสถูกต้อง</h2>
                <img src="/correct.jpg" alt="correct" className="mx-auto w-[120px] mb-6" />
                <p>ระบบจะพาคุณกลับไปยังหน้าโปรไฟล์</p>
              </div>
            )}

            {showResult === "wrong" && (
              <div className="bg-blueBrand rounded-[30px] w-full max-w-[300px] p-6 text-white text-center">
                <h2 className="text-xl font-bold mb-4">รหัสไม่ถูกต้อง</h2>
                <img src="/incorrec.jpg" alt="wrong" className="mx-auto w-[120px] mb-6" />
                <button onClick={() => setShowResult(null)} className="w-full bg-pink-500 py-2 rounded-full font-bold">
                  กลับ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
