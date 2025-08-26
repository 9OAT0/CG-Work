// lib/getBangkokDay.ts
export function getBangkokDay() {
    const th = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
    const y = th.getFullYear()
    const m = String(th.getMonth() + 1).padStart(2, '0')
    const d = String(th.getDate()).padStart(2, '0')
    const dayKey = `${y}-${m}-${d}` // ใช้กับ unique (userId, dayKey)
    return {
      dayKey,
      startUtc: new Date(`${dayKey}T00:00:00.000+07:00`),
      endUtc:   new Date(`${dayKey}T23:59:59.999+07:00`),
    }
  }
  