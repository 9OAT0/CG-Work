"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("เลือกสถานะ");
  const statuses = [
    "นักเรียน", "นิสิต", "อาจารย์", "บุคลากรสายสนับสนุน", "บุคลากรทั่วไป", "อื่นๆ"
  ];

  const [facultyOpen, setFacultyOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState("เลือกคณะ");
  const faculties = [
    "คณะเกษตรศาสตร์และทรัพยากรธรรมชาติ", "คณะเทคโนโลยีสารสนเทศและการสื่อสาร",
    "คณะนิติศาสตร์", "คณะทันตแพทยศาสตร์", "คณะบริหารธุรกิจและนิเทศศาสตร์",
    "คณะพยาบาลศาสตร์", "คณะพลังงานและสิ่งแวดล้อม", "คณะแพทยศาสตร์",
    "คณะเภสัชศาสตร์", "คณะรัฐศาสตร์และสังคมศาสตร์", "คณะวิทยาศาสตร์",
    "คณะวิศวกรรมศาสตร์", "คณะสถาปัตยกรรมศาสตร์และศิลปกรรมศาสตร์",
    "คณะสหเวชศาสตร์", "คณะสาธารณสุขศาสตร์", "คณะศิลปศาสตร์",
    "วิทยาลัยการศึกษา", "คณะวิทยาศาสตร์การแพทย์", "วิทยาลัยการจัดการ",
    "โรงเรียนสาธิตมหาวิทยาลัยพะเยา", "อื่นๆ"
  ];

  const [studentID, setStudentID] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isFormComplete =
    selectedStatus !== "เลือกสถานะ" &&
    fullName.trim() !== "" &&
    selectedFaculty !== "เลือกคณะ" &&
    (selectedStatus !== "นิสิต" || studentID.trim() !== "") &&
    consent;

  const handleRegisterClick = () => {
    if (!isFormComplete) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          studentId: selectedStatus === "นิสิต" ? studentID : null,
          name: fullName,
          dept: selectedFaculty,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "เกิดข้อผิดพลาดในการลงทะเบียน");
        setShowConfirm(false);
        return;
      }

      setShowConfirm(false);
      setShowSuccess(true);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  const handleTouchMe = () => {
    router.push("/homepage");
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center gap-16 bg-cover bg-center bg-no-repeat relative px-4"
      style={{ backgroundImage: "url('/Rectangle 140.png')" }}
    >
      <h1 className="text-[34px] font-normal text-white text-center">ลงทะเบียน</h1>

      <div className="flex flex-col gap-6 w-full max-w-sm">
        {/* Dropdown: สถานะ */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setStatusOpen(!statusOpen)}
            className="w-full h-[50px] rounded-full border bg-[#D9D9D9] px-4 py-2 text-sm shadow-sm hover:bg-gray-50"
          >
            {selectedStatus}
            <span className="float-right">&#9662;</span>
          </button>
          {statusOpen && (
            <ul className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg text-sm max-h-60 overflow-auto">
              {statuses.map((status) => (
                <li
                  key={status}
                  onClick={() => {
                    setSelectedStatus(status);
                    setStatusOpen(false);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {status}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Conditional: รหัสนิสิต */}
        {selectedStatus === "นิสิต" && (
          <input
            type="text"
            placeholder="รหัสนิสิต"
            value={studentID}
            onChange={(e) => setStudentID(e.target.value)}
            className="bg-[#D9D9D9] w-full h-[50px] border px-3 py-2 rounded-full"
          />
        )}

        {/* Input: ชื่อ - นามสกุล */}
        <input
          type="text"
          placeholder="ชื่อ - นามสกุล"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="bg-[#D9D9D9] w-full h-[50px] border px-3 py-2 rounded-full"
        />

        {/* Dropdown: คณะ */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setFacultyOpen(!facultyOpen)}
            className="w-full h-[50px] rounded-full border bg-[#D9D9D9] px-4 py-2 text-sm shadow-sm hover:bg-gray-50"
          >
            {selectedFaculty}
            <span className="float-right">&#9662;</span>
          </button>
          {facultyOpen && (
            <ul className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg text-sm max-h-60 overflow-auto">
              {faculties.map((faculty) => (
                <li
                  key={faculty}
                  onClick={() => {
                    setSelectedFaculty(faculty);
                    setFacultyOpen(false);
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {faculty}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Checkbox */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="peer w-5 h-5 border-2 border-pink-500 rounded-sm appearance-none checked:bg-white checked:border-pink-500 focus:ring-0 cursor-pointer"
            />
            <svg
              className="hidden peer-checked:block absolute top-0 left-0 w-5 h-5 text-pink-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <label htmlFor="consent" className="text-white cursor-pointer text-sm">
            ยินยอมให้ข้อมูลการลงทะเบียบแก่ผู้จัดงาน 
            สำหรับเป็นข้อมูลลงทะเบียนเท่านั้น และท่านทราบว่า
            ข้อมูลชื่อ-นามสกุลจะถูกแสดงบนหน้าเว็บไซต์*
          </label>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleRegisterClick}
          disabled={!isFormComplete}
          className={`w-full h-[70px] rounded-full text-white text-2xl py-2 transition-colors duration-300 ${
            isFormComplete
              ? "bg-pink-500 hover:bg-pink-600 cursor-pointer"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          ลงทะเบียน
        </button>
      </div>

      {/* Confirm Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-pink-500 rounded-3xl p-6 w-11/12 max-w-sm flex flex-col justify-center items-center gap-6">
            <button
              onClick={handleCancelConfirm}
              className="self-start text-white text-2xl"
            >
              <img src="/Vector.png" alt="back" />
            </button>
            <h2 className="text-white text-2xl font-bold text-center">
              แน่ใจใช่หรือไม่?
            </h2>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-40 h-12 bg-white rounded-full text-pink-500 font-medium text-lg mt-6"
            >
              {isSubmitting ? "กำลังส่ง..." : "ยืนยันจ้า"}
            </button>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-pink-500 rounded-3xl p-6 w-11/12 max-w-sm flex flex-col items-center gap-4">
            <h2 className="text-white text-2xl font-bold text-center">
              ลงทะเบียน<br />เรียบร้อยแล้ว!
            </h2>
            <div className="flex items-center gap-6 relative mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white animate-arrow-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <button
                onClick={handleTouchMe}
                className="flex flex-col items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v2m0 4v2m0-8a4 4 0 110-8 4 4 0 010 8zm0 0v2m0 4v2" />
                </svg>
                <p className="text-white mt-2">Touch Me</p>
              </button>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white animate-arrow-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
