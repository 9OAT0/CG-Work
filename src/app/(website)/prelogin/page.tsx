"use client";

export default function PreloginPage() {
  return (
    <div
      className="h-screen bg-cover bg-center bg-no-repeat flex justify-center items-center text-white"
      style={{ backgroundImage: "url('/Rectangle 140.png')" }}
    >
      <div className="flex flex-col justify-center items-center gap-[100px]">
        <img src="/Ellipse 51.png" alt="" className="w-[291px] h-[291px]" />
        <div className="flex flex-col items-center gap-4">
          <a
            href="/login"
            className="w-[250px] h-[49px] bg-pink-500 rounded-[30px] font-bold flex justify-center items-center"
          >
            เข้าสู่ระบบ
          </a>
          <div className="flex gap-2">
            <h1 className="font-bold">หรือ</h1>
            <a href="/register" className="border-b font-bold">
              ลงทะเบียน
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
