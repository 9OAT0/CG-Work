'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface MaintenanceData {
  isEnabled: boolean
  title: string
  message: string
  startTime?: string
  endTime?: string
}

interface WorkingHours {
  startHour: number
  endHour: number
  isEnabled: boolean
}

export default function MaintenancePage() {
  const searchParams = useSearchParams()
  const [currentTime, setCurrentTime] = useState<string>('')
  const [timeUntilOpen, setTimeUntilOpen] = useState<string>('')
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(null)
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null)
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false)
  
  // ตรวจสอบว่ามาจาก working hours หรือไม่
  const isWorkingHoursReason = searchParams.get('reason') === 'working_hours'
  const startHour = searchParams.get('start') || '6'
  const endHour = searchParams.get('end') || '16'

  // ดึงข้อมูล maintenance mode และ working hours
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึงข้อมูลจาก public API endpoint
        const response = await fetch('/api/maintenance-status')
        
        if (response.ok) {
          const result = await response.json()
          setMaintenanceData(result.maintenance)
          setWorkingHours(result.workingHours)
          setIsMaintenanceMode(result.maintenance.isEnabled)
        } else {
          throw new Error('Failed to fetch maintenance status')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // ใช้ค่าเริ่มต้นถ้าเกิดข้อผิดพลาด
        setMaintenanceData({
          isEnabled: false,
          title: "ระบบอยู่ในช่วงปรับปรุง",
          message: "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง"
        })
        setWorkingHours({
          startHour: 6,
          endHour: 16,
          isEnabled: true
        })
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const thailandTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}))
      
      // แสดงเวลาปัจจุบัน
      setCurrentTime(thailandTime.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }))

      // คำนวณเวลาที่เหลือ
      if (isMaintenanceMode && maintenanceData?.endTime) {
        // ถ้าอยู่ใน maintenance mode และมีเวลาสิ้นสุด
        const endTime = new Date(maintenanceData.endTime)
        const timeDiff = endTime.getTime() - thailandTime.getTime()
        
        if (timeDiff > 0) {
          const hours = Math.floor(timeDiff / (1000 * 60 * 60))
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
          setTimeUntilOpen(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        } else {
          setTimeUntilOpen('00:00:00')
        }
      } else if (workingHours) {
        // คำนวณเวลาที่เหลือจนถึงเวลาเปิด (ตาม working hours)
        const currentHour = thailandTime.getHours()
        const currentMinute = thailandTime.getMinutes()
        const currentSecond = thailandTime.getSeconds()

        let hoursUntilOpen: number
        let minutesUntilOpen: number
        let secondsUntilOpen: number

        if (currentHour < workingHours.startHour) {
          // ยังไม่ถึงเวลาเปิด
          hoursUntilOpen = workingHours.startHour - 1 - currentHour
          minutesUntilOpen = 59 - currentMinute
          secondsUntilOpen = 60 - currentSecond
        } else {
          // หลังเวลาปิดแล้ว ต้องรอถึงวันถัดไป
          hoursUntilOpen = 23 - currentHour + workingHours.startHour
          minutesUntilOpen = 59 - currentMinute
          secondsUntilOpen = 60 - currentSecond
        }

        // ปรับค่าถ้าเกิน 60
        if (secondsUntilOpen === 60) {
          secondsUntilOpen = 0
          minutesUntilOpen += 1
        }
        if (minutesUntilOpen === 60) {
          minutesUntilOpen = 0
          hoursUntilOpen += 1
        }

        setTimeUntilOpen(`${hoursUntilOpen.toString().padStart(2, '0')}:${minutesUntilOpen.toString().padStart(2, '0')}:${secondsUntilOpen.toString().padStart(2, '0')}`)
      }
    }

    // อัพเดททุกวินาที
    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [isMaintenanceMode, maintenanceData, workingHours])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* ไอคอนเครื่องมือ */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-full backdrop-blur-sm border border-white/20 mb-6">
            <svg 
              className="w-12 h-12 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
          </div>
        </div>

        {/* ข้อความหลัก */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {isWorkingHoursReason ? "นอกเวลาให้บริการ" : (maintenanceData?.title || "ระบบอยู่ในช่วงปรับปรุง")}
        </h1>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 mb-8">
          {isWorkingHoursReason && (
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-200 text-lg font-semibold mb-2">
                🔐 การเข้าสู่ระบบสำเร็จแล้ว
              </p>
              <p className="text-yellow-100 text-sm">
                แต่ขณะนี้อยู่นอกเวลาให้บริการ กรุณารอจนถึงเวลาเปิดให้บริการ
              </p>
            </div>
          )}
          
          <p className="text-xl md:text-2xl text-white/90 mb-6 leading-relaxed">
            {isMaintenanceMode ? (
              maintenanceData?.message || "เว็บไซต์อยู่ในช่วงปรับปรุง กรุณากลับมาใหม่อีกครั้ง"
            ) : isWorkingHoursReason ? (
              <>
                เว็บไซต์เปิดให้ใช้งานเวลา <span className="font-semibold text-yellow-300">
                  {startHour.padStart(2, '0')}:00 - {endHour.padStart(2, '0')}:00 น.
                </span>
                <br />
                <span className="text-lg">กรุณาเข้าใช้งานในเวลาที่กำหนด</span>
              </>
            ) : (
              <>
                เว็บไซต์เปิดให้ใช้งานเวลา <span className="font-semibold text-yellow-300">
                  {workingHours ? `${workingHours.startHour.toString().padStart(2, '0')}:00 - ${workingHours.endHour.toString().padStart(2, '0')}:00 น.` : "06:00 - 16:00 น."}
                </span>
                <br />
                ขณะนี้อยู่ในช่วงปรับปรุง
              </>
            )}
          </p>

          {/* แสดงเวลาปัจจุบัน */}
          <div className="mb-6">
            <p className="text-white/70 text-sm mb-2">เวลาปัจจุบัน</p>
            <p className="text-2xl font-mono text-white bg-black/20 rounded-lg py-2 px-4 inline-block">
              {currentTime}
            </p>
          </div>

          {/* นับถอยหลังจนถึงเวลาเปิด */}
          <div>
            <p className="text-white/70 text-sm mb-2">เปิดให้ใช้งานอีก</p>
            <p className="text-3xl font-mono font-bold text-yellow-300 bg-black/20 rounded-lg py-3 px-6 inline-block">
              {timeUntilOpen}
            </p>
          </div>
        </div>

        {/* ข้อมูลเพิ่มเติม */}
        <div className="text-white/60 text-sm">
          <p className="mb-2">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
            เวลาให้บริการ: 06:00 - 16:00 น. (เวลาประเทศไทย)
          </p>
          <p>
            <span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-2"></span>
            ปิดปรับปรุง: 16:01 - 05:59 น.
          </p>
        </div>
      </div>
    </div>
  )
}
