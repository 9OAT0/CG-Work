'use client';

import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProfileData {
  name: string;
  student_id: string;
  status: string;
  dept: string;
  dailyPoints: number;
  totalPoints: number;
  transcriptDates: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileData | null>(null);
  const [redeemed, setRedeemed] = useState<{ [key: string]: boolean }>({
    '27': false,
    '28': false,
    '29': false,
  });
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include' });
        const data = await res.json();

        if (!res.ok) {
          console.error('Error:', data.error);
          return;
        }

        setUser(data);

        const claimedMap: { [key: string]: boolean } = { '27': false, '28': false, '29': false };
        data.transcriptDates?.forEach((date: string) => {
          const day = date.split('-')[2];
          if (['27', '28', '29'].includes(day)) claimedMap[day] = true;
        });

        setRedeemed(claimedMap);
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };

    fetchProfile();
  }, []);

  const handleRedeem = (day: string) => {
    if (!user) return;
    if (redeemed[day]) return;

    if (user.dailyPoints < 6) {
      const missing = 6 - user.dailyPoints;
      setPopupMessage(`ท่านยังขาดคะแนนอีก ${missing} คะแนนในการแลกรับทรานสคริปต์`);
      setShowPopup(true);
      return;
    }

    router.push(`/gettranscript?day=${day}`);
  };

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen flex flex-col gap-8 py-10 px-4 max-w-2xl mx-auto">
        {/* ข้อมูลผู้ใช้ */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 sm:gap-10">
          <img src="/prog.jpg" alt="profile" className="w-[110px] h-[110px]" />
          <div className="text-blueBrand flex flex-col gap-1 text-center sm:text-left">
            <h1 className="text-[22px] sm:text-[24px] font-bold">{user.name}</h1>
            <h1 className="text-[16px]">
              {user.student_id} สถานะ : {user.status}
            </h1>
            <h1 className="text-[16px]">คณะ{user.dept}</h1>
          </div>
        </div>

        {/* คะแนนประจำวัน */}
        <div className="border border-gray-300 w-full flex flex-col items-center py-6 px-4 rounded-xl">
          <h1 className="text-blueBrand text-[14px]">คะแนนประจำวันของการร่วมกิจกรรม</h1>
          <div className="w-full max-w-[366px] h-auto bg-blueBrand rounded-[20px] flex flex-col justify-center items-center text-white gap-3 mt-4 py-6 px-4">
            <div className="flex flex-col items-center">
              <h1 className="text-[40px] sm:text-[50px] font-bold">
                {user.dailyPoints}/30
              </h1>
              <h1 className="font-medium text-[16px]">
                คะแนนรวมทั้งหมด {user.totalPoints}/90
              </h1>
            </div>
            <button
              className="w-[250px] h-[49px] rounded-[30px] bg-pinkBrand"
              onClick={() => {
                if (user.dailyPoints >= 6) {
                  router.push('/transferpoint');
                } else {
                  setPopupMessage('คุณยังไม่มีคะแนนสำหรับแลกในวันนี้');
                  setShowPopup(true);
                }
              }}
            >
              แลกรับของรางวัล
            </button>
          </div>
        </div>

        {/* รับทรานสคริปต์ */}
        <div className="border border-gray-300 w-full flex flex-col items-center py-6 px-4 rounded-xl">
          <h1 className="text-blueBrand text-[14px]">รับทรานสคริปต์</h1>
          <div className="w-full max-w-[366px] bg-blueBrand rounded-[20px] flex flex-col justify-center items-center text-white gap-3 mt-4 py-6 px-4">
            <h1 className="text-[12px] font-medium">
              *ต้องมีอย่างน้อย 6 คะแนนจึงจะรับทรานสคริปต์ได้*
            </h1>
            <div className="flex gap-4 sm:gap-8 mt-2">
              {['27', '28', '29'].map((day) => (
                <button key={day} onClick={() => handleRedeem(day)} disabled={redeemed[day]}>
                  <img
                    src={redeemed[day] ? `/${day}c.jpg` : `/${day}.jpg`}
                    className="w-[70px] sm:w-[86px] h-[70px] sm:h-[86px]"
                    alt={`day-${day}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <h1 className="font-bold text-[16px] text-blueBrand pt-4 text-center">
            เปิดหน้านี้เมื่อต้องการรับทรานสคริปต์
          </h1>
        </div>

        {/* ปุ่มกลับหน้าหลัก */}
        <div className="flex justify-center mt-6">
          <a
            href="/homepage"
            className="bg-blueBrand w-[250px] h-[49px] rounded-[30px] flex justify-center items-center"
          >
            <h1 className="text-white text-[16px]">กลับหน้าหลัก</h1>
          </a>
        </div>
      </div>

      {/* Popup แจ้งเตือน */}
      {showPopup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 px-4"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg text-center w-full max-w-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h1 className="text-blueBrand font-semibold text-[18px] mb-4">
              {popupMessage}
            </h1>
            <button
              onClick={() => setShowPopup(false)}
              className="mt-2 bg-pinkBrand text-white px-4 py-2 rounded-full w-[200px]"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </>
  );
}
