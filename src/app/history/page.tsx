import { redirect } from "next/navigation";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AppHeader } from "@/components/AppHeader";
import { NavTabs } from "@/components/NavTabs";

export const dynamic = "force-dynamic";

function formatThaiDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export default async function HistoryPage() {
  const session = await requireUserSession();
  if (!session) {
    redirect("/login");
  }

  const supabase = getSupabaseAdmin();
  const [settingsRes, historyRes, photosCountRes] = await Promise.all([
    supabase
      .from("app_settings")
      .select("project_name, leaderboard_visible")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("score_history")
      .select("id, category_title, item_title, xp, passed, changed_by, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("evidence_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId),
  ]);

  const history = historyRes.data ?? [];

  return (
    <div className="min-h-screen">
      <AppHeader
        projectName={settingsRes.data?.project_name || "ระบบจดคะแนน"}
        saveStatus="saved"
        username={session.username}
        groupName={session.groupName}
      />
      <NavTabs
        active="history"
        photosCount={photosCountRes.count ?? 0}
        historyCount={history.length}
        leaderboardVisible={settingsRes.data?.leaderboard_visible !== false}
      />

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-[#111111]">ประวัติการให้คะแนน</h1>
            <p className="text-xs text-[#555555]">
              บันทึกทุกการอัปเดตอัตโนมัติของ{" "}
              <span className="text-old-rose font-semibold">{session.groupName}</span>
            </p>
          </div>
          <span className="bg-old-rose-soft border-old-rose-soft text-old-rose rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold">
            {history.length} รายการ
          </span>
        </div>

        {history.length === 0 ? (
          <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-8 text-center text-sm text-[#555555]">
            ยังไม่มีประวัติการให้คะแนน
          </div>
        ) : (
          <div className="divide-y divide-[#EFE8DF] overflow-hidden rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
                        h.passed
                          ? "bg-[#E8FCEF] text-[#15803D]"
                          : "bg-[#FEF2F2] text-[#B91C1C]"
                      }`}
                    >
                      {h.passed ? "ผ่าน" : "ยกเลิกผ่าน"}
                    </span>
                    <span className="truncate text-sm font-semibold text-[#111111]">
                      {h.item_title}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#555555]">{h.category_title}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div
                    className={`font-mono text-sm font-bold ${
                      h.passed ? "text-old-rose" : "text-[#777777]"
                    }`}
                  >
                    {h.passed ? "+" : "-"}
                    {h.xp.toLocaleString()} XP
                  </div>
                  <div className="font-mono text-xs text-[#666666]">
                    {formatThaiDateTime(h.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
