"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";

interface StatsData {
  overview: {
    totalUsers: number;
    totalBooths: number;
    totalParticipations: number;
    totalRatings: number;
    totalTranscripts: number;
    period: {
      newUsers: number;
      newBooths: number;
      newParticipations: number;
      days: string;
    };
  };
  topBooths: Array<{
    id: string;
    booth_name: string;
    dept_type: string;
    participants: number;
    ratings: number;
    favorites: number;
    averageRating: number;
  }>;
  topUsers: Array<{
    id: string;
    name: string;
    score: number;
    dept: string;
    _count: {
      joinedBooths: number;
    };
  }>;
  departmentStats: Array<{
    department: string;
    userCount: number;
  }>;
  dailyActivity: Array<{
    date: string;
    newUsers: number;
    newParticipations: number;
    newRatings: number;
  }>;
}

interface ParticipantsData {
  data: Array<{
    date: string;
    count: number;
  }>;
  total: number;
}

interface TranscriptIssue {
  id: string;
  student_id: string;
  name: string;
  year: string;
  dept: string;
  createdAt: string;
}

interface NewBoothData {
  booth_name: string;
  booth_code: string;
  dept_type: string;
  description: string;
  owner_names: string[];
}

interface WorkingHours {
  id: string;
  startHour: number;
  endHour: number;
  isEnabled: boolean;
  updatedAt: string;
  updatedUser?: {
    name: string;
    username: string;
  };
}

export default function AdminDashboard() {
  // helper: always send cookies + avoid cache for admin APIs
  const authedFetch: typeof fetch = (input, init) =>
    fetch(input as any, {
      credentials: "include",
      cache: "no-store",
      ...(init || {}),
    });

  // helper: YYYY-MM-DD ตามโซนเวลาไทย
  const dayStrTH = (d = new Date()) => {
    const t = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [participants, setParticipants] = useState<ParticipantsData | null>(
    null
  );
  const [transcriptIssues, setTranscriptIssues] = useState<TranscriptIssue[]>(
    []
  );
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);
  const [dailyLogins, setDailyLogins] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("7d");
  const controllerRef = useRef<AbortController | null>(null);

  // New booth form state
  const [newBooth, setNewBooth] = useState<NewBoothData>({
    booth_name: "",
    booth_code: "",
    dept_type: "",
    description: "",
    owner_names: [""],
  });

  // New transcript issue form state
  const [newIssue, setNewIssue] = useState({
    student_id: "",
    name: "",
    year: "",
    dept: "",
  });

  // --- เพิ่มด้านบนใน component ---
  type QRItem = {
    id: string;
    code: string;
    boothId: string;
    booth_name: string;
    booth_code: string;
    entitlementKey: string;
    cost: number;
    rule: "ONCE_PER_EVENT" | "ONCE_PER_DAY" | "UNLIMITED";
    uses: number;
    maxUses?: number | null;
    active: boolean;
    expiresAt?: string | null;
    createdAt: string;
  };

  const [boothsMini, setBoothsMini] = useState<
    Array<{ id: string; booth_name: string; booth_code: string }>
  >([]);
  const [qrList, setQrList] = useState<QRItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    boothId: "",
    activityName: "",
    cost: 5,
    rule: "ONCE_PER_EVENT",
    maxUses: "" as string | "",
    expiresAt: "" as string | "", // datetime-local
    active: true,
  });
  const [createResult, setCreateResult] = useState<{
    qrDataUrl: string;
    qrString: string;
    entitlementKey: string;
  } | null>(null);

  async function fetchBoothsMini() {
    const res = await authedFetch("/api/admin/booths");
    if (res.ok) {
      const j = await res.json();
      setBoothsMini(j.data || []);
      if (j.data?.length && !createForm.boothId) {
        setCreateForm((prev) => ({ ...prev, boothId: j.data[0].id }));
      }
    }
  }

  async function fetchQrCodes(boothId?: string) {
    const url = new URL("/api/admin/qrcodes", window.location.origin);
    if (boothId) url.searchParams.set("boothId", boothId);
    const res = await authedFetch(url.toString());
    if (res.ok) {
      const j = await res.json();
      setQrList(j.data || []);
    }
  }

  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateResult(null);
    try {
      const payload: any = {
        boothId: createForm.boothId,
        activityName: createForm.activityName,
        cost: Number(createForm.cost),
        rule: createForm.rule,
        active: createForm.active,
      };
      if (createForm.maxUses !== "")
        payload.maxUses = Number(createForm.maxUses);
      if (createForm.expiresAt)
        payload.expiresAt = new Date(createForm.expiresAt).toISOString();

      const res = await fetch("/api/admin/qrcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || "สร้างกิจกรรมไม่สำเร็จ");
        return;
      }
      setCreateResult({
        qrDataUrl: j.data.qrDataUrl,
        qrString: j.data.qrString,
        entitlementKey: j.data.entitlementKey,
      });
      await fetchQrCodes(createForm.boothId);
      setCreateForm((prev) => ({
        ...prev,
        activityName: "",
        cost: 5,
        maxUses: "",
        expiresAt: "",
      }));
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, participantsRes, issuesRes] = await Promise.all([
        authedFetch(`/api/admin/stats?period=${period}`),
        authedFetch("/api/admin/participants"),
        authedFetch("/api/admin/transcript-issues"),
      ]);

      if (!statsRes.ok || !participantsRes.ok || !issuesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [statsData, participantsData, issuesData] = await Promise.all([
        statsRes.json(),
        participantsRes.json(),
        issuesRes.json(),
      ]);

      setStats(statsData);
      setParticipants(participantsData);
      setTranscriptIssues(issuesData.issues || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooth = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/admin/register-booth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBooth),
      });

      if (response.ok) {
        alert("สร้างบูธสำเร็จ!");
        setNewBooth({
          booth_name: "",
          booth_code: "",
          dept_type: "",
          description: "",
          owner_names: [""],
        });
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`เกิดข้อผิดพลาด: ${errorData.error}`);
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการสร้างบูธ");
    }
  };

  const handleAddTranscriptIssue = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/admin/transcript-issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newIssue),
      });

      if (response.ok) {
        alert("เพิ่มรายการปัญหาทรานสคริปต์สำเร็จ!");
        setNewIssue({
          student_id: "",
          name: "",
          year: "",
          dept: "",
        });
        fetchData(); // Refresh data
      } else {
        const errorData = await response.json();
        alert(`เกิดข้อผิดพลาด: ${errorData.error}`);
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเพิ่มรายการ");
    }
  };

  const addOwnerName = () => {
    setNewBooth((prev) => ({
      ...prev,
      owner_names: [...prev.owner_names, ""],
    }));
  };

  const updateOwnerName = (index: number, value: string) => {
    setNewBooth((prev) => ({
      ...prev,
      owner_names: prev.owner_names.map((name, i) =>
        i === index ? value : name
      ),
    }));
  };

  const removeOwnerName = (index: number) => {
    setNewBooth((prev) => ({
      ...prev,
      owner_names: prev.owner_names.filter((_, i) => i !== index),
    }));
  };

  const handleExportTranscriptIssues = async () => {
    try {
      const response = await fetch("/api/admin/export/transcript-issues");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ปัญหาทรานสคริปต์_${new Date()
          .toLocaleDateString("th-TH")
          .replace(/\//g, "-")}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("เกิดข้อผิดพลาดในการ export ข้อมูล");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการ export ข้อมูล");
    }
  };

  const handleExportUsers = async () => {
    try {
      const response = await fetch("/api/admin/export/users");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ข้อมูลผู้ใช้_${new Date()
          .toLocaleDateString("th-TH")
          .replace(/\//g, "-")}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("เกิดข้อผิดพลาดในการ export ข้อมูล");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการ export ข้อมูล");
    }
  };

  // Working Hours functions
  const fetchWorkingHours = async () => {
    try {
      const response = await fetch("/api/admin/working-hours");
      if (response.ok) {
        const data = await response.json();
        setWorkingHours(data.data);
      }
    } catch (error) {
      console.error("Error fetching working hours:", error);
    }
  };

  const handleUpdateWorkingHours = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workingHours) return;

    try {
      const response = await fetch("/api/admin/working-hours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startHour: workingHours.startHour,
          endHour: workingHours.endHour,
          isEnabled: workingHours.isEnabled,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setWorkingHours(data.data);
        alert("อัพเดทเวลาทำงานสำเร็จ!");
      } else {
        const errorData = await response.json();
        alert(`เกิดข้อผิดพลาด: ${errorData.error}`);
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการอัพเดทเวลาทำงาน");
    }
  };

  // Load working hours when working-hours tab is selected
  useEffect(() => {
    if (activeTab === "working-hours" && !workingHours) {
      fetchWorkingHours();
    }
  }, [activeTab, workingHours]);

  // --- Daily Logins states ---
  const dailyLoginsControllerRef = useRef<AbortController | null>(null);
  const [dailyLoginsLoading, setDailyLoginsLoading] = useState(false);
  const [dailyLoginsError, setDailyLoginsError] = useState<string | null>(null);

  // ดึงสถิติ login รายวัน (ส่งคุกกี้ + กัน request เก่าทับใหม่)
  const fetchDailyLogins = async (date?: string) => {
    const targetDate = date || selectedDate || dayStrTH();

    dailyLoginsControllerRef.current?.abort();
    const ac = new AbortController();
    dailyLoginsControllerRef.current = ac;

    setDailyLoginsLoading(true);
    setDailyLoginsError(null);

    try {
      const qs = new URLSearchParams({ date: targetDate });
      const res = await authedFetch(`/api/admin/daily-logins?${qs}`, {
        signal: ac.signal,
      });

      if (res.status === 401) {
        setDailyLoginsError("ยังไม่ได้เข้าสู่ระบบ");
        return;
      }
      if (res.status === 403) {
        setDailyLoginsError("ต้องเป็นผู้ดูแลระบบ");
        return;
      }
      if (!res.ok) {
        setDailyLoginsError("โหลดข้อมูลไม่สำเร็จ");
        return;
      }

      const json = await res.json();
      setDailyLogins(json.data);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setDailyLoginsError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        console.error(e);
      }
    } finally {
      setDailyLoginsLoading(false);
    }
  };

  // โหลดเมื่อเปิดแท็บหรือเปลี่ยนวันที่
  useEffect(() => {
    if (activeTab === "daily-logins") {
      fetchDailyLogins(selectedDate);
    }
    return () => dailyLoginsControllerRef.current?.abort();
  }, [activeTab, selectedDate]);

  // 3.3: เมื่อเปิดแท็บกิจกรรม ให้โหลดบูธ (และตามด้วย QR ของบูธเริ่มต้น)
  useEffect(() => {
    if (activeTab === "activities") {
      fetchBoothsMini().then(() =>
        fetchQrCodes(createForm.boothId || undefined)
      );
    }
  }, [activeTab]); // คง deps ไว้เท่านี้เพื่อไม่ให้ยิงซ้ำโดยไม่จำเป็น

  // 3.3: เมื่อเปลี่ยนบูธที่เลือก ให้รีเฟรชรายการ QR ของบูธนั้น
  useEffect(() => {
    if (activeTab === "activities" && createForm.boothId) {
      fetchQrCodes(createForm.boothId);
    }
  }, [activeTab, createForm.boothId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-xl">กำลังโหลดข้อมูล...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-xl text-red-600">เกิดข้อผิดพลาด: {error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            🔧 Admin Dashboard
          </h1>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-8 border-b">
            {[
              { id: "overview", label: "📊 ภาพรวม" },
              { id: "participants", label: "👥 ผู้เข้าร่วม" },
              { id: "booths", label: "🏪 บูธยอดนิยม" },
              { id: "users", label: "🏆 ผู้ใช้อันดับต้น" },
              { id: "departments", label: "🏫 สถิติคณะ" },
              { id: "daily-logins", label: "📊 สถิติการ Login รายวัน" },
              { id: "working-hours", label: "⏰ จัดการเวลาทำงาน" },
              { id: "transcript-issues", label: "📋 ปัญหาทรานสคริปต์" },
              { id: "activities", label: "🎟️ สิทธิ์กิจกรรม & QR" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-medium ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white border-b-2 border-blue-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
            {/* Create Booth Link */}
            <a
              href="/register-booth"
              className="px-4 py-2 rounded-t-lg font-medium bg-green-600 text-white hover:bg-green-700"
            >
              ➕ สร้างบูธ
            </a>
          </div>

          {/* Overview Tab */}
          {activeTab === "overview" && stats && (
            <div className="space-y-6">
              {/* Period Selector */}
              <div className="flex gap-2 mb-4">
                {[
                  { value: "7d", label: "7 วัน" },
                  { value: "30d", label: "30 วัน" },
                  { value: "90d", label: "90 วัน" },
                  { value: "all", label: "ทั้งหมด" },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-4 py-2 rounded ${
                      period === p.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700">
                    👥 ผู้ใช้ทั้งหมด
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.overview.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    ใหม่: {stats.overview.period.newUsers}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700">
                    🏪 บูธทั้งหมด
                  </h3>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.overview.totalBooths.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    ใหม่: {stats.overview.period.newBooths}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700">
                    🎯 การเข้าร่วม
                  </h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {stats.overview.totalParticipations.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    ใหม่: {stats.overview.period.newParticipations}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700">
                    ⭐ คะแนนรีวิว
                  </h3>
                  <p className="text-3xl font-bold text-yellow-600">
                    {stats.overview.totalRatings.toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700">
                    📋 ทรานสคริปต์
                  </h3>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.overview.totalTranscripts.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Daily Activity Chart */}
              {stats.dailyActivity.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    📈 กิจกรรมรายวัน
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left">วันที่</th>
                          <th className="px-4 py-2 text-left">ผู้ใช้ใหม่</th>
                          <th className="px-4 py-2 text-left">
                            การเข้าร่วมใหม่
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.dailyActivity.map((day, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-2">
                              {new Date(day.date).toLocaleDateString("th-TH")}
                            </td>
                            <td className="px-4 py-2">{day.newUsers}</td>
                            <td className="px-4 py-2">
                              {day.newParticipations}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Participants Tab */}
          {activeTab === "participants" && participants && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                👥 ข้อมูลผู้เข้าร่วมงาน
              </h2>
              <div className="mb-4">
                <p className="text-lg">
                  จำนวนผู้เข้าร่วมทั้งหมด:{" "}
                  <span className="font-bold text-blue-600">
                    {participants.total.toLocaleString()}
                  </span>{" "}
                  คน
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">วันที่</th>
                      <th className="px-4 py-2 text-left">จำนวนผู้เข้าร่วม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.data.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2">
                          {new Date(item.date).toLocaleDateString("th-TH")}
                        </td>
                        <td className="px-4 py-2">
                          {item.count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Booths Tab */}
          {activeTab === "booths" && stats && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                🏪 บูธยอดนิยม
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">ชื่อบูธ</th>
                      <th className="px-4 py-2 text-left">คณะ</th>
                      <th className="px-4 py-2 text-left">ผู้เข้าร่วม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topBooths.map((booth, index) => (
                      <tr key={booth.id} className="border-b">
                        <td className="px-4 py-2 font-medium">
                          {booth.booth_name}
                        </td>
                        <td className="px-4 py-2">{booth.dept_type}</td>
                        <td className="px-4 py-2">
                          {booth.participants.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Users Tab */}
          {activeTab === "users" && stats && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  🏆 ผู้ใช้อันดับต้น
                </h2>
                <button
                  onClick={handleExportUsers}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  📊 Export Excel
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">อันดับ</th>
                      <th className="px-4 py-2 text-left">ชื่อ</th>
                      <th className="px-4 py-2 text-left">คณะ</th>
                      <th className="px-4 py-2 text-left">คะแนน</th>
                      <th className="px-4 py-2 text-left">บูธที่เข้าร่วม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topUsers.map((user, index) => (
                      <tr key={user.id} className="border-b">
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-800 font-bold">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-medium">{user.name}</td>
                        <td className="px-4 py-2">{user.dept}</td>
                        <td className="px-4 py-2 font-bold text-blue-600">
                          {user.score.toLocaleString()}
                        </td>
                        <td className="px-4 py-2">
                          {user._count.joinedBooths}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Department Stats Tab */}
          {activeTab === "departments" && stats && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                🏫 สถิติตามคณะ
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.departmentStats.map((dept, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-700">
                      {dept.department}
                    </h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {dept.userCount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">ผู้ใช้</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Logins Tab */}
          {activeTab === "daily-logins" && (
            <div className="space-y-6">
              {/* Date Selector */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">
                    📊 สถิติการ Login รายวัน
                  </h2>
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium text-gray-700">
                      เลือกวันที่:
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => fetchDailyLogins()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      🔍 ค้นหา
                    </button>
                  </div>
                </div>
              </div>

              {dailyLogins ? (
                <>
                  {dailyLoginsLoading && (
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="text-center text-xl">
                        กำลังโหลดข้อมูลสถิติการ Login...
                      </div>
                    </div>
                  )}

                  {dailyLoginsError && (
                    <div className="bg-white p-6 rounded-lg shadow">
                      <div className="text-center text-red-600 text-xl">
                        เกิดข้อผิดพลาด: {dailyLoginsError}
                      </div>
                    </div>
                  )}

                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-gray-700">
                        🔢 การ Login ทั้งหมด
                      </h3>
                      <p className="text-3xl font-bold text-blue-600">
                        {dailyLogins.stats.totalLogins}
                      </p>
                      <p className="text-sm text-gray-500">ครั้ง</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-gray-700">
                        👥 ผู้ใช้ที่ Login
                      </h3>
                      <p className="text-3xl font-bold text-green-600">
                        {dailyLogins.stats.uniqueUsers}
                      </p>
                      <p className="text-sm text-gray-500">คน</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-gray-700">
                        👨‍💼 Admin Login
                      </h3>
                      <p className="text-3xl font-bold text-purple-600">
                        {dailyLogins.stats.adminLogins}
                      </p>
                      <p className="text-sm text-gray-500">ครั้ง</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold text-gray-700">
                        👤 User Login
                      </h3>
                      <p className="text-3xl font-bold text-orange-600">
                        {dailyLogins.stats.userLogins}
                      </p>
                      <p className="text-sm text-gray-500">ครั้ง</p>
                    </div>
                  </div>

                  {/* Unique Users List */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      👥 รายชื่อผู้ใช้ที่ Login วันนี้
                    </h3>
                    {dailyLogins.uniqueUsers.length === 0 ? (
                      <p className="text-gray-500">
                        ไม่มีผู้ใช้ Login ในวันที่เลือก
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-2 text-left">
                                รหัสนักศึกษา
                              </th>
                              <th className="px-4 py-2 text-left">ชื่อ</th>
                              <th className="px-4 py-2 text-left">บทบาท</th>
                              <th className="px-4 py-2 text-left">
                                จำนวนครั้ง
                              </th>
                              <th className="px-4 py-2 text-left">
                                Login ล่าสุด
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyLogins.uniqueUsers.map(
                              (user: any, index: number) => (
                                <tr key={user.id} className="border-b">
                                  <td className="px-4 py-2">
                                    {user.student_id || "-"}
                                  </td>
                                  <td className="px-4 py-2 font-medium">
                                    {user.name}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        user.role === "admin"
                                          ? "bg-purple-100 text-purple-800"
                                          : "bg-blue-100 text-blue-800"
                                      }`}
                                    >
                                      {user.role === "admin" ? "Admin" : "User"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    {user.loginCount}
                                  </td>
                                  <td className="px-4 py-2">
                                    {user.lastLoginDate
                                      ? new Date(
                                          user.lastLoginDate
                                        ).toLocaleString("th-TH")
                                      : "-"}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Login History */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">
                      📝 ประวัติการ Login ทั้งหมด
                    </h3>
                    {dailyLogins.loginHistory.length === 0 ? (
                      <p className="text-gray-500">
                        ไม่มีประวัติการ Login ในวันที่เลือก
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-2 text-left">เวลา</th>
                              <th className="px-4 py-2 text-left">
                                ชื่อผู้ใช้
                              </th>
                              <th className="px-4 py-2 text-left">
                                รหัสนักศึกษา
                              </th>
                              <th className="px-4 py-2 text-left">บทบาท</th>
                              <th className="px-4 py-2 text-left">
                                IP Address
                              </th>
                              <th className="px-4 py-2 text-left">
                                User Agent
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyLogins.loginHistory.map((login: any) => (
                              <tr key={login.id} className="border-b">
                                <td className="px-4 py-2">
                                  {new Date(login.loginDate).toLocaleString(
                                    "th-TH"
                                  )}
                                </td>
                                <td className="px-4 py-2 font-medium">
                                  {login.user.name}
                                </td>
                                <td className="px-4 py-2">
                                  {login.user.student_id || "-"}
                                </td>
                                <td className="px-4 py-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      login.user.role === "admin"
                                        ? "bg-purple-100 text-purple-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {login.user.role === "admin"
                                      ? "Admin"
                                      : "User"}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {login.ipAddress || "-"}
                                </td>
                                <td
                                  className="px-4 py-2 text-sm max-w-xs truncate"
                                  title={login.userAgent}
                                >
                                  {login.userAgent || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-xl">
                      กำลังโหลดข้อมูลสถิติการ Login...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activities & QR Tab */}
          {activeTab === "activities" && (
            <div className="space-y-6">
              {/* Create form */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  🎟️ ลงทะเบียนกิจกรรมของบูธ + สร้าง QR
                </h2>
                <form
                  onSubmit={handleCreateActivity}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เลือกบูธ
                    </label>
                    <select
                      value={createForm.boothId}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          boothId: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      {boothsMini.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.booth_name} ({b.booth_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อกิจกรรม
                    </label>
                    <input
                      type="text"
                      value={createForm.activityName}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          activityName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="เช่น Mini Game, Lucky Draw"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      คะแนนที่ใช้ (cost)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={createForm.cost}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          cost: parseInt(e.target.value || "0", 10),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      กฎการแลก (rule)
                    </label>
                    <select
                      value={createForm.rule}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          rule: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ONCE_PER_EVENT">ครั้งเดียวทั้งงาน</option>
                      <option value="ONCE_PER_DAY">วันละครั้ง</option>
                      <option value="UNLIMITED">ไม่จำกัด</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      จำกัดจำนวนใช้รวม (ไม่บังคับ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="ว่างไว้ = ไม่จำกัด"
                      value={createForm.maxUses}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          maxUses: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      วัน/เวลา หมดอายุ (ไม่บังคับ)
                    </label>
                    <input
                      type="datetime-local"
                      value={createForm.expiresAt}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          expiresAt: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="active"
                      type="checkbox"
                      checked={createForm.active}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          active: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="text-sm text-gray-700">
                      เปิดใช้งาน QR ทันที
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={creating}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-60"
                    >
                      {creating ? "กำลังสร้าง..." : "สร้างกิจกรรม + QR"}
                    </button>
                  </div>
                </form>

                {/* Result Preview */}
                {createResult && (
                  <div className="mt-6 p-4 border rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      ✅ สร้างสำเร็จ
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <img
                        src={createResult.qrDataUrl}
                        alt="QR"
                        className="w-48 h-48 border rounded"
                      />
                      <div className="space-y-2">
                        <div className="text-sm text-gray-700">
                          entitlementKey:{" "}
                          <span className="font-mono">
                            {createResult.entitlementKey}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 break-all">
                          QR String:{" "}
                          <span className="font-mono">
                            {createResult.qrString}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={createResult.qrDataUrl}
                            download={`QR_${createResult.entitlementKey}.png`}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            ⬇️ ดาวน์โหลด QR
                          </a>
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(
                                createResult.qrString
                              )
                            }
                            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
                          >
                            📋 คัดลอก QR String
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* List QR of selected booth */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    📄 รายการ QR ของบูธ
                  </h3>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-600">เลือกบูธ:</span>
                    <select
                      value={createForm.boothId}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          boothId: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {boothsMini.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.booth_name} ({b.booth_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left">กิจกรรม</th>
                        <th className="px-4 py-2 text-left">entitlement</th>
                        <th className="px-4 py-2 text-left">cost</th>
                        <th className="px-4 py-2 text-left">rule</th>
                        <th className="px-4 py-2 text-left">ใช้งาน/จำกัด</th>
                        <th className="px-4 py-2 text-left">สถานะ</th>
                        <th className="px-4 py-2 text-left">หมดอายุ</th>
                        <th className="px-4 py-2 text-left">QR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qrList.map((q) => (
                        <tr key={q.id} className="border-b">
                          <td className="px-4 py-2">{q.booth_name}</td>
                          <td className="px-4 py-2 font-mono text-xs">
                            {q.entitlementKey}
                          </td>
                          <td className="px-4 py-2">{q.cost}</td>
                          <td className="px-4 py-2">
                            {q.rule === "ONCE_PER_EVENT"
                              ? "ครั้งเดียวทั้งงาน"
                              : q.rule === "ONCE_PER_DAY"
                              ? "วันละครั้ง"
                              : "ไม่จำกัด"}
                          </td>
                          <td className="px-4 py-2">
                            {q.uses.toLocaleString()} / {q.maxUses ?? "—"}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                q.active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {q.active ? "ใช้งาน" : "ปิด"}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {q.expiresAt
                              ? new Date(q.expiresAt).toLocaleString("th-TH")
                              : "—"}
                          </td>
                          <td className="px-4 py-2">
                            {/* แสดง QR อย่างเร็ว: เรียก POST อีกครั้งเพื่อรับ dataUrl ก็ได้
                      หรือจะเปิด modal สร้างใหม่บน server เพื่อความสดใหม่ */}
                            <button
                              onClick={async () => {
                                // ขอภาพ QR สดๆ โดยยิง POST ซ้ำ (สร้าง token/ภาพใหม่ แต่ใช้ code เดิม)
                                const res = await fetch("/api/admin/qrcodes", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    boothId: q.boothId,
                                    activityName: q.entitlementKey
                                      .split(":")
                                      .slice(1)
                                      .join("-"),
                                    cost: q.cost,
                                    rule: q.rule,
                                    maxUses: q.maxUses ?? undefined,
                                    expiresAt: q.expiresAt ?? undefined,
                                    active: q.active,
                                  }),
                                });
                                const j = await res.json();
                                if (res.ok) {
                                  const a = document.createElement("a");
                                  a.href = j.data.qrDataUrl;
                                  a.download = `QR_${q.entitlementKey}.png`;
                                  a.click();
                                } else {
                                  alert(j.error || "สร้างภาพ QR ไม่สำเร็จ");
                                }
                              }}
                              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm"
                            >
                              ดาวน์โหลด QR
                            </button>
                          </td>
                        </tr>
                      ))}
                      {qrList.length === 0 && (
                        <tr>
                          <td className="px-4 py-6 text-gray-500" colSpan={8}>
                            ยังไม่มี QR ของบูธนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Create Booth Tab */}
          {activeTab === "create-booth" && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                ➕ สร้างบูธใหม่
              </h2>
              <form onSubmit={handleCreateBooth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อบูธ
                  </label>
                  <input
                    type="text"
                    value={newBooth.booth_name}
                    onChange={(e) =>
                      setNewBooth((prev) => ({
                        ...prev,
                        booth_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    รหัสบูธ
                  </label>
                  <input
                    type="text"
                    value={newBooth.booth_code}
                    onChange={(e) =>
                      setNewBooth((prev) => ({
                        ...prev,
                        booth_code: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ประเภทคณะ
                  </label>
                  <input
                    type="text"
                    value={newBooth.dept_type}
                    onChange={(e) =>
                      setNewBooth((prev) => ({
                        ...prev,
                        dept_type: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    คำอธิบาย
                  </label>
                  <textarea
                    value={newBooth.description}
                    onChange={(e) =>
                      setNewBooth((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อเจ้าของบูธ
                  </label>
                  {newBooth.owner_names.map((name, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => updateOwnerName(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`ชื่อเจ้าของคนที่ ${index + 1}`}
                        required
                      />
                      {newBooth.owner_names.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOwnerName(index)}
                          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOwnerName}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    เพิ่มเจ้าของ
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  สร้างบูธ
                </button>
              </form>
            </div>
          )}

          {/* Working Hours Tab */}
          {activeTab === "working-hours" && (
            <div className="space-y-6">
              {workingHours ? (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    ⏰ จัดการเวลาทำงานของเว็บไซต์
                  </h2>

                  {/* Current Status */}
                  <div className="mb-6 p-4 rounded-lg bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">
                      สถานะปัจจุบัน
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">เวลาเปิด</p>
                        <p className="text-2xl font-bold text-green-600">
                          {workingHours.startHour.toString().padStart(2, "0")}
                          :00
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">เวลาปิด</p>
                        <p className="text-2xl font-bold text-red-600">
                          {workingHours.endHour.toString().padStart(2, "0")}:00
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">สถานะ</p>
                        <p
                          className={`text-2xl font-bold ${
                            workingHours.isEnabled
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        >
                          {workingHours.isEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </p>
                      </div>
                    </div>

                    {workingHours.updatedUser && (
                      <div className="mt-4 text-sm text-gray-500">
                        อัพเดทล่าสุดโดย: {workingHours.updatedUser.name} (
                        {workingHours.updatedUser.username})
                        <br />
                        เมื่อ:{" "}
                        {new Date(workingHours.updatedAt).toLocaleString(
                          "th-TH"
                        )}
                      </div>
                    )}
                  </div>

                  {/* Update Form */}
                  <form
                    onSubmit={handleUpdateWorkingHours}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          เวลาเริ่มต้น (ชั่วโมง)
                        </label>
                        <select
                          value={workingHours.startHour}
                          onChange={(e) =>
                            setWorkingHours((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    startHour: parseInt(e.target.value),
                                  }
                                : null
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i.toString().padStart(2, "0")}:00
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          เวลาสิ้นสุด (ชั่วโมง)
                        </label>
                        <select
                          value={workingHours.endHour}
                          onChange={(e) =>
                            setWorkingHours((prev) =>
                              prev
                                ? { ...prev, endHour: parseInt(e.target.value) }
                                : null
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i.toString().padStart(2, "0")}:00
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isEnabled"
                        checked={workingHours.isEnabled}
                        onChange={(e) =>
                          setWorkingHours((prev) =>
                            prev
                              ? { ...prev, isEnabled: e.target.checked }
                              : null
                          )
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="isEnabled"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        เปิดใช้งานการจำกัดเวลาเข้าใช้งาน
                      </label>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-yellow-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            คำเตือน
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <ul className="list-disc list-inside space-y-1">
                              <li>
                                Admin สามารถเข้าใช้งานได้ตลอดเวลา
                                แม้อยู่นอกเวลาที่กำหนด
                              </li>
                              <li>
                                ผู้ใช้ทั่วไปจะถูก redirect ไปหน้า maintenance
                                เมื่ออยู่นอกเวลาที่กำหนด
                              </li>
                              <li>การเปลี่ยนแปลงจะมีผลทันทีหลังจากบันทึก</li>
                              <li>เวลาที่ใช้เป็นเวลาประเทศไทย (UTC+7)</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                      >
                        💾 บันทึกการเปลี่ยนแปลง
                      </button>

                      <button
                        type="button"
                        onClick={fetchWorkingHours}
                        className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium"
                      >
                        🔄 รีเฟรช
                      </button>
                    </div>
                  </form>

                  {/* Quick Actions */}
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      การตั้งค่าด่วน
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() =>
                          setWorkingHours((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  startHour: 6,
                                  endHour: 16,
                                  isEnabled: true,
                                }
                              : null
                          )
                        }
                        className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className="font-medium text-gray-900">
                          เวลาปกติ
                        </div>
                        <div className="text-sm text-gray-500">
                          06:00 - 16:00
                        </div>
                      </button>

                      <button
                        onClick={() =>
                          setWorkingHours((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  startHour: 8,
                                  endHour: 18,
                                  isEnabled: true,
                                }
                              : null
                          )
                        }
                        className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className="font-medium text-gray-900">
                          เวลาทำงาน
                        </div>
                        <div className="text-sm text-gray-500">
                          08:00 - 18:00
                        </div>
                      </button>

                      <button
                        onClick={() =>
                          setWorkingHours((prev) =>
                            prev ? { ...prev, isEnabled: false } : null
                          )
                        }
                        className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className="font-medium text-gray-900">
                          เปิดตลอด 24 ชั่วโมง
                        </div>
                        <div className="text-sm text-gray-500">
                          ปิดการจำกัดเวลา
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="text-center">
                    <div className="text-xl">กำลังโหลดข้อมูลเวลาทำงาน...</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transcript Issues Tab */}
          {activeTab === "transcript-issues" && (
            <div className="space-y-6">
              {/* Add New Issue Form */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  ➕ เพิ่มรายการปัญหาทรานสคริปต์
                </h2>
                <form
                  onSubmit={handleAddTranscriptIssue}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      รหัสนักศึกษา
                    </label>
                    <input
                      type="text"
                      value={newIssue.student_id}
                      onChange={(e) =>
                        setNewIssue((prev) => ({
                          ...prev,
                          student_id: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อ
                    </label>
                    <input
                      type="text"
                      value={newIssue.name}
                      onChange={(e) =>
                        setNewIssue((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ปีการศึกษา
                    </label>
                    <input
                      type="text"
                      value={newIssue.year}
                      onChange={(e) =>
                        setNewIssue((prev) => ({
                          ...prev,
                          year: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      คณะ
                    </label>
                    <input
                      type="text"
                      value={newIssue.dept}
                      onChange={(e) =>
                        setNewIssue((prev) => ({
                          ...prev,
                          dept: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                      เพิ่มรายการ
                    </button>
                  </div>
                </form>
              </div>

              {/* Issues List */}
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    📋 รายการปัญหาทรานสคริปต์
                  </h2>
                  <button
                    onClick={handleExportTranscriptIssues}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    📊 Export Excel
                  </button>
                </div>
                {transcriptIssues.length === 0 ? (
                  <p className="text-gray-500">ไม่มีรายการปัญหา</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left">รหัสนักศึกษา</th>
                          <th className="px-4 py-2 text-left">ชื่อ</th>
                          <th className="px-4 py-2 text-left">ปีการศึกษา</th>
                          <th className="px-4 py-2 text-left">คณะ</th>
                          <th className="px-4 py-2 text-left">วันที่เพิ่ม</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transcriptIssues.map((issue) => (
                          <tr key={issue.id} className="border-b">
                            <td className="px-4 py-2">{issue.student_id}</td>
                            <td className="px-4 py-2">{issue.name}</td>
                            <td className="px-4 py-2">{issue.year}</td>
                            <td className="px-4 py-2">{issue.dept}</td>
                            <td className="px-4 py-2">
                              {new Date(issue.createdAt).toLocaleDateString(
                                "th-TH"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
