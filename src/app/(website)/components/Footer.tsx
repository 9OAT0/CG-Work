export default function Footer() {
  return (
    <footer className="bg-blueBrand w-full text-white px-6 py-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-10 md:gap-20">
        {/* Left Section */}
        <div className="flex flex-col items-center md:items-start gap-4 text-center md:text-left">
          <img src="/brainbang_footer_logo.png" alt="Footer Logo" className="w-[150px] h-auto" />
          <p className="text-sm leading-relaxed">
            © 2025 Brain Bang - Thesis Exhibition<br />
            University of Phayao. All rights reserved.
          </p>
          <div className="flex gap-4 mt-2">
            <span>FB</span>
            <span>IG</span>
            <span>TIKTOK</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-col gap-2 text-center md:text-left">
          <h1 className="font-bold text-lg">ผลงานจัดแสดง</h1>
            <a href="/category?dept=1" className="hover:underline">3D</a>
            <a href="/category?dept=2" className="hover:underline">Graphic</a>
            <a href="/category?dept=3" className="hover:underline">Product Design</a>
            <a href="/category?dept=4" className="hover:underline">Production</a>
            <a href="/category?dept=5" className="hover:underline">Digital Art</a>
            <a href="/category?dept=6" className="hover:underline">Game Design</a>
        </div>
      </div>
    </footer>
  );
}
