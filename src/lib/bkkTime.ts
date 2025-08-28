// Asia/Bangkok = UTC+7
export function bangkokYMD(): string {
    const th = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const y = th.getFullYear();
    const m = String(th.getMonth() + 1).padStart(2, "0");
    const d = String(th.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  
  export function nextBangkokMidnightUTC(): Date {
    const now = new Date();
    const UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
    const bkkNow = new Date(now.getTime() + UTC_OFFSET_MS);
    const y = bkkNow.getUTCFullYear();
    const m = bkkNow.getUTCMonth();
    const d = bkkNow.getUTCDate();
    // เที่ยงคืนวันถัดไป (เวลาไทย) แล้วแปลงกลับเป็น UTC
    const nextMidnightUTC = Date.UTC(y, m, d + 1, 0, 0, 0) - UTC_OFFSET_MS;
    return new Date(nextMidnightUTC);
  }
  