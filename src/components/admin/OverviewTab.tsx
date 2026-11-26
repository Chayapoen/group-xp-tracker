"use client";

export interface LeaderboardRow {
  userId: string;
  username: string;
  groupName: string;
  isActive: boolean;
  totalXp: number;
  photoCount: number;
  categoryBreakdown: {
    categoryId: string;
    title: string;
    earnedXp: number;
    maxXp: number;
  }[];
}

export interface AdminHistoryRow {
  id: string;
  group_name: string;
  category_title: string;
  item_title: string;
  xp: number;
  passed: boolean;
  changed_by: string;
  created_at: string;
}

interface OverviewTabProps {
  leaderboard: LeaderboardRow[];
  history: AdminHistoryRow[];
}

export function OverviewTab({ leaderboard, history }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#111111]">ตารางคะแนนรวมทุกกลุ่ม</h2>
          <a
            href="/api/admin/export"
            className="bg-old-rose-soft border-old-rose-soft text-old-rose rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition hover:bg-[#FAE6EC]"
          >
            ⬇ Export CSV
          </a>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EFE8DF] bg-[#FAF6F0] text-[#555555]">
              <tr>
                <th className="px-4 py-2.5">อันดับ</th>
                <th className="px-4 py-2.5">ชื่อกลุ่ม</th>
                <th className="px-4 py-2.5">Username</th>
                <th className="px-4 py-2.5 text-right">XP รวม</th>
                <th className="px-4 py-2.5 text-right">รูปหลักฐาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#555555]">
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
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#111111]">
          ประวัติการอัปเดตคะแนนล่าสุดทั้งหมด ({history.length})
        </h2>
        <div className="divide-y divide-[#EFE8DF] overflow-hidden rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs">
          {history.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#555555]">
              ยังไม่มีประวัติการให้คะแนน
            </div>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-old-rose font-bold">{h.group_name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-semibold ${
                        h.passed
                          ? "bg-[#E8FCEF] text-[#15803D]"
                          : "bg-[#FEF2F2] text-[#B91C1C]"
                      }`}
                    >
                      {h.passed ? "ผ่าน" : "ยกเลิกผ่าน"}
                    </span>
                    <span className="font-semibold text-[#111111]">{h.item_title}</span>
                  </div>
                  <div className="mt-0.5 text-[#555555]">
                    {h.category_title} • โดย {h.changed_by}
                  </div>
                </div>
                <div className="shrink-0 text-right font-mono">
                  <div className="text-old-rose font-bold">
                    {h.passed ? "+" : "-"}
                    {h.xp} XP
                  </div>
                  <div className="text-[#666666]">
                    {new Date(h.created_at).toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
