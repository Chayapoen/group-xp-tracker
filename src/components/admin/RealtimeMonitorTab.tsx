"use client";

export interface LeaderboardRow {
  userId: string;
  username: string;
  groupName: string;
  isActive: boolean;
  totalXp: number;
  passedCount: number;
  totalItems: number;
  photoCount: number;
}

export interface MonitorCategoryRow {
  categoryId: string;
  title: string;
  isOpen: boolean;
  items: { id: string; title: string; xp: number }[];
  groups: {
    userId: string;
    username: string;
    groupName: string;
    isActive: boolean;
    earnedXp: number;
    maxXp: number;
    passedCount: number;
    totalCount: number;
    dots: {
      itemId: string;
      title: string;
      xp: number;
      passed: boolean;
    }[];
  }[];
}

interface RealtimeMonitorTabProps {
  leaderboard: LeaderboardRow[];
  monitorCategories: MonitorCategoryRow[];
  leaderboardVisible: boolean;
  onToggleLeaderboardVisible: () => Promise<void>;
  onRefresh: () => Promise<void>;
  lastUpdatedAt: string | null;
}

export function RealtimeMonitorTab({
  leaderboard,
  monitorCategories,
  leaderboardVisible,
  onToggleLeaderboardVisible,
  onRefresh,
  lastUpdatedAt,
}: RealtimeMonitorTabProps) {
  return (
    <div className="space-y-6">
      {/* Realtime Status & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DDD2] bg-white/95 px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="pulse-dot inline-block h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
          <span className="font-bold text-[#111111]">Realtime Monitor</span>
          <span className="text-[#555555]">
            (อัปเดตอัตโนมัติทุก 6 วิ{lastUpdatedAt ? ` • ล่าสุด ${lastUpdatedAt}` : ""})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleLeaderboardVisible}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              leaderboardVisible
                ? "border-[#86EFAC] bg-[#E8FCEF] text-[#15803D] hover:bg-[#D1FADF]"
                : "border-[#E5E7EB] bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
            }`}
          >
            {leaderboardVisible
              ? "อันดับคะแนน User: เปิดแสดง"
              : "อันดับคะแนน User: ซ่อนไว้"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#C06C84]"
          >
            รีเฟรชตอนนี้
          </button>
          <a
            href="/api/admin/export"
            className="bg-old-rose-soft border-old-rose-soft text-old-rose rounded-xl border px-3 py-1.5 text-xs font-semibold transition hover:bg-[#FAE6EC]"
          >
            ⬇ Export CSV
          </a>
        </div>
      </div>

      {/* Section 1: Team Ranking / Leaderboard */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[#111111]">ตารางอันดับคะแนนทุกกลุ่ม</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EFE8DF] bg-[#FAF6F0] text-[#555555]">
              <tr>
                <th className="px-4 py-2.5">อันดับ</th>
                <th className="px-4 py-2.5">ชื่อกลุ่ม</th>
                <th className="px-4 py-2.5">Username</th>
                <th className="px-4 py-2.5 text-right">ภารกิจที่ผ่าน</th>
                <th className="px-4 py-2.5 text-right">XP รวม</th>
                <th className="px-4 py-2.5 text-right">รูปหลักฐาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[#555555]">
                    ยังไม่มีข้อมูลกลุ่ม
                  </td>
                </tr>
              ) : (
                leaderboard.map((g, idx) => (
                  <tr key={g.userId}>
                    <td className="px-4 py-3 font-mono font-bold text-[#555555]">
                      #{idx + 1}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#111111]">{g.groupName}</td>
                    <td className="px-4 py-3 font-mono text-[#555555]">{g.username}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#111111]">
                      {g.passedCount}/{g.totalItems}
                    </td>
                    <td className="text-old-rose px-4 py-3 text-right font-mono font-extrabold">
                      {g.totalXp.toLocaleString()} XP
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#555555]">
                      {g.photoCount} รูป
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Category x Group Dot Matrix */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#111111]">
            ติดตามความคืบหน้าแยกตามหมวดคะแนน (จุดสีตามจำนวนหัวข้อย่อย)
          </h2>
          <div className="flex items-center gap-3 text-xs text-[#555555]">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[#22C55E]" />
              ผ่านแล้ว
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border border-[#D4CCC2] bg-[#F3EFE9]" />
              ยังไม่ผ่าน
            </span>
          </div>
        </div>

        {monitorCategories.length === 0 ? (
          <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-6 text-center text-sm text-[#555555]">
            ยังไม่มีหมวดคะแนนในระบบ
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {monitorCategories.map((cat) => (
              <div
                key={cat.categoryId}
                className="overflow-hidden rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs"
              >
                <div className="category-header-gradient flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE8DF] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#111111]">{cat.title}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        cat.isOpen
                          ? "bg-[#E8FCEF] text-[#15803D]"
                          : "bg-[#F3F4F6] text-[#6B7280]"
                      }`}
                    >
                      {cat.isOpen ? "เปิด" : "ปิด"}
                    </span>
                  </div>
                  <span className="text-old-rose font-mono text-xs font-semibold">
                    {cat.items.length} ข้อย่อย
                  </span>
                </div>

                {/* Legend of sub-items */}
                {cat.items.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 border-b border-[#F5F0EA] bg-[#FFFDFB] px-4 py-2 text-[11px] text-[#555555]">
                    {cat.items.map((it, idx) => (
                      <span
                        key={it.id}
                        className="rounded-md border border-[#EDE6DD] bg-white px-1.5 py-0.5"
                      >
                        <strong className="text-old-rose">{idx + 1}.</strong> {it.title} ({it.xp})
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Group Rows with Dots */}
                <div className="divide-y divide-[#F1ECE6]">
                  {cat.groups.length === 0 ? (
                    <div className="px-4 py-4 text-center text-xs text-[#555555]">
                      ยังไม่มีกลุ่มผู้ใช้
                    </div>
                  ) : (
                    cat.groups.map((grp) => (
                      <div
                        key={grp.userId}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-[#111111]">
                            {grp.groupName}
                          </div>
                          <div className="font-mono text-[11px] text-[#666666]">
                            {grp.username} • ผ่าน {grp.passedCount}/{grp.totalCount}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {grp.dots.map((dot, dotIdx) => (
                              <span
                                key={dot.itemId}
                                title={`ข้อที่ ${dotIdx + 1}: ${dot.title} (${dot.xp} XP) — ${
                                  dot.passed ? "ผ่านแล้ว" : "ยังไม่ผ่าน"
                                }`}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition ${
                                  dot.passed
                                    ? "bg-[#22C55E] text-white shadow-2xs"
                                    : "border border-[#D4CCC2] bg-[#F3EFE9] text-[#777777]"
                                }`}
                              >
                                {dotIdx + 1}
                              </span>
                            ))}
                          </div>
                          <span className="text-old-rose min-w-[60px] text-right font-mono text-xs font-bold">
                            {grp.earnedXp.toLocaleString()} XP
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
