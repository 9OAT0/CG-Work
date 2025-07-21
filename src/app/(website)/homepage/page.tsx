"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useState, useEffect } from "react";

export default function Homepage() {
  const banners = [
    "/banner.jpg",
    "/banner1.jpg",
    "/banner2.jpg",
    "/banner3.jpg",
  ]; // ✅ รูป Banner ใส่ใน public/

  const [current, setCurrent] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);

  // 🔥 Auto slide ทุก 10 วิ
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col gap-16">
        <img src="/bg.jpg" alt="Background" />
        <div className="flex flex-col justify-center items-center gap-10">
          {/* เนื้อหาเดิม */}
          <div className="flex flex-col items-center gap-7">
            <h1 className="text-blueBrand text-2xl font-bold">หมวดหมู่งาน</h1>
            <div className="flex gap-6">
              <a href="/">
                <img src="/sola.jpg" alt="" className="w-[117px] h-[150px]" />
              </a>
              <a href="/">
                <img src="/galaxy.jpg" alt="" className="w-[118px] h-[147px]" />
              </a>
              <a href="/">
                <img src="/nebula.jpg" alt="" className="w-[124px] h-[141px]" />
              </a>
            </div>
            <div className="flex gap-6">
              <a href="/">
                <img src="/comet.jpg" alt="" className="w-[109px] h-[139px]" />
              </a>
              <a href="/">
                <img src="/blackhole.jpg" alt="" className="w-[146px] h-[147px]" />
              </a>
              <a href="/">
                <img src="/eclipse.jpg" alt="" className="w-[108px] h-[140px]" />
              </a>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <h1 className="font-bold text-2xl text-blueBrand">นิทรรศการแสดงศิลปนิพนธ์</h1>
            <div className="flex flex-col items-center gap-1 text-blueBrand">
              <p>ขอเชิญเข้าร่วมนิทรรศการแสดงผลงานศิลปนิพนธ์</p>
              <p>นิสิตระดับชั้นปีที่ 4</p>
              <p>สาขาวิชาคอมพิวเตอร์กราฟิกและมัลติมีเดีย</p>
              <p>คณะเทคโนโลยีสารสนเทศและการสื่อสาร</p>
              <p>มหาวิทยาลัยพะเยา ณ ลานอเนกประสงค์ชั้น 2</p>
              <p>อาคาร 99 ปี พระอุบาลีคุณูปมาจารย์ (ปวง ธมฺมปญฺโญ)</p>
              <p>วันที่ 27 - 29 สิงหาคม 2568 เวลา 09.00 น. – 17.00 น.</p>
            </div>
            <img src="/discritionicon.jpg" alt="" className="w-[155px] h-[154px]" />
          </div>
          <h1 className="font-bold text-2xl text-blueBrand">
            กำหนดการของงานนิทรรศการ
          </h1>
        </div>

        {/* 🔥 Slide Banner */}
        <div className="relative w-full max-w-full mx-auto overflow-hidden mb-16">
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {banners.map((banner, index) => (
              <img
                key={index}
                src={banner}
                alt={`Banner ${index + 1}`}
                className="w-full flex-shrink-0 object-cover h-64 md:h-96"
              />
            ))}
          </div>

          {/* Prev Button */}
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-blue-600 bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2"
          >
            &#10094;
          </button>

          {/* Next Button */}
          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-blue-600 bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2"
          >
            &#10095;
          </button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <span
                key={index}
                onClick={() => setCurrent(index)}
                className={`w-3 h-3 rounded-full cursor-pointer ${
                  current === index ? "bg-blue-600" : "bg-gray-300"
                }`}
              ></span>
            ))}
          </div>
        </div>
      </div>
      <Footer />

      {/* ✅ Overlay: แสดงรูป */}
      {showOverlay && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setShowOverlay(false)}
        >
          <div
            className="relative max-w-[90%] max-h-[100%] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowOverlay(false)}
              className="absolute top-2 right-2 text-white bg-opacity-70 rounded-full w-32 h-20 flex justify-center items-center text-6xl"
            >
              ×
            </button>
            <img
              src="/overlayhome.png"
              alt="Overlay"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
