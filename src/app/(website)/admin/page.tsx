'use client';

import Navbar from "../components/Navbar"

export default function AdminPage() {
    return (
        <>
            <Navbar />
            <div className="min-h-screen flex flex-col justify-center items-center gap-6 text-white">
                <a href="/data" className="bg-blueBrand w-[318px] h-[49px] rounded-[30px] flex justify-center items-center text-[16px]">
                    ข้อมูลจำนวนคนเข้าร่วมงาน
                </a>
                <a href="/data" className="bg-blueBrand w-[318px] h-[49px] rounded-[30px] flex justify-center items-center text-[16px]">
                    ทรานสคริปต์มีปัญหา
                </a>
            </div>
        </>
    )
}