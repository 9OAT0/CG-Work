// src/app/(website)/components/LoginParticles.tsx
"use client";

import { useEffect, useState } from "react";

type Particle = {
  left: number;    // 0..100 (percent)
  top: number;     // 0..100 (percent)
  delay: number;   // seconds
  duration: number;// seconds
};

export default function LoginParticles({ count = 50 }: { count?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // ใช้ Math.random เฉพาะฝั่ง client
    const list: Particle[] = Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
    }));
    setParticles(list);
  }, [count]);

  // ระหว่าง SSR จะเรนเดอร์เป็นค่าว่าง → ไม่มี mismatch
  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white opacity-30 rounded-full animate-pulse"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
