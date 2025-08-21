"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useState, useEffect, useRef } from "react";

export default function Homepage() {
  const banners = [
    "/กำหนดการ.png",
    "/กำหนดการเวลา27-2.png",
    "/กำหนดการเวลา 28-2.png",
    "/กำหนดการเวลา 29-2.png",
  ];

  // สำหรับ auto-rotate และ swipe
  const sliderRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [current, setCurrent] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  // Overlay: แสดงวันละครั้ง
  useEffect(() => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem("overlayLastShown");
    const hasSeenToday = lastShown === today;
    if (!hasSeenToday) setShowOverlay(true);
  }, []);

  // Auto-rotate: เริ่มเมื่อโหลด และเคลียร์เมื่อ unmount
  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [banners.length]);

  const handleCloseOverlay = () => {
    setShowOverlay(false);
    const today = new Date().toDateString();
    localStorage.setItem("overlayLastShown", today);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    stopAuto();
    setDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const x = e.touches[0].clientX;
    setDragOffset(x - dragStartX);
  };

  const handleTouchEnd = () => {
    if (!dragging) return;
    // เดิม: const width = sliderRef.current?.offsetWidth || 1;  <-- ผิด
    const width =
      viewportRef.current?.offsetWidth ||
      sliderRef.current?.parentElement?.offsetWidth ||
      1;
    const threshold = width * 0.15;

    if (dragOffset > threshold) {
      prevSlide();
    } else if (dragOffset < -threshold) {
      nextSlide();
    }
    setDragging(false);
    setDragOffset(0);
    startAuto();
  };

  // ควบคุม auto-rotate
  const stopAuto = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  const startAuto = () => {
    stopAuto();
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 10000);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col gap-16 px-4">
        {/* Top Background */}
        <img
          src="/bg.jpg"
          alt="Background"
          className="w-full object-cover"
          loading="eager"
          decoding="async"
        />

        {/* Category Section */}
        <div className="flex flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-7">
            <h1 className="text-blueBrand text-2xl font-bold">หมวดหมู่งาน</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 justify-items-center items-center">
              <a href="/category?dept=1" className="relative">
                <div className="relative w-[117px] h-[150px]">
                  <img
                    src="/sola.jpg"
                    alt="3D"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </a>
              <a href="/category?dept=2">
                <img
                  src="/galaxy.jpg"
                  alt="Graphic"
                  className="w-[118px] h-[147px]"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <a href="/category?dept=3">
                <img
                  src="/nebula.jpg"
                  alt="Product Design"
                  className="w-[124px] h-[141px]"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <a href="/category?dept=4">
                <img
                  src="/comet.jpg"
                  alt="Production"
                  className="w-[109px] h-[139px]"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <a href="/category?dept=5">
                <img
                  src="/blackhole.jpg"
                  alt="Digital Art"
                  className="w-[146px] h-[147px]"
                  loading="lazy"
                  decoding="async"
                />
              </a>
              <a href="/category?dept=6">
                <img
                  src="/eclipse.jpg"
                  alt="Game Design"
                  className="w-[108px] h-[140px]"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            </div>
          </div>

          {/* Description Section */}
          <div className="flex flex-col items-center gap-4 text-blueBrand text-center max-w-lg">
            <h1 className="font-bold text-2xl">นิทรรศการแสดงศิลปนิพนธ์</h1>
            <p>ขอเชิญเข้าร่วมนิทรรศการแสดงผลงานศิลปนิพนธ์</p>
            <p>นิสิตระดับชั้นปีที่ 4</p>
            <p>สาขาวิชาคอมพิวเตอร์กราฟิกและมัลติมีเดีย</p>
            <p>คณะเทคโนโลยีสารสนเทศและการสื่อสาร</p>
            <p>มหาวิทยาลัยพะเยา ณ ลานอเนกประสงค์ชั้น 2</p>
            <p>อาคาร 99 ปี พระอุบาลีคุณูปมาจารย์ (ปวง ธมฺมปญฺโญ)</p>
            <p>วันที่ 27 - 29 สิงหาคม 2568 เวลา 09.00 น. – 17.00 น.</p>
            <img
              src="/discritionicon.jpg"
              alt=""
              className="w-[155px] h-[154px]"
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* Header Before Slide */}
          <h1 className="font-bold text-2xl text-blueBrand">
            กำหนดการของงานนิทรรศการ
          </h1>
        </div>

        {/* Enhanced Banner Slide (รองรับปัดนิ้ว) */}
        <div
          ref={viewportRef}
          className="relative w-full max-w-6xl mx-auto overflow-hidden mb-8 rounded-lg sm:rounded-xl shadow-lg sm:shadow-xl"
        >
          {/* Background Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-transparent to-purple-900/10 z-10 pointer-events-none"></div>

          <div
            ref={sliderRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className={`flex ${
              dragging
                ? "transition-none"
                : "transition-all duration-700 ease-out"
            }`}
            style={{
              transform: `translateX(calc(-${
                current * 100
              }% + ${dragOffset}px))`,
              touchAction: "pan-y",
            }}
          >
            {banners.map((banner, index) => (
              <div key={index} className="relative w-full flex-shrink-0">
                <img
                  src={banner}
                  alt={`กำหนดการงานนิทรรศการ วันที่ ${index + 27} สิงหาคม`}
                  draggable={false}
                  className="w-full h-[360px] sm:h-[380px] md:h-[440px] lg:h-[500px] xl:h-[560px] object-contain bg-gradient-to-br from-slate-50 to-blue-50"
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
                <div className="absolute inset-0 border-2 border-white/10 rounded-lg sm:rounded-xl pointer-events-none"></div>
              </div>
            ))}
          </div>

          {/* ปุ่มถอย/ไปต่อ (เดิม) */}
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-2 sm:left-4 transform -translate-y-1/2 bg-white/80 hover:bg-white text-blue-600 hover:text-blue-800 rounded-full p-1.5 sm:p-2 shadow-md transition-all duration-300 hover:scale-105 backdrop-blur-sm"
            aria-label="ภาพก่อนหน้า"
          >
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-2 sm:right-4 transform -translate-y-1/2 bg-white/80 hover:bg-white text-blue-600 hover:text-blue-800 rounded-full p-1.5 sm:p-2 shadow-md transition-all duration-300 hover:scale-105 backdrop-blur-sm"
            aria-label="ภาพถัดไป"
          >
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Indicators (จุดเล็ก แต่แตะง่าย) */}
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1 sm:gap-2 bg-white/15 backdrop-blur-sm rounded-full px-1.5 sm:px-3 py-0.5">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className="rounded-full p-1 sm:p-1.5 transition-transform duration-200"
                aria-label={`ไปยังภาพที่ ${index + 1}`}
              >
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    current === index
                      ? "bg-white scale-110"
                      : "bg-white/60 hover:bg-white/80"
                  } w-1 h-1 sm:w-2 sm:h-2`}
                />
              </button>
            ))}
          </div>

          {/* ตัวนับภาพ */}
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-black/30 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs backdrop-blur-sm">
            {current + 1}/{banners.length}
          </div>
        </div>

        {/* Compact Banner Information */}
        <div className="max-w-3xl mx-auto text-center mb-6 px-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 shadow-md">
            <h3 className="text-lg font-bold text-blue-800 mb-3">
              📅 กำหนดการงานนิทรรศการแสดงศิลปนิพนธ์
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
              <div className="flex items-center justify-center gap-2">
                <span className="text-blue-600">📍</span>
                <span>ลานอเนกประสงค์ชั้น 2</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-600">📅</span>
                <span>27-29 สิงหาคม 2568</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-orange-600">🕘</span>
                <span>09:00 - 17:00 น.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Overlay */}
      {showOverlay && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={handleCloseOverlay}
        >
          <div
            className="relative max-w-[90%] max-h-[90%] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseOverlay}
              className="absolute top-60 right-48 text-white text-6xl"
            >
              ×
            </button>
            <img
              src="/overlay.PNG"
              alt="Overlay"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
