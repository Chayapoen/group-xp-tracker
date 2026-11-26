"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UsersTab, type AdminUserItem } from "@/components/admin/UsersTab";
import {
  CategoriesTab,
  type AdminCategoryItem,
} from "@/components/admin/CategoriesTab";
import {
  RealtimeMonitorTab,
  type LeaderboardRow,
  type MonitorCategoryRow,
} from "@/components/admin/RealtimeMonitorTab";
import {
  HistoryTab,
  type AdminHistoryRow,
} from "@/components/admin/HistoryTab";
import { PhotosTab, type AdminPhotoRow } from "@/components/admin/PhotosTab";
import { DatabaseTab } from "@/components/admin/DatabaseTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import {
  computeUnreadTabs,
  type AdminActivityTimestamps,
} from "@/lib/admin-notifications";

type TabId =
  | "monitor"
  | "history"
  | "users"
  | "categories"
  | "photos"
  | "database"
  | "settings";

const LAST_SEEN_STORAGE_KEY = "gxp_admin_last_seen_v1";

const EMPTY_TIMESTAMPS: AdminActivityTimestamps = {
  monitor: null,
  history: null,
  photos: null,
};

function readLastSeenFromStorage(): AdminActivityTimestamps {
  if (typeof window === "undefined") return { ...EMPTY_TIMESTAMPS };
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_STORAGE_KEY);
    if (!raw) return { ...EMPTY_TIMESTAMPS };
    const parsed = JSON.parse(raw) as Partial<AdminActivityTimestamps>;
    return {
      monitor: parsed.monitor ?? null,
      history: parsed.history ?? null,
      photos: parsed.photos ?? null,
    };
  } catch {
    return { ...EMPTY_TIMESTAMPS };
  }
}

function writeLastSeenToStorage(ts: AdminActivityTimestamps) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, JSON.stringify(ts));
  } catch {
    // ignore storage errors
  }
}

export function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("monitor");
  const [projectName, setProjectName] = useState("ระบบจดคะแนน");
  const [leaderboardVisible, setLeaderboardVisible] = useState(true);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [categories, setCategories] = useState<AdminCategoryItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [monitorCategories, setMonitorCategories] = useState<MonitorCategoryRow[]>([]);
  const [history, setHistory] = useState<AdminHistoryRow[]>([]);
  const [photos, setPhotos] = useState<AdminPhotoRow[]>([]);
  const [latestActivity, setLatestActivity] =
    useState<AdminActivityTimestamps>(EMPTY_TIMESTAMPS);
  const [lastSeen, setLastSeen] = useState<AdminActivityTimestamps>(EMPTY_TIMESTAMPS);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeTabRef = useRef<TabId>(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    setLastSeen(readLastSeenFromStorage());
  }, []);

  const markTabSeen = useCallback(
    (tab: TabId, latest: AdminActivityTimestamps) => {
      if (tab !== "monitor" && tab !== "history" && tab !== "photos") return;
      const latestTs = latest[tab];
      if (!latestTs) return;
      setLastSeen((prev) => {
        if (prev[tab] === latestTs) return prev;
        const next = { ...prev, [tab]: latestTs };
        writeLastSeenToStorage(next);
        return next;
      });
    },
    []
  );

  const loadAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoadError(null);
      try {
        const [overviewRes, usersRes, catsRes] = await Promise.all([
          fetch("/api/admin/overview"),
          fetch("/api/admin/users"),
          fetch("/api/admin/categories"),
        ]);

        if (
          overviewRes.status === 401 ||
          usersRes.status === 401 ||
          catsRes.status === 401
        ) {
          router.push("/admin/login");
          return;
        }

        if (!overviewRes.ok || !usersRes.ok || !catsRes.ok) {
          throw new Error(
            "ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการตั้งค่า Supabase"
          );
        }

        const [overviewData, usersData, catsData] = await Promise.all([
          overviewRes.json(),
          usersRes.json(),
          catsRes.json(),
        ]);

        const nextLatest: AdminActivityTimestamps = overviewData.latestActivity ?? {
          ...EMPTY_TIMESTAMPS,
        };

        setProjectName(overviewData.projectName || "ระบบจดคะแนน");
        setLeaderboardVisible(overviewData.leaderboardVisible !== false);
        setLeaderboard(overviewData.leaderboard ?? []);
        setMonitorCategories(overviewData.monitorCategories ?? []);
        setHistory(overviewData.history ?? []);
        setPhotos(overviewData.photos ?? []);
        setUsers(usersData.users ?? []);
        setCategories(catsData.categories ?? []);
        setLatestActivity(nextLatest);
        setLastUpdatedAt(
          new Date().toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );

        // Automatically mark currently viewed tab as seen
        markTabSeen(activeTabRef.current, nextLatest);
      } catch (err) {
        if (!silent) {
          setLoadError(
            err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [router, markTabSeen]
  );

  useEffect(() => {
    loadAll(false);
    const interval = setInterval(() => {
      loadAll(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [loadAll]);

  function handleSelectTab(tab: TabId) {
    setActiveTab(tab);
    markTabSeen(tab, latestActivity);
  }

  async function handleToggleLeaderboardVisible() {
    const next = !leaderboardVisible;
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderboardVisible: next }),
    });
    if (res.ok) {
      setLeaderboardVisible(next);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const unread = computeUnreadTabs(latestActivity, lastSeen, activeTab);

  const tabs: { id: TabId; label: string; hasUnread?: boolean }[] = [
    { id: "monitor", label: "Realtime Monitor", hasUnread: unread.monitor },
    { id: "history", label: "ประวัติการใช้งาน", hasUnread: unread.history },
    { id: "users", label: "ผู้ใช้ & กลุ่ม" },
    { id: "categories", label: "หมวดคะแนน & XP" },
    { id: "photos", label: "รูปหลักฐานทั้งหมด", hasUnread: unread.photos },
    { id: "database", label: "Database" },
    { id: "settings", label: "ตั้งค่าโปรเจกต์" },
  ];

  const groupOptions = users.map((u) => ({
    userId: u.id,
    groupName: u.group_name,
    username: u.username,
  }));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[#EAE1D7] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
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
        <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 pt-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`relative flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "border-[#C06C84] text-old-rose"
                  : "border-transparent text-[#555555] hover:text-[#111111]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.hasUnread ? (
                <span
                  className="pulse-dot inline-block h-2 w-2 rounded-full bg-[#EF4444]"
                  title="มีการอัปเดตใหม่ที่ยังไม่ได้เปิดดู"
                />
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">
        {loadError ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-4 py-3 text-xs font-medium text-[#B91C1C]">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => loadAll(false)}
              className="rounded-lg border border-[#F2B8B5] bg-white px-2.5 py-1 font-semibold hover:bg-[#FEE2E2]"
            >
              ลองใหม่
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-8 text-center text-sm text-[#555555]">
            กำลังโหลดข้อมูล...
          </div>
        ) : activeTab === "monitor" ? (
          <RealtimeMonitorTab
            leaderboard={leaderboard}
            monitorCategories={monitorCategories}
            leaderboardVisible={leaderboardVisible}
            onToggleLeaderboardVisible={handleToggleLeaderboardVisible}
            onRefresh={() => loadAll(false)}
            lastUpdatedAt={lastUpdatedAt}
          />
        ) : activeTab === "history" ? (
          <HistoryTab history={history} photos={photos} groups={groupOptions} />
        ) : activeTab === "users" ? (
          <UsersTab users={users} onRefresh={() => loadAll(false)} />
        ) : activeTab === "categories" ? (
          <CategoriesTab categories={categories} onRefresh={() => loadAll(false)} />
        ) : activeTab === "photos" ? (
          <PhotosTab photos={photos} />
        ) : activeTab === "database" ? (
          <DatabaseTab onMutated={() => loadAll(false)} />
        ) : (
          <SettingsTab
            projectName={projectName}
            leaderboardVisible={leaderboardVisible}
            onSaved={(s) => {
              setProjectName(s.projectName);
              setLeaderboardVisible(s.leaderboardVisible);
            }}
          />
        )}
      </main>
    </div>
  );
}
