"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";

export default function RegisterBooth() {
  const router = useRouter();
  
  // Form states
  const [boothName, setBoothName] = useState("");
  const [boothCode, setBoothCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDeptType, setSelectedDeptType] = useState("เลือกประเภทหน่วยงาน");
  const [deptTypeOpen, setDeptTypeOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Department types - updated based on feedback
  const deptTypes = [
    "3D",
    "Graphic",
    "Product Design",
    "Production",
    "Digital Art",
    "Game Design"
  ];

  // Form validation
  const isFormComplete = 
    boothName.trim() !== "" &&
    boothCode.trim() !== "" &&
    description.trim() !== "" &&
    selectedDeptType !== "เลือกประเภทหน่วยงาน";

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์');
        return;
      }

      // Add uploaded file URLs to the state
      const newImageUrls = data.files.map((file: any) => file.url);
      setUploadedImages(prev => [...prev, ...newImageUrls]);

    } catch (error) {
      alert('เกิดข้อผิดพลาดในการอัพโหลดไฟล์');
    } finally {
      setIsUploading(false);
    }
  };

  // Remove uploaded image
  const removeImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Handle form submission
  const handleRegisterClick = () => {
    if (!isFormComplete) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/register-booth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booth_name: boothName,
          booth_code: boothCode,
          dept_type: selectedDeptType,
          description: description,
          pics: uploadedImages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'เกิดข้อผิดพลาดในการลงทะเบียนบูธ');
        setShowConfirm(false);
        return;
      }

      setShowConfirm(false);
      setShowSuccess(true);

    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  const handleGoToHomepage = () => {
    router.push("/homepage");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blueBrand to-pinkBrand">
      <Navbar />
      
      <div className="flex flex-col items-center px-4 py-8">
        <h1 className="text-[34px] font-normal text-white mb-8">ลงทะเบียนบูธ</h1>

        <div className="flex flex-col gap-6 w-full max-w-[400px]">
          {/* Booth Name Input */}
          <input
            type="text"
            placeholder="ชื่อบูธ"
            value={boothName}
            onChange={(e) => setBoothName(e.target.value)}
            className="bg-[#D9D9D9] w-full h-[50px] border px-4 py-2 rounded-full text-black placeholder-gray-600"
          />

          {/* Booth Code Input */}
          <input
            type="text"
            placeholder="รหัสบูธ (ใช้สำหรับให้ผู้เข้าร่วมสแกน)"
            value={boothCode}
            onChange={(e) => setBoothCode(e.target.value)}
            className="bg-[#D9D9D9] w-full h-[50px] border px-4 py-2 rounded-full text-black placeholder-gray-600"
          />

          {/* Department Type Dropdown */}
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setDeptTypeOpen(!deptTypeOpen)}
              className="w-full h-[50px] rounded-full border bg-[#D9D9D9] px-4 py-2 text-sm shadow-sm hover:bg-gray-50 text-left text-black"
            >
              {selectedDeptType}
              <span className="float-right">&#9662;</span>
            </button>

            {deptTypeOpen && (
              <ul className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg text-sm max-h-60 overflow-auto">
                {deptTypes.map((deptType) => (
                  <li
                    key={deptType}
                    onClick={() => {
                      setSelectedDeptType(deptType);
                      setDeptTypeOpen(false);
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-black"
                  >
                    {deptType}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Description Textarea */}
          <textarea
            placeholder="รายละเอียดบูธ (กิจกรรม, จุดเด่น, สิ่งที่น่าสนใจ)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="bg-[#D9D9D9] w-full border px-4 py-3 rounded-2xl text-black placeholder-gray-600 resize-none"
          />

          {/* Image Upload Section */}
          <div className="bg-white/20 rounded-2xl p-4">
            <h3 className="text-white text-lg mb-3">รูปภาพบูธ (ไม่บังคับ)</h3>
            
            {/* Upload Button */}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/50 rounded-lg cursor-pointer hover:border-white/70 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p className="mb-2 text-sm text-white">
                  <span className="font-semibold">คลิกเพื่ออัพโหลด</span> หรือลากไฟล์มาวาง
                </p>
                <p className="text-xs text-white/70">PNG, JPG, GIF (สูงสุด 5MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>

            {/* Loading indicator */}
            {isUploading && (
              <div className="flex items-center justify-center mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                <span className="ml-2 text-white">กำลังอัพโหลด...</span>
              </div>
            )}

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="mt-4">
                <h4 className="text-white text-sm mb-2">รูปภาพที่อัพโหลดแล้ว:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleRegisterClick}
            disabled={!isFormComplete}
            className={`w-full h-[70px] rounded-full text-white text-2xl py-2 transition-colors duration-300 ${
              isFormComplete
                ? "bg-orangeBrand hover:bg-orange-600 cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            ลงทะเบียนบูธ
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-4">
          <div className="bg-orangeBrand rounded-3xl p-6 w-full max-w-[346px] h-[490px] flex flex-col justify-center items-center gap-8">
            <button
              onClick={handleCancelConfirm}
              className="self-start text-white text-2xl"
            >
              <img src="/Vector.png" alt="back" />
            </button>
            
            <div className="text-center">
              <h2 className="text-white text-2xl font-bold mb-4">
                ยืนยันการลงทะเบียนบูธ
              </h2>
              <div className="text-white text-sm space-y-2">
                <p><strong>ชื่อบูธ:</strong> {boothName}</p>
                <p><strong>รหัสบูธ:</strong> {boothCode}</p>
                <p><strong>หน่วยงาน:</strong> {selectedDeptType}</p>
                {uploadedImages.length > 0 && (
                  <p><strong>รูปภาพ:</strong> {uploadedImages.length} รูป</p>
                )}
              </div>
            </div>
            
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-40 h-12 bg-white rounded-full text-orangeBrand font-medium text-lg"
            >
              {isSubmitting ? "กำลังส่ง..." : "ยืนยัน"}
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-4">
          <div className="bg-orangeBrand rounded-3xl p-6 w-full max-w-80 flex flex-col items-center gap-4">
            <h2 className="text-white text-2xl font-bold text-center">
              ลงทะเบียนบูธ<br />เรียบร้อยแล้ว!
            </h2>
            <div className="flex items-center gap-6 relative mt-4">
              {/* Arrow Left - Animated */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-white animate-arrow-right"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>

              {/* Touch Me Button */}
              <button
                onClick={handleGoToHomepage}
                className="flex flex-col items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-16 h-16 text-white animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v2m0 4v2m0-8a4 4 0 110-8 4 4 0 010 8zm0 0v2m0 4v2" />
                </svg>
                <p className="text-white mt-2">Touch Me</p>
              </button>

              {/* Arrow Right - Animated */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-white animate-arrow-left"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
