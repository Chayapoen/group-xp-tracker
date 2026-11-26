"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UsersTab, type AdminUserItem } from "@/components/admin/UsersTab";
import {
  CategoriesTab,
  type AdminCategoryItem,
} from "@/components/admin/CategoriesTab";
import {
  OverviewTab,
  type AdminHistoryRow,
  type LeaderboardRow,
} from "@/components/admin/OverviewTab";
import { PhotosTab, type AdminPhotoRow } from "@/components/admin/PhotosTab";
import { SettingsTab } from "@/components/admin/SettingsTab";

type TabId = "overview" | "users" | "categories" | "photos" | "settings";

export function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [projectName, setProjectName] = useState("ระบบจดคะแนน");
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [history, setHistory] = useState<AdminHistoryRow[]>([]);
  const [photos, setPhotos] = useState<AdminPhotoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [overviewRes, usersRes, catsRes] = await Promise.all([
      fetch("/api/admin/overview"),
      fetch("/api/admin/users"),
      fetch("/api/admin/categories"),
    ]);

    if (overviewRes.status === 401 || usersRes.status === 401) {
      router.push("/admin/login");
      return;
    }

    const [overviewData, usersData, catsData] = await Promise.all([
      overviewRes.json(),
      usersRes.json(),
      catsRes.json(),
    ]);

    setProjectName(overviewData.projectName || "ระบบจดคะแนน");
    setLeaderboard(overviewData.leaderboard ?? []);
    setHistory(overviewData.history ?? []);
    setPhotos(overviewData.photos ?? []);
    setUsers(usersData.users ?? []);
    setCategories(catsData.categories ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "สรุปผล & ประวัติ" },
    { id: "users", label: "ผู้ใช้ & กลุ่ม" },
    { id: "categories", label: "หมวดคะแนน & XP" },
    { id: "photos", label: "รูปหลักฐานทั้งหมด" },
    { id: "settings", label: "ตั้งค่าโปรเจกต์" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[#EAE1D7] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="brand-gradient rounded-lg px-2 py-1 text-xs font-bold text-white">
              ADMIN
            </span>
            <span className="text-sm font-bold text-[#111111]">{projectName}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-[#F2C6C6] bg-[#FFF5F5] px-3 py-1.5 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2]"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <nav className="border-b border-[#EAE1D7] bg-white/80">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-1 px-4 pt-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#C06C84] text-old-rose"
                  : "border-transparent text-[#555555] hover:text-[#111111]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        {loading ? (
          <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-8 text-center text-sm text-[#555555]">
            กำลังโหลดข้อมูล...
          </div>
        ) : activeTab === "overview" ? (
          <OverviewTab leaderboard={leaderboard} history={history} />
        ) : activeTab === "users" ? (
          <UsersTab users={users} onRefresh={loadAll} />
        ) : activeTab === "categories" ? (
          <CategoriesTab categories={categories} onRefresh={loadAll} />
        ) : activeTab === "photos" ? (
          <PhotosTab photos={photos} />
        ) : (
          <SettingsTab projectName={projectName} onSaved={setProjectName} />
        )}
      </main>
    </div>
  );
}
