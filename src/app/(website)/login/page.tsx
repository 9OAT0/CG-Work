import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  from?: string;
  next?: string;
  forced?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const q = await searchParams; // ✅ ต้อง await ก่อนใช้

  const from = typeof q.from === "string" ? q.from : undefined;
  const next = typeof q.next === "string" ? q.next : undefined;
  const forced = typeof q.forced === "string" ? q.forced : undefined;

  // เลือกปลายทางหลังล็อกอิน (ค่าเริ่มต้น /homepage) + กัน open-redirect
  const candidate = from || next || "/homepage";
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
