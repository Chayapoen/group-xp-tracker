"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { NavTabs } from "@/components/NavTabs";

export interface RankingRow {
  userId: string;
  groupName: string;
  totalXp: number;
  maxTotalXp: number;
  passedCount: number;
  totalItems: number;
  isCurrentUser: boolean;
}

interface LeaderboardViewProps {
  projectName: string;
  projectIconUrl?: string | null;
  user: {
    userId: string;
    username: string;
    groupName: string;
  };
  leaderboardVisible: boolean;
  initialRankings: RankingRow[];
  counts: {
    photos: number;
    history: number;
  };
}

export function LeaderboardView({
  projectName,
  projectIconUrl,
  user,
  leaderboardVisible: initialVisible,
  initialRankings,
  counts,
}: LeaderboardViewProps) {
  const [visible, setVisible] = useState(initialVisible);
  const [rankings, setRankings] = useState<RankingRow[]>(initialRankings);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/leaderboard");
      if (res.status === 403) {
        setVisible(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setVisible(data.leaderboardVisible !== false);
        setRankings(data.rankings ?? []);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [visible, refresh]);

  return (
    <div className="min-h-screen">
      <AppHeader
        projectName={projectName}
        projectIconUrl={projectIconUrl}
        saveStatus="saved"
        username={user.username}
        groupName={user.groupName}
      />
      <NavTabs
        active="leaderboard"
        photosCount={counts.photos}
        historyCount={counts.history}
        leaderboardVisible={visible}
      />

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-[#111111]">อันดับคะแนนทุกทีม</h1>
            <p className="text-xs text-[#555555]">
              อัปเดตอัตโนมัติทุก 10 วินาที เพื่อติดตามความคืบหน้าของแต่ละกลุ่ม
            </p>
          </div>
          {visible ? (
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="bg-old-rose-soft border-old-rose-soft text-old-rose rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-[#FAE6EC] disabled:opacity-60"
            >
              {refreshing ? "กำลังอัปเดต..." : "รีเฟรชอันดับ"}
            </button>
          ) : null}
        </div>

        {!visible ? (
          <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-8 text-center space-y-1.5 shadow-xs">
            <div className="text-sm font-bold text-[#111111]">
              ผู้ดูแลระบบปิดการแสดงหน้าอันดับคะแนนชั่วคราว
            </div>
            <p className="text-xs text-[#555555]">
              คุณยังสามารถจดคะแนนและอัปโหลดรูปหลักฐานของกลุ่มตัวเองได้ตามปกติ
            </p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-8 text-center text-sm text-[#555555]">
            ยังไม่มีข้อมูลทีมในระบบ
          </div>
        ) : (
          <div className="space-y-2.5">
            {rankings.map((row, idx) => {
              const pct =
                row.maxTotalXp > 0
                  ? Math.round((row.totalXp / row.maxTotalXp) * 100)
                  : 0;
              const rank = idx + 1;
              return (
                <div
                  key={row.userId}
                  className={`rounded-2xl border p-4 shadow-xs transition ${
                    row.isCurrentUser
                      ? "banner-gradient border-[#C06C84]"
                      : "border-[#E6DDD2] bg-white/95"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-extrabold ${
                          rank === 1
                            ? "brand-gradient text-white"
                            : rank <= 3
                            ? "bg-old-rose-soft border border-old-rose-soft text-old-rose"
                            : "bg-[#F5F1EB] text-[#555555]"
                        }`}
                      >
                        #{rank}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-bold text-[#111111]">
                            {row.groupName}
                          </span>
                          {row.isCurrentUser ? (
                            <span className="bg-old-rose-soft border-old-rose-soft text-old-rose rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                              กลุ่มของคุณ
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-xs text-[#555555]">
                          สำเร็จแล้ว {row.passedCount}/{row.totalItems} ภารกิจ ({pct}%)
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-old-rose font-mono text-lg font-extrabold">
                        {row.totalXp.toLocaleString()} XP
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-[#E6DACB] bg-white/80">
                    <div
                      className="progress-gradient h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
