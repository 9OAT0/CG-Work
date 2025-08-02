'use client';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useState, useEffect } from 'react';

export default function Homepage() {
  const banners = [
    '/banner.jpg',
    '/banner1.jpg',
    '/banner2.jpg',
    '/banner3.jpg',
  ];

  const [current, setCurrent] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    // Check if overlay has been shown before
    const hasSeenOverlay = localStorage.getItem('hasSeenOverlay');
    if (!hasSeenOverlay) {
      setShowOverlay(true);
    }

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const handleCloseOverlay = () => {
    setShowOverlay(false);
    localStorage.setItem('hasSeenOverlay', 'true');
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col gap-16 px-4">
        {/* Top Background */}
        <img src="/bg.jpg" alt="Background" className="w-full object-cover" />

        {/* Category Section */}
        <div className="flex flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-7">
            <h1 className="text-blueBrand text-2xl font-bold">หมวดหมู่งาน</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <a href="/category?dept=3D"><img src="/sola.jpg" alt="Category 1" className="w-[117px] h-[150px]" /></a>
              <a href="/category?dept=Graphic"><img src="/galaxy.jpg" alt="Category 2" className="w-[118px] h-[147px]" /></a>
              <a href="/category?dept=Product Design"><img src="/nebula.jpg" alt="Category 3" className="w-[124px] h-[141px]" /></a>
              <a href="/category?dept=Production"><img src="/comet.jpg" alt="Category 4" className="w-[109px] h-[139px]" /></a>
              <a href="/category?dept=Digital Art"><img src="/blackhole.jpg" alt="Category 5" className="w-[146px] h-[147px]" /></a>
              <a href="/category?dept=Game Design"><img src="/eclipse.jpg" alt="Category 6" className="w-[108px] h-[140px]" /></a>
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
            <img src="/discritionicon.jpg" alt="" className="w-[155px] h-[154px]" />
          </div>

          {/* Header Before Slide */}
          <h1 className="font-bold text-2xl text-blueBrand">กำหนดการของงานนิทรรศการ</h1>
        </div>

        {/* Banner Slide */}
        <div className="relative w-full overflow-hidden mb-16">
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

          {/* Prev/Next Buttons */}
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-blue-600 bg-opacity-70 hover:bg-opacity-90 text-white rounded-full p-2"
          >
            &#10094;
          </button>
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
                  current === index ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              ></span>
            ))}
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
              className="absolute top-2 right-6 text-white text-4xl"
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
