'use client';

import Navbar from "../components/Navbar";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const categories = [
  "3D",
  "Graphic",
  "Product Design",
  "Production",
  "Digital Art",
  "Game Design",
] as const;

type Category = (typeof categories)[number];

interface Booth {
  id: string;
  booth_name: string;
  dept_type: string;
  description: string;
  pics: string[];
  booth_code: string;
  owner_names: string[];
  joined: boolean;
}

function CategoryContent() {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const selectCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsDropdownOpen(false);
  };

  // 📌 อ่าน dept จาก query string และเซ็ต category
  useEffect(() => {
    const dept = Number(searchParams.get("dept"));
    if (dept >= 1 && dept <= categories.length) {
      setSelectedCategory(categories[dept - 1]);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchBooths = async () => {
      setLoading(true);
      try {
        // Map category to dept_type
        const deptTypeMap: { [key: string]: string } = {
          "3D": "3D",
          "Graphic": "Graphic",
          "Product Design": "Product Design",
          "Production": "Production",
          "Digital Art": "Digital Art",
          "Game Design": "Game Design"
        };
        
        const deptType = deptTypeMap[selectedCategory] || selectedCategory;
        const res = await fetch(`/api/booth/by-dept?dept_type=${encodeURIComponent(deptType)}`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          setBooths(data.booths || []);
        } else {
          setBooths([]);
          console.error(data.message || data.error);
        }
      } catch (err) {
        console.error("Failed to load booths", err);
        setBooths([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBooths();
  }, [selectedCategory]);

  const filteredBooths = booths.filter(
    (booth) =>
      booth.booth_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booth.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen py-10 px-4 flex flex-col gap-8 relative">
        {/* Header Buttons */}
        <div className="flex flex-row justify-center items-center gap-6 sm:gap-8">
          <a href="/homepage">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#00478A] flex justify-center items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </a>

          <div className="relative w-[200px] sm:w-[281px]">
            <button
              onClick={toggleDropdown}
              className="w-full h-[50px] sm:h-[56px] rounded-[30px] bg-blueBrand flex justify-center items-center text-[20px] sm:text-[24px] font-bold text-white"
            >
              {selectedCategory}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 ml-2 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isDropdownOpen && (
              <div className="absolute top-14 w-full bg-white rounded-lg shadow-lg z-10 animate-fade-slide">
                {categories.map((category) => (
                  <div
                    key={category}
                    onClick={() => selectCategory(category)}
                    className="px-4 py-2 text-gray-700 hover:bg-blue-100 hover:text-blue-800 cursor-pointer rounded-lg"
                  >
                    {category}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="flex justify-center">
          <input
            type="text"
            placeholder="ค้นหาชื่อผลงานหรือคำอธิบาย"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md h-[40px] rounded-full border px-4 bg-gray-200"
          />
        </div>

        {/* Banner */}
        <div className="flex justify-center items-center px-4">
          <img src="/banner.jpg" alt="banner" className="w-full max-w-[490px] h-auto rounded-xl" />
        </div>

        {/* Booths */}
        <div className="flex flex-col justify-center items-center gap-6 px-4">
          {loading ? (
            <p className="text-gray-500">กำลังโหลด...</p>
          ) : filteredBooths.length > 0 ? (
            filteredBooths.map((booth, idx) => (
              <div className="w-full max-w-4xl mx-auto">
                <a
                  key={idx}
                  href={`/booth?id=${booth.id}`}
                >
                  <div
                    className={`w-full rounded-3xl bg-blueBrand  flex flex-col lg:flex-row gap-6 p-6 relative hover:scale-105 transition-transform duration-200 ${booth.joined ? "opacity-50" : ""}`}
                  >
                    {/* Image Section */}
                    <div className="w-full lg:w-1/3 h-64 bg-gray-200 rounded-2xl flex items-center justify-center overflow-hidden">
                      {booth.pics && booth.pics.length > 0 ? (
                        <img 
                          src={booth.pics[0]} 
                          alt="รูปงาน" 
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <span className="text-gray-500 text-lg">รูปงาน</span>
                      )}
                    </div>
                    
                    {/* Content Section */}
                    <div className="flex-1 text-white flex flex-col justify-between">
                      <div className="mb-4">
                        <h2 className="text-xl lg:text-2xl font-bold mb-2">
                          {booth.booth_name}
                        </h2>
                      </div>
                      
                      <div className="text-right">
                        {booth.owner_names && booth.owner_names.length > 0 && (
                          booth.owner_names.map((name, nameIdx) => (
                            <p key={nameIdx} className="text-sm mb-1">{name}</p>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            ))
          ) : (
            <p className="text-gray-500">ไม่พบผลงานที่ค้นหา</p>
          )}
        </div>

        {/* Animation */}
        <style jsx>{`
          @keyframes fade-slide {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-slide {
            animation: fade-slide 0.3s ease-out;
          }
        `}</style>
      </div>
  );
}

export default function CategoryPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="text-center mt-10">กำลังโหลด...</div>}>
        <CategoryContent />
      </Suspense>
    </>
  );
}
