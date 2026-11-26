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
  const [settingsRes, categoriesRes, photosRes, historyCountRes] = await Promise.all([
    supabase.from("app_settings").select("project_name").eq("id", 1).maybeSingle(),
    supabase.from("score_categories").select("id, title").order("sort_order"),
    supabase
      .from("evidence_photos")
      .select("id, category_id, title, public_url, created_at, score_categories(title)")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("score_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId),
  ]);

  const photos: PhotoView[] = (photosRes.data ?? []).map((row) => {
    const catObj = Array.isArray(row.score_categories)
      ? row.score_categories[0]
      : row.score_categories;
    return {
      id: row.id,
      categoryId: row.category_id,
      categoryTitle: (catObj as { title?: string } | null)?.title ?? null,
      title: row.title,
      publicUrl: row.public_url,
      createdAt: row.created_at,
    };
  });

  return (
    <PhotosManager
      projectName={settingsRes.data?.project_name || "ระบบจดคะแนน"}
      user={session}
      categories={categoriesRes.data ?? []}
      initialPhotos={photos}
      historyCount={historyCountRes.count ?? 0}
    />
  );
}
