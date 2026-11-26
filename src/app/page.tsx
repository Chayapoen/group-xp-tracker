import { redirect } from "next/navigation";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { calculateCategorySummaries } from "@/lib/scoring";
import { ScoringBoard } from "@/components/ScoringBoard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireUserSession();
  if (!session) {
    redirect("/login");
  }

  const supabase = getSupabaseAdmin();
  const [settingsRes, categoriesRes, itemsRes, scoresRes, photosCountRes, historyCountRes] =
    await Promise.all([
      supabase.from("app_settings").select("project_name").eq("id", 1).maybeSingle(),
      supabase.from("score_categories").select("id, title, sort_order, created_at").order("sort_order"),
      supabase.from("score_items").select("id, category_id, title, xp, sort_order").order("sort_order"),
      supabase.from("user_scores").select("item_id, passed").eq("user_id", session.userId),
      supabase
        .from("evidence_photos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.userId),
      supabase
        .from("score_history")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.userId),
    ]);

  const categories = calculateCategorySummaries(
    categoriesRes.data ?? [],
    itemsRes.data ?? [],
    scoresRes.data ?? []
  );

  return (
    <ScoringBoard
      initialProjectName={settingsRes.data?.project_name || "ระบบจดคะแนน"}
      user={session}
      initialCategories={categories}
      initialCounts={{
        photos: photosCountRes.count ?? 0,
        history: historyCountRes.count ?? 0,
      }}
    />
  );
}
