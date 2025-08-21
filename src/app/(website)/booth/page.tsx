"use client";

import Navbar from "../components/Navbar";
import { useSearchParams, useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { useEffect, useRef, useState, Suspense } from "react";

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showResult, setShowResult] = useState<"correct" | "wrong" | null>(
    null
  );
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
          console.log(data);
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
    <div className="min-h-screen flex flex-col justify-center items-center gap-10 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
        <a href="/category">
          <img
            src="bbt.png"
            alt="back"
            className="w-[50px] h-[50px] sm:w-[60px] sm:h-[60px]"
          />
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
              <img
                src={img}
                alt={`slide-${idx}`}
                className="rounded-xl w-full h-full object-cover"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Details */}
      <div className="text-center text-blueBrand px-4 max-w-lg">
        <h2 className="font-bold text-lg">ชื่อบูธ/ผลงานวิจัย</h2>
        <p className="whitespace-pre-wrap">{booth?.booth_name || "-"}</p>
        <p className="mt-4 text-sm">รายละเอียด</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {booth?.description || "-"}
        </p>
      </div>

      <div>
        <div className="flex justify-center font-bold text-lg text-center sm:text-left">
          ผู้จัดทำ
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-6">
          {booth?.owner_names && booth.owner_names.length > 0 ? (
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-10">
              {booth.owner_names.map((ownerName, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center text-center max-w-[100px]"
                >
                  {/* รูปภาพกลม */}
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-md flex-shrink-0">
                    {booth.owner_images && booth.owner_images[index] ? (
                      <img
                        src={booth.owner_images[index]}
                        alt={`เจ้าของบูธ ${ownerName}`}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300">
                        <span className="text-gray-600 text-sm font-medium">
                          รูป
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ชื่อ */}
                  <p className="text-sm font-medium text-gray-800 mt-2 break-words line-clamp-2">
                    {ownerName}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">ไม่มีข้อมูลเจ้าของบูธ</p>
          )}
        </div>
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
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 px-4"
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
              <img
                src="/correct.jpg"
                alt="correct"
                className="mx-auto w-[120px] mb-6"
              />
              <p>ระบบจะพาคุณกลับไปยังหน้าโปรไฟล์</p>
            </div>
          )}

          {showResult === "wrong" && (
            <div className="bg-blueBrand rounded-[30px] w-full max-w-[300px] p-6 text-white text-center">
              <h2 className="text-xl font-bold mb-4">รหัสไม่ถูกต้อง</h2>
              <img
                src="/incorrec.jpg"
                alt="wrong"
                className="mx-auto w-[120px] mb-6"
              />
              <button
                onClick={() => setShowResult(null)}
                className="w-full bg-pink-500 py-2 rounded-full font-bold"
              >
                กลับ
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
      <Suspense
        fallback={<div className="text-center mt-10">กำลังโหลด...</div>}
      >
        <BoothContent />
      </Suspense>
    </>
  );
}
