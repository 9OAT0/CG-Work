'use client'

import { useState } from 'react'

export default function Register() {
  const [facultyOpen, setFacultyOpen] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState('เลือกคณะ')
  const faculties = [
    'วิศวกรรมศาสตร์',
    'แพทยศาสตร์',
    'วิทยาศาสตร์',
    'ศึกษาศาสตร์',
    'บริหารธุรกิจ',
    'นิติศาสตร์',
    'รัฐศาสตร์',
    'สถาปัตยกรรมศาสตร์',
    'นิเทศศาสตร์',
    'พยาบาลศาสตร์',
    'อื่น ๆ',
  ]

  const [yearOpen, setYearOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState('เลือกชั้นปี')
  const years = ['ปี 1', 'ปี 2', 'ปี 3', 'ปี 4', 'ปี 5', 'ปีอื่น ๆ']

  return (
    <div className="min-h-screen flex flex-col justify-center items-center gap-16 bg-gray-100">
      <h1 className="text-[34px] font-normal">ลงทะเบียน</h1>

      <div className="flex flex-col gap-10 w-[300px]">
        <input
          type="text"
          placeholder="รหัสนิสิต / ชื่อผู้ใช้"
          className="bg-[#D9D9D9] w-full h-[50px] border px-3 py-2 rounded-full"
          required
        />
        <input
          type="text"
          placeholder="ชื่อ - นามสกุล"
          className="bg-[#D9D9D9] w-full h-[50px] border px-3 py-2 rounded-full"
          required
        />
        
        {/* Dropdown: คณะ */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setFacultyOpen(!facultyOpen)}
            className={`w-full h-[50px] rounded-full border ${
              selectedFaculty === 'เลือกคณะ' ? 'border' : 'border'
            } bg-[#D9D9D9] px-4 py-2 text-sm shadow-sm hover:bg-gray-50`}

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
                    setSelectedFaculty(faculty)
                    setFacultyOpen(false)
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {faculty}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dropdown: ชั้นปี */}
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setYearOpen(!yearOpen)}
            className={`w-full h-[50px] rounded-full border ${
              selectedYear === 'เลือกชั้นปี' ? 'border' : 'border'
            } bg-[#D9D9D9] px-4 py-2 text-sm shadow-sm hover:bg-gray-50`}
          >
            {selectedYear}
            <span className="float-right">&#9662;</span>
          </button>

          {yearOpen && (
            <ul className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg text-sm">
              {years.map((year) => (
                <li
                  key={year}
                  onClick={() => {
                    setSelectedYear(year)
                    setYearOpen(false)
                  }}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {year}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className="w-full h-[70px] bg-[#D9D9D9] text-black text-2xl py-2 rounded-full hover:bg-blue-600">
          ยืนยัน
        </button>
      </div>
    </div>
  )
}
