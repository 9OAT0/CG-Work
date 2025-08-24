import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

// ---------- Site metadata (ไม่ใส่ viewport ตรงนี้) ----------
export const metadata: Metadata = {
  // ใช้โดเมนโปรดักชันของคุณ เพื่อให้ OG/Twitter สร้าง URL สมบูรณ์
  metadataBase: new URL("https://brainbang-exhibition.vercel.app"),
  title: {
    default: "นิทรรศการแสดงศิลปนิพนธ์ - CG Work",
    template: "%s | CG Work",
  },
  description:
    "นิทรรศการแสดงผลงานศิลปนิพนธ์ นิสิตระดับชั้นปีที่ 4 สาขาวิชาคอมพิวเตอร์กราฟิกและมัลติมีเดีย",
  applicationName: "BrainBang Exhibition",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "นิทรรศการแสดงศิลปนิพนธ์ - CG Work",
    description:
      "นิทรรศการแสดงผลงานศิลปนิพนธ์ นิสิตระดับชั้นปีที่ 4 สาขาวิชาคอมพิวเตอร์กราฟิกและมัลติมีเดีย",
    url: "/",
    siteName: "CG Work",
    images: [{ url: "/og.png" }], // มีไฟล์นี้ไว้จะดีมาก
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "นิทรรศการแสดงศิลปนิพนธ์ - CG Work",
    description:
      "นิทรรศการแสดงผลงานศิลปนิพนธ์ นิสิตระดับชั้นปีที่ 4 สาขาวิชาคอมพิวเตอร์กราฟิกและมัลติมีเดีย",
    images: ["/og.png"],
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

// ---------- Viewport ต้อง export แยก ----------
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // หมายเหตุ: maximumScale: 1 จะล็อกการซูม อาจกระทบการเข้าถึง
  // ถ้าอยากอนุญาต pinch-zoom ให้ลบบรรทัดนี้ออก
  // maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="h-full">
      <body
        className={`${kanit.variable} font-kanit antialiased bg-white text-black min-h-screen
        [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]`}
      >
        {children}
      </body>
    </html>
  );
}