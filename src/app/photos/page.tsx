import { redirect } from "next/navigation";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PhotosManager, type PhotoView } from "@/components/PhotosManager";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const session = await requireUserSession();
  if (!session) {
    redirect("/login");
  }

  const supabase = getSupabaseAdmin();
  const [settingsRes, photosRes, historyCountRes] = await Promise.all([
    supabase
      .from("app_settings")
      .select("project_name, leaderboard_visible, project_icon_url")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("evidence_photos")
      .select("id, issue_category, title, public_url, created_at")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("score_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId),
  ]);

  const photos: PhotoView[] = (photosRes.data ?? []).map((row) => ({
    id: row.id,
    issueCategory: row.issue_category ?? null,
    title: row.title,
    publicUrl: row.public_url,
    createdAt: row.created_at,
  }));

  return (
    <PhotosManager
      projectName={settingsRes.data?.project_name || "ระบบจดคะแนน"}
      projectIconUrl={settingsRes.data?.project_icon_url ?? null}
      leaderboardVisible={settingsRes.data?.leaderboard_visible !== false}
      user={session}
      initialPhotos={photos}
      historyCount={historyCountRes.count ?? 0}
    />
  );
}
