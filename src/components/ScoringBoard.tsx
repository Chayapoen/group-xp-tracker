"use client";

import { useEffect, useRef, useState } from "react";
import { AppHeader, type SaveStatus } from "@/components/AppHeader";
import { NavTabs } from "@/components/NavTabs";
import { createItemToggleQueue } from "@/lib/toggle-queue";
import type { CategorySummary } from "@/lib/scoring";

interface ScoringBoardProps {
  initialProjectName: string;
  projectIconUrl?: string | null;
  leaderboardVisible: boolean;
  user: {
    userId: string;
    username: string;
    groupName: string;
  };
  initialCategories: CategorySummary[];
  initialCounts: {
    photos: number;
    history: number;
  };
}

export function ScoringBoard({
  initialProjectName,
  projectIconUrl,
  leaderboardVisible,
  user,
  initialCategories,
  initialCounts,
}: ScoringBoardProps) {
  const [categories, setCategories] = useState<CategorySummary[]>(initialCategories);
  const [historyCount, setHistoryCount] = useState(initialCounts.history);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queueRef = useRef<ReturnType<typeof createItemToggleQueue> | null>(null);
  if (!queueRef.current) {
    queueRef.current = createItemToggleQueue();
  }
  const latestSeqByItemRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const queue = queueRef.current;
    if (!queue) return;
    return queue.subscribe((status) => setSaveStatus(status));
  }, []);

  let totalXp = 0;
  let maxTotalXp = 0;
  for (const cat of categories) {
    totalXp += cat.earnedXp;
    maxTotalXp += cat.maxXp;
  }
  const pct = maxTotalXp > 0 ? Math.round((totalXp / maxTotalXp) * 100) : 0;

  function applyToggleState(catId: string, itemId: string, nextPassed: boolean) {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const nextItems = cat.items.map((it) =>
          it.id === itemId ? { ...it, passed: nextPassed } : it
        );
        let earnedXp = 0;
        for (const it of nextItems) {
          if (it.passed) earnedXp += it.xp;
        }
        return { ...cat, items: nextItems, earnedXp };
      })
    );
  }

  function handleToggle(
    catId: string,
    itemId: string,
    currentPassed: boolean,
    isOpen: boolean
  ) {
    if (!isOpen) return;
    const nextPassed = !currentPassed;
    const seq = (latestSeqByItemRef.current.get(itemId) ?? 0) + 1;
    latestSeqByItemRef.current.set(itemId, seq);

    setErrorMessage(null);
    applyToggleState(catId, itemId, nextPassed);

    queueRef.current
      ?.enqueue(itemId, async () => {
        const res = await fetch("/api/scores/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, passed: nextPassed }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "บันทึกคะแนนไม่สำเร็จ");
        }

        setHistoryCount((c) => c + 1);
      })
      .catch((err) => {
        // Only roll back if no newer toggle superseded this request
        if (latestSeqByItemRef.current.get(itemId) === seq) {
          applyToggleState(catId, itemId, currentPassed);
        }
        setErrorMessage(
          err instanceof Error ? err.message : "บันทึกคะแนนไม่สำเร็จ กรุณาลองใหม่"
        );
      });
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        projectName={initialProjectName}
        projectIconUrl={projectIconUrl}
        saveStatus={saveStatus}
        username={user.username}
        groupName={user.groupName}
      />
      <NavTabs
        active="scoring"
        photosCount={initialCounts.photos}
        historyCount={historyCount}
        leaderboardVisible={leaderboardVisible}
      />

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5 sm:px-6">
        {errorMessage ? (
          <div className="rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-4 py-2.5 text-xs font-medium text-[#B91C1C]">
            {errorMessage}
          </div>
        ) : null}

        {/* Group Head Banner */}
        <section className="banner-gradient rounded-2xl border border-[#E6DACB] p-4 shadow-xs sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-old-rose text-xs font-semibold">กลุ่มที่รับผิดชอบ</div>
              <h1 className="mt-0.5 text-xl font-extrabold text-[#111111] sm:text-2xl">
                {user.groupName}
              </h1>
            </div>
            <div className="border-old-rose-soft rounded-xl border bg-white/85 px-4 py-2.5 text-right shadow-2xs">
              <div className="text-xs text-[#555555]">คะแนนรวมปัจจุบัน</div>
              <div className="text-old-rose font-mono text-2xl font-extrabold">
                {totalXp.toLocaleString()} <span className="text-sm font-bold">XP</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="font-medium text-[#333333]">ความคืบหน้ารวม</span>
              <span className="text-old-rose font-mono font-semibold">
                {totalXp.toLocaleString()} / {maxTotalXp.toLocaleString()} XP ({pct}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full border border-[#E6DACB] bg-white/85">
              <div
                className="progress-gradient h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Category Score Boxes */}
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-8 text-center text-sm text-[#555555]">
            ยังไม่มีหมวดคะแนนในระบบ กรุณาให้ผู้ดูแลระบบเพิ่มหมวดคะแนนจากหน้า Admin
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-white/95 shadow-xs ${
                  cat.isOpen ? "border-[#E6DDD2]" : "border-[#E5E7EB] opacity-80"
                }`}
              >
                <div className="category-header-gradient flex items-start justify-between gap-3 border-b border-[#EFE8DF] px-4 py-3.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-[#111111]">{cat.title}</h2>
                      {!cat.isOpen ? (
                        <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#6B7280]">
                          ปิดการจดคะแนน
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-[#555555]">
                      สูงสุด {cat.maxXp.toLocaleString()} XP
                    </div>
                  </div>
                  <div className="bg-old-rose-soft border-old-rose-soft text-old-rose shrink-0 rounded-lg border px-2.5 py-1 font-mono text-sm font-extrabold">
                    {cat.earnedXp.toLocaleString()} XP
                  </div>
                </div>

                <div className="divide-y divide-[#F1ECE6]">
                  {cat.items.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[#666666]">
                      ยังไม่มีหัวข้อย่อยในหมวดนี้
                    </div>
                  ) : (
                    cat.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#111111]">
                            {item.title}
                          </div>
                          <div className="text-old-rose mt-0.5 font-mono text-xs font-semibold">
                            +{item.xp.toLocaleString()} XP
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!cat.isOpen}
                          onClick={() =>
                            handleToggle(cat.id, item.id, item.passed, cat.isOpen)
                          }
                          className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            item.passed
                              ? "border-[#86EFAC] bg-[#E8FCEF] text-[#15803D]"
                              : "border-[#DDD4C9] bg-[#FAF8F5] text-[#444444] hover:border-[#C06C84] hover:text-[#B45A73]"
                          }`}
                        >
                          {item.passed ? "✓ ผ่าน" : "ยังไม่ผ่าน"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
