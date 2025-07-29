'use client';

import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';

interface LogEntry {
  date: string;
  count: number;
}

export default function DataPage() {
  const [data, setData] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVisitData = async () => {
      try {
        const res = await fetch('/api/admin/participants');
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        const json = await res.json();
        setData(json.data || []);
        setTotal(json.total || 0);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchVisitData();
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col gap-10 py-14 px-4">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-6">
          <a href="/admin">
            <img src="/bbt.jpg" alt="back" className="w-[50px] h-[50px]" />
          </a>
          <h1 className="text-[20px] md:text-[24px] font-bold text-blueBrand text-center">
            ข้อมูลจำนวนคนเข้าร่วมงาน
          </h1>
        </div>

        {/* Content */}
        {loading ? (
          <p className="text-center">กำลังโหลดข้อมูล...</p>
        ) : error ? (
          <p className="text-center text-red-500">เกิดข้อผิดพลาด: {error}</p>
        ) : (
          <div className="flex flex-col gap-6">
            {data.map((entry, index) => (
              <div
                key={index}
                className="border border-gray-300 w-full flex flex-col md:flex-row justify-center items-center gap-4 md:gap-24 py-6"
              >
                <div className="bg-blueBrand w-[140px] h-[120px] rounded-[15px] flex flex-col justify-center items-center text-white text-[14px] font-medium">
                  <h1>วันที่</h1>
                  <h1>
                    {new Date(entry.date).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h1>
                </div>
                <div className="text-center text-blueBrand">
                  <h1 className="font-semibold">จำนวนผู้เข้าร่วมงาน</h1>
                  <h1 className="text-lg">{entry.count} คน</h1>
                </div>
              </div>
            ))}

            {/* Total Summary */}
            <div className="border border-gray-300 w-full flex flex-col md:flex-row justify-center items-center gap-4 md:gap-24 py-6">
              <div className="bg-blueBrand w-[140px] h-[120px] rounded-[15px] flex flex-col justify-center items-center text-white text-[14px] font-medium">
                <h1>รวมทั้ง</h1>
                <h1>{data.length} วัน</h1>
              </div>
              <div className="text-center text-blueBrand">
                <h1 className="font-semibold">จำนวนผู้เข้าร่วมงาน</h1>
                <h1 className="text-lg">{total} คน</h1>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
