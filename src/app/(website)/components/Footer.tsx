export default function Footer() {
    return (
        <>
            <div className="bg-blueBrand w-full h-[345px] flex justify-center items-center text-white gap-64">
                <div className="flex flex-col gap-5">
                    <img src="/logoFooter.jpg" alt="" className="w-[177px] h-[147px]"/>
                    <h1>
                        © 2025 Brain Bang - Thesis Exhibition <br/>
                        University of Phayao. All rights reserved.  
                    </h1>
                    <div className="flex items-center gap-3">
                        <h1>FB</h1>
                        <h1>IG</h1>
                        <h1>TIKTOK</h1>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <h1 className="font-bold text-xl">ผลงานจัดแสดง</h1>
                    <a href="/homepage" className="font-regular">3D</a>
                    <a href="/homepage" className="font-regular">Graphic</a>
                    <a href="/homepage" className="font-regular">Product Design</a>
                    <a href="/homepage" className="font-regular">Editor & Motion</a>
                    <a href="/homepage" className="font-regular">Digital Art</a>
                    <a href="/homepage" className="font-regular">Game Design</a>
                </div>
            </div>
        </>
    )
}