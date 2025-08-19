import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "นิทรรศการแสดงศิลปนิพนธ์ - CG Work",
  description:
    "นิทรรศการแสดงผลงานศิลปนิพนธ์ นิสิตระดับชั้นปีที่ 4 สาขาวิชาคอมพิวเตอร์กราฟิกและมัลติมีเดีย",
  // ❌ เอา viewport ออกจาก metadata
};

// ✅ ต้องมาอยู่ตรงนี้แทน
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body
        className={`${kanit.variable} font-kanit antialiased bg-white text-black`}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}