'use client';

import Navbar from "../components/Navbar";

export default function AdminPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col justify-center items-center gap-6 px-4 text-white">
        <a
          href="/data"
          className="bg-blueBrand w-full max-w-sm h-[49px] rounded-[30px] flex justify-center items-center text-[16px] text-center"
        >
          ข้อมูลจำนวนคนเข้าร่วมงาน
        </a>
        <a
          href="/errortranscript"
          className="bg-blueBrand w-full max-w-sm h-[49px] rounded-[30px] flex justify-center items-center text-[16px] text-center"
        >
          ทรานสคริปต์มีปัญหา
        </a>
      </div>
    </>
  );
}
