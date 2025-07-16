"use client";

import { useState } from "react";

export default function Register() {
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("เลือกสถานะ");
  const statuses = [
    "นักเรียน",
    "นิสิต",
    "อาจารย์",
    "บุคลากรสายสนับสนุน",
    "บุคลากรทั่วไป",
    "อื่นๆ",
  ];

  const [facultyOpen, setFacultyOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState("เลือกคณะ");
  const faculties = [
    "วิศวกรรมศาสตร์",
    "แพทยศาสตร์",
    "วิทยาศาสตร์",
    "ศึกษาศาสตร์",
    "บริหารธุรกิจ",
    "นิติศาสตร์",
    "รัฐศาสตร์",
    "สถาปัตยกรรมศาสตร์",
    "นิเทศศาสตร์",
    "พยาบาลศาสตร์",
    "อื่น ๆ",
  ];

  const [studentID, setStudentID] = useState("");
  const [fullName, setFullName] = useState("");
  const [consent, setConsent] = useState(false); // ✅ ยินยอมในการมอบข้อมูล

  // ✅ ตรวจสอบว่ากรอกครบทุกช่อง + ยินยอมแล้ว
  const isFormComplete =
    selectedStatus !== "เลือกสถานะ" &&
    fullName.trim() !== "" &&
    selectedFaculty !== "เลือกคณะ" &&
    (selectedStatus !== "นิสิต" || studentID.trim() !== "") &&
    consent;

  const handleSubmit = () => {
    if (!isFormComplete) return;
    alert("ลงทะเบียนสำเร็จ!");
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center gap-16 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/Rectangle 140.png')" }}
    >
      <h1 className="text-[34px] font-normal text-white">ลงทะเบียน</h1>

      <div className="flex flex-col gap-6 w-[300px]">
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
            required
          />
        )}

        {/* Input: ชื่อ - นามสกุล */}
        <input
          type="text"
          placeholder="ชื่อ - นามสกุล"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="bg-[#D9D9D9] w-full h-[50px] border px-3 py-2 rounded-full"
          required
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

        {/* Checkbox: ยินยอมในการมอบข้อมูล */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="peer w-5 h-5 border-2 border-pink-500 rounded-sm appearance-none 
                        checked:bg-white checked:border-pink-500 focus:ring-0 cursor-pointer"
            />
            {/* ✔ icon */}
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
          <label htmlFor="consent" className="text-white cursor-pointer">
            ฉันยินยอมในการมอบข้อมูลเพื่อใช้ในการลงทะเบียน
          </label>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!isFormComplete}
          className={`w-full h-[70px] rounded-full text-white text-2xl py-2 transition-colors duration-300 ${
            isFormComplete
              ? "bg-pink-500 hover:bg-pink-600 cursor-pointer"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          ยืนยัน
        </button>
      </div>
    </div>
  );
}
