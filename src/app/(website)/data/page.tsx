'use client';

import Navbar from "../components/Navbar";

export default function DataPage() {
    return (
        <>
            <Navbar />
            <div className="min-h-screen">
                <div className="flex justify-center items-center">
                    <a href="/admin" className="bg-blueBrand w-12 h-12 rounded-full flex justify-center items-center"><img src="/Group 57.jpg" alt="" className="w-6 h-6"/></a>
                    <h1 className="text-[24px] font-bold text-blueBrand">ข้อมูลจำนวนคนเข้าร่วมงาน</h1>
                </div>
            </div>
        </>
    )
}