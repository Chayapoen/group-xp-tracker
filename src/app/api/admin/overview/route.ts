import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { calculateCategorySummaries, calculateTotalXp } from "@/lib/scoring";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const [settingsRes, usersRes, catsRes, itemsRes, scoresRes, historyRes, photosRes] =
      await Promise.all([
        supabase.from("app_settings").select("project_name").eq("id", 1).maybeSingle(),
        supabase
          .from("temp_users")
          .select("id, username, group_name, is_active, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("score_categories")
          .select("id, title, sort_order, created_at")
          .order("sort_order"),
        supabase
          .from("score_items")
          .select("id, category_id, title, xp, sort_order")
          .order("sort_order"),
        supabase.from("user_scores").select("user_id, item_id, passed"),
        supabase
          .from("score_history")
          .select("id, user_id, category_title, item_title, xp, passed, changed_by, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("evidence_photos")
          .select("id, user_id, category_id, title, public_url, created_at, score_categories(title)")
          .order("created_at", { ascending: false }),
      ]);

    if (
      usersRes.error ||
      catsRes.error ||
      itemsRes.error ||
      scoresRes.error ||
      historyRes.error ||
      photosRes.error
    ) {
      return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลสรุปได้" }, { status: 500 });
    }

    const users = usersRes.data ?? [];
    const categories = catsRes.data ?? [];
    const items = itemsRes.data ?? [];
    const scores = scoresRes.data ?? [];
    const photos = photosRes.data ?? [];

    const scoresByUser = new Map<string, { item_id: string; passed: boolean }[]>();
    for (const s of scores) {
      const list = scoresByUser.get(s.user_id);
      if (list) list.push(s);
      else scoresByUser.set(s.user_id, [s]);
    }

    const photoCountByUser = new Map<string, number>();
    for (const p of photos) {
      photoCountByUser.set(p.user_id, (photoCountByUser.get(p.user_id) ?? 0) + 1);
    }

    const userMap = new Map(users.map((u) => [u.id, u]));

    const leaderboard = users
      .map((u) => {
        const summaries = calculateCategorySummaries(
          categories,
          items,
          scoresByUser.get(u.id) ?? []
        );
        return {
          userId: u.id,
          username: u.username,
          groupName: u.group_name,
          isActive: u.is_active,
          totalXp: calculateTotalXp(summaries),
          categoryBreakdown: summaries.map((s) => ({
            categoryId: s.id,
            title: s.title,
            earnedXp: s.earnedXp,
            maxXp: s.maxXp,
          })),
          photoCount: photoCountByUser.get(u.id) ?? 0,
        };
      })
      .sort((a, b) => b.totalXp - a.totalXp);

    const historyWithGroup = (historyRes.data ?? []).map((h) => ({
      ...h,
      group_name: userMap.get(h.user_id)?.group_name ?? "ไม่ทราบกลุ่ม",
    }));

    const photosWithGroup = photos.map((p) => {
      const catObj = Array.isArray(p.score_categories)
        ? p.score_categories[0]
        : p.score_categories;
      return {
        id: p.id,
        userId: p.user_id,
        groupName: userMap.get(p.user_id)?.group_name ?? "ไม่ทราบกลุ่ม",
        username: userMap.get(p.user_id)?.username ?? "",
        categoryTitle: (catObj as { title?: string } | null)?.title ?? null,
        title: p.title,
        publicUrl: p.public_url,
        createdAt: p.created_at,
      };
    });

    return NextResponse.json({
      projectName: settingsRes.data?.project_name || "ระบบจดคะแนน",
      leaderboard,
      history: historyWithGroup,
      photos: photosWithGroup,
    });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลสรุปได้" }, { status: 500 });
  }
}
