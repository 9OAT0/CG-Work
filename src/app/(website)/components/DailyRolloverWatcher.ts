// components/DailyRolloverWatcher.tsx
"use client";
import { useEffect } from "react";

function msUntilNextBangkokMidnight() {
  const now = new Date();
  const nowBkk = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  const next = new Date(nowBkk);
  next.setHours(24, 0, 2, 0); // เลยเที่ยงคืนไทย ~2s กัน clock skew
  return next.getTime() - nowBkk.getTime();
}

export default function DailyRolloverWatcher() {
  useEffect(() => {
    const id = setTimeout(() => {
      // แค่เปลี่ยนหน้า → middleware จะลบ token ให้เอง
      window.location.replace("/?forced=daily");
    }, msUntilNextBangkokMidnight());
    return () => clearTimeout(id);
  }, []);
  return null;
}
