'use client';

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";

type TranscriptIssue = {
  id: string;
  student_id: string;
  name: string;
  year: string;
  dept: string;
};

export default function ErrortranscriptPage() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<TranscriptIssue[]>([]);
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    year: "",
    dept: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/admin/transcript-issues", {
          method: "GET",
          credentials: "include"
        });
        const data = await res.json();
        if (res.ok) {
          setEntries(data.issues);
        } else {
          console.error("Failed to fetch:", data.error);
        }
      } catch (err) {
        console.error("Error fetching issues", err);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEntry = async () => {
    if (!formData.student_id || !formData.name || !formData.year || !formData.dept) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/transcript-issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (res.ok) {
        setEntries(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            ...formData
          }
        ]);
        setFormData({ student_id: "", name: "", year: "", dept: "" });
        setShowOverlay(false);
      } else {
        setError(result.error || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดขณะส่งข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.student_id.includes(searchQuery) ||
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.dept.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col gap-10 py-10 px-4">
        {/* Header row */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/admin">
            <img src="bbt.jpg" alt="back" className='w-12 h-12 md:w-[60px] md:h-[60px]' />
          </a>
          <h1 className="text-xl md:text-2xl font-bold text-blueBrand whitespace-nowrap text-center">
            ข้อมูลจำนวนคนเข้าร่วมงาน
          </h1>
        </div>

        {/* Search bar */}
        <div className="flex justify-center">
          <input
            type="text"
            placeholder="ค้นหารายชื่อ"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md h-[40px] px-4 border border-gray-300 rounded-full bg-gray-100"
          />
        </div>

        {/* รายชื่อ */}
        <div className="flex flex-col gap-4 items-center">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry, index) => (
              <div key={index} className="bg-blue-200 w-full max-w-md rounded-xl p-4 shadow-sm">
                <p>รหัสนิสิต: {entry.student_id}</p>
                <p>ชื่อ: {entry.name}</p>
                <p>คณะ: {entry.dept}</p>
                <p>ชั้นปี: {entry.year}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">ไม่พบข้อมูลที่ค้นหา</p>
          )}
        </div>

        {/* ปุ่มเพิ่มรายชื่อ */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowOverlay(true)}
            className="w-[280px] h-[45px] bg-blueBrand rounded-full text-white font-semibold"
          >
            เพิ่มรายชื่อ
          </button>
        </div>
      </div>

      {/* Overlay */}
      {showOverlay && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setShowOverlay(false)}
        >
          <div
            className="bg-blueBrand rounded-2xl p-6 w-[90%] max-w-sm flex flex-col gap-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              name="student_id"
              placeholder="รหัสนิสิต*"
              value={formData.student_id}
              onChange={handleInputChange}
              className="h-[45px] rounded-full px-4 text-black"
            />
            <input
              type="text"
              name="name"
              placeholder="ชื่อ - นามสกุล*"
              value={formData.name}
              onChange={handleInputChange}
              className="h-[45px] rounded-full px-4 text-black"
            />
            <input
              type="text"
              name="year"
              placeholder="ชั้นปี*"
              value={formData.year}
              onChange={handleInputChange}
              className="h-[45px] rounded-full px-4 text-black"
            />
            <input
              type="text"
              name="dept"
              placeholder="คณะ*"
              value={formData.dept}
              onChange={handleInputChange}
              className="h-[45px] rounded-full px-4 text-black"
            />
            {error && <p className="text-red-300 text-sm">{error}</p>}
            <button
              className="h-[45px] bg-pink-500 rounded-full font-semibold mt-2 disabled:opacity-50"
              onClick={handleAddEntry}
              disabled={loading}
            >
              {loading ? "กำลังบันทึก..." : "ยืนยัน"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
