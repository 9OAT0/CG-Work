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
      console.log('Submitting registration:', {
        status: selectedStatus,
        studentId: selectedStatus === "นิสิต" ? studentID : null,
        name: fullName,
        dept: selectedFaculty,
      });

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          studentId: selectedStatus === "นิสิต" ? studentID.trim() : null,
          name: fullName.trim(),
          dept: selectedFaculty,
        }),
      });

      const data = await res.json();
      console.log('Registration response:', { status: res.status, data });

      if (!res.ok) {
        console.error('Registration failed:', data.error);
        let errorMessage = data.error || "เกิดข้อผิดพลาดในการลงทะเบียน";
        
        // Provide helpful guidance for duplicate student ID errors
        if (data.error && data.error.includes('ถูกใช้ลงทะเบียนแล้ว')) {
          errorMessage += '\n\nกรุณาตรวจสอบรหัสนิสิตของท่าน หรือติดต่อเจ้าหน้าที่หากมีปัญหา';
        }
        
        alert(errorMessage);
        setShowConfirm(false);
        return;
      }

      console.log('Registration successful');
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Registration error:', error);
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
      className="h-[100dvh] flex flex-col justify-center items-center gap-8 bg-gradient-to-br from-purple-900 via-purple-700 to-pink-500 relative px-4 overflow-hidden bg-no-repeat bg-cover bg-center"
      style={{
        backgroundImage: "url('/Rectangle 140.png')",
        backgroundBlendMode: "overlay",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Animated particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white opacity-30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        <h1 className="text-4xl sm:text-5xl font-bold text-white text-center drop-shadow-lg">
          ลงทะเบียน
        </h1>

          <div className="flex flex-col gap-4 w-full bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/20">
            {/* Dropdown: สถานะ */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setStatusOpen(!statusOpen)}
                className="w-full h-[50px] rounded-full border-0 bg-white/90 backdrop-blur-sm px-4 py-2 text-gray-700 shadow-lg hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              ><div className="flex justify-between">
                <span className="text-left block">{selectedStatus}</span>
                <span className="justify-end text-pink-500">▼</span>
                </div>
              </button>
              {statusOpen && (
                <ul className="absolute z-20 mt-2 w-full bg-white/95 backdrop-blur-md border-0 rounded-2xl shadow-2xl text-sm max-h-60 overflow-auto">
                  {statuses.map((status) => (
                    <li
                      key={status}
                      onClick={() => {
                        setSelectedStatus(status);
                        setStatusOpen(false);
                      }}
                      className="px-4 py-3 hover:bg-pink-100 cursor-pointer transition-colors duration-150 first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      {status}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Conditional: รหัสนิสิต */}
            {selectedStatus === "นิสิต" && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="รหัสนิสิต (8 หลัก)"
                  value={studentID}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 8) {
                      setStudentID(value);
                    }
                  }}
                  className="bg-white/90 backdrop-blur-sm w-full h-[50px] border-0 px-4 py-2 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all duration-200"
                  maxLength={8}
                />
                {studentID && studentID.length > 0 && studentID.length < 8 && (
                  <p className="text-yellow-200 text-xs mt-2 px-4 bg-yellow-500/20 rounded-full py-1">
                    รหัสนิสิตต้องมี 8 หลัก (ปัจจุบัน {studentID.length} หลัก)
                  </p>
                )}
              </div>
            )}

            {/* Input: ชื่อ - นามสกุล */}
            <input
              type="text"
              placeholder="ชื่อ - นามสกุล"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-white/90 backdrop-blur-sm w-full h-[50px] border-0 px-4 py-2 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all duration-200"
            />

            {/* Dropdown: คณะ */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setFacultyOpen(!facultyOpen)}
                className="w-full h-[50px] rounded-full border-0 bg-white/90 backdrop-blur-sm px-4 py-2 text-gray-700 shadow-lg hover:bg-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                <div className="flex justify-between">
                  <span className="text-left block truncate">{selectedFaculty}</span>
                  <span className="float-right text-pink-500">▼</span>
                </div>
              </button>
              {facultyOpen && (
                <ul className="absolute z-20 mt-2 w-full bg-white/95 backdrop-blur-md border-0 rounded-2xl shadow-2xl text-sm max-h-60 overflow-auto">
                  {faculties.map((faculty) => (
                    <li
                      key={faculty}
                      onClick={() => {
                        setSelectedFaculty(faculty);
                        setFacultyOpen(false);
                      }}
                      className="px-4 py-3 hover:bg-pink-100 cursor-pointer transition-colors duration-150 first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      {faculty}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3 mt-2">
              <div className="relative mt-1 flex">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="peer w-5 h-5 border-2 border-white rounded-md appearance-none checked:bg-pink-500 checked:border-pink-500 focus:ring-0 cursor-pointer transition-all duration-200"
                />
                <svg
                  className="hidden peer-checked:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <label htmlFor="consent" className="text-white cursor-pointer text-sm leading-relaxed">
                ยินยอมให้ข้อมูลการลงทะเบียนแก่ผู้จัดงาน 
                สำหรับเป็นข้อมูลลงทะเบียนเท่านั้น และท่านทราบว่า
                ข้อมูลชื่อ-นามสกุลจะถูกแสดงบนหน้าเว็บไซต์*
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleRegisterClick}
              disabled={!isFormComplete}
              className={`w-full h-[60px] rounded-full text-white text-xl font-bold py-2 mt-4 transition-all duration-300 transform ${
                isFormComplete
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105"
                  : "bg-gray-400 cursor-not-allowed opacity-50"
              }`}
            >
              ลงทะเบียน
            </button>
          </div>
      </div>

      {/* Confirm Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl border border-white/20 animate-scaleIn">
            <button
              onClick={handleCancelConfirm}
              className="self-start text-white/80 hover:text-white text-2xl transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">
                ยืนยันการลงทะเบียน
              </h2>
              <p className="text-white/80 text-sm">
                แน่ใจใช่หรือไม่?
              </p>
            </div>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`w-full h-12 rounded-full font-bold text-lg transition-all duration-300 ${
                isSubmitting 
                  ? "bg-white/50 text-gray-400 cursor-not-allowed" 
                  : "bg-white text-pink-500 hover:bg-gray-100 hover:scale-105 shadow-lg"
              }`}
            >
              {isSubmitting ? "กำลังส่ง..." : "ยืนยันจ้า"}
            </button>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl border border-white/20 animate-scaleIn">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-white text-3xl font-bold mb-2">
                สำเร็จ!
              </h2>
              <p className="text-white/80 text-lg">
                ลงทะเบียนเรียบร้อยแล้ว
              </p>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 text-white/60">
                <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">แตะที่นี่</span>
              </div>
              
              <button
                onClick={handleTouchMe}
                className="flex flex-col items-center justify-center bg-white/20 rounded-full p-4 hover:bg-white/30 transition-all duration-300 hover:scale-110"
              >
                <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              
              <div className="flex items-center gap-2 text-white/60">
                <span className="text-sm">เพื่อดำเนินการต่อ</span>
                <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
