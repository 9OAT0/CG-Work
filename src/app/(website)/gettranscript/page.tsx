'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';

export default function GetTranscriptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const day = searchParams.get('day') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dayText: Record<string, string> = {
    '27': 'วันที่ 27 สิงหาคม 2568',
    '28': 'วันที่ 28 สิงหาคม 2568',
    '29': 'วันที่ 29 สิงหาคม 2568'
  };

  useEffect(() => {
    if (!['27', '28', '29'].includes(day)) {
      setError('ไม่พบวันที่ที่ถูกต้อง');
      setLoading(false);
      return;
    }

    fetch('/api/claim-transcript', {
      method: 'POST',
      credentials: 'include'
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'ไม่สามารถโหลดข้อมูลได้');
        }
      })
      .catch(() => {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [day]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-blueBrand text-lg">กำลังโหลด...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center px-4">
        <p className="text-red-500 text-lg">{error}</p>
        <button
          onClick={() => router.push('/profile')}
          className="mt-6 bg-blueBrand text-white px-6 py-2 rounded-full text-sm md:text-base"
        >
          กลับหน้าโปรไฟล์
        </button>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col justify-center items-center pt-10 px-4">
        <h1 className="text-xl md:text-2xl font-bold text-blueBrand mb-4 text-center">
          Transcript สำหรับ {dayText[day]}
        </h1>
        <img
          src={`/${day}c.jpg`}
          alt="transcript"
          className="w-full max-w-xs sm:max-w-sm md:max-w-md rounded-lg shadow-lg"
        />
        <button
          className="mt-8 bg-blueBrand text-white px-6 py-2 md:py-3 rounded-full text-sm md:text-base"
          onClick={() => router.push('/profile')}
        >
          กลับหน้าโปรไฟล์
        </button>
      </div>
    </>
  );
}
