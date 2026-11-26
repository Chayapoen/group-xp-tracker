import { redirect } from "next/navigation";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  calculateCategorySummaries,
  calculateMaxTotalXp,
  calculateTotalXp,
} from "@/lib/scoring";
import { LeaderboardView, type RankingRow } from "@/components/LeaderboardView";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await requireUserSession();
  if (!session) {
    redirect("/login");
  }

  const supabase = getSupabaseAdmin();
  const [settingsRes, photosCountRes, historyCountRes] = await Promise.all([
    supabase
      .from("app_settings")
      .select("project_name, leaderboard_visible")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("evidence_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId),
    supabase
      .from("score_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId),
  ]);

  const projectName = settingsRes.data?.project_name || "ระบบจดคะแนน";
  const leaderboardVisible = settingsRes.data?.leaderboard_visible !== false;

  let rankings: RankingRow[] = [];

  if (leaderboardVisible) {
    const [usersRes, catsRes, itemsRes, scoresRes] = await Promise.all([
      supabase
        .from("temp_users")
        .select("id, username, group_name, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("score_categories")
        .select("id, title, sort_order, is_open, created_at")
        .order("sort_order"),
      supabase
        .from("score_items")
        .select("id, category_id, title, xp, sort_order")
        .order("sort_order"),
      supabase.from("user_scores").select("user_id, item_id, passed"),
    ]);

    const scoresByUser = new Map<string, { item_id: string; passed: boolean }[]>();
    for (const s of scoresRes.data ?? []) {
      const arr = scoresByUser.get(s.user_id);
      if (arr) arr.push(s);
      else scoresByUser.set(s.user_id, [s]);
    }

    const categories = catsRes.data ?? [];
    const items = itemsRes.data ?? [];

    rankings = (usersRes.data ?? [])
      .map((u) => {
        const summaries = calculateCategorySummaries(
          categories,
          items,
          scoresByUser.get(u.id) ?? []
        );
        let passedCount = 0;
        let totalItems = 0;
        for (const s of summaries) {
          totalItems += s.items.length;
          for (const it of s.items) {
            if (it.passed) passedCount += 1;
          }
        }
        return {
          userId: u.id,
          groupName: u.group_name,
          totalXp: calculateTotalXp(summaries),
          maxTotalXp: calculateMaxTotalXp(summaries),
          passedCount,
          totalItems,
          isCurrentUser: u.id === session.userId,
        };
      })
      .sort((a, b) => b.totalXp - a.totalXp || b.passedCount - a.passedCount);
  }

  return (
    <LeaderboardView
      projectName={projectName}
      user={session}
      leaderboardVisible={leaderboardVisible}
      initialRankings={rankings}
      counts={{
        photos: photosCountRes.count ?? 0,
        history: historyCountRes.count ?? 0,
      }}
    />
  );
}
