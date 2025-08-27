import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  from?: string;
  next?: string;
  forced?: string;
};

export default function Page({ searchParams }: { searchParams?: SearchParams }) {
  const from = searchParams?.from;
  const next = searchParams?.next;
  const forced = searchParams?.forced;

  // เลือกปลายทางหลังล็อกอิน (ค่าเริ่มต้น /homepage)
  const candidate = (typeof from === "string" && from) || (typeof next === "string" && next) || "/homepage";

  // กัน open-redirect + กันวนลูปไปหน้าที่ไม่ควรกลับ
  let returnTo = candidate.startsWith("/") ? candidate : "/homepage";
  if (
    returnTo.startsWith("/login") ||
    returnTo.startsWith("/register") ||
    returnTo.startsWith("/maintenance")
  ) {
    returnTo = "/homepage";
  }

  return <LoginClient returnTo={returnTo} forced={forced} />;
}
