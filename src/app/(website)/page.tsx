<<<<<<< Updated upstream
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false); // เริ่ม animation ออกจาก splash
      setTimeout(() => {
        router.push("/prelogin"); // ไปหน้า Prelogin
      }, 1000); // รอให้ animation จบก่อน (1s)
    }, 3000); // Splash screen อยู่ 3 วิ

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            className="min-h-screen bg-cover bg-center bg-no-repeat flex justify-center items-center"
            style={{ backgroundImage: "url('/Rectangle 140.png')" }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 1 }}
          >
            <img
              src="/Ellipse 51.png"
              alt="Logo"
              className="w-[291px] h-[291px]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
=======
export default function Home() {
  return (
    <>
      <div className="min-h-screen bg-pink-500 flex justify-center items-center">
        <img src="/Ellipse 2.png" alt="" />
      </div>
    </>
  )
}
>>>>>>> Stashed changes
