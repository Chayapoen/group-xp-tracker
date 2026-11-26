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
        supabase
          .from("app_settings")
          .select("project_name, leaderboard_visible, project_icon_url")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("temp_users")
          .select("id, username, group_name, is_active, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("score_categories")
          .select("id, title, sort_order, is_open, created_at")
          .order("sort_order"),
        supabase
          .from("score_items")
          .select("id, category_id, title, xp, sort_order")
          .order("sort_order"),
        supabase.from("user_scores").select("user_id, item_id, passed, updated_at"),
        supabase
          .from("score_history")
          .select("id, user_id, category_title, item_title, xp, passed, changed_by, created_at")
          .order("created_at", { ascending: false })
          .limit(400),
        supabase
          .from("evidence_photos")
          .select("id, user_id, issue_category, title, public_url, created_at")
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
    const historyRows = historyRes.data ?? [];
    const photos = photosRes.data ?? [];

    const scoresByUser = new Map<string, { item_id: string; passed: boolean }[]>();
    let latestScoreAt: string | null = null;
    for (const s of scores) {
      const list = scoresByUser.get(s.user_id);
      if (list) list.push(s);
      else scoresByUser.set(s.user_id, [s]);
      if (s.updated_at && (!latestScoreAt || s.updated_at > latestScoreAt)) {
        latestScoreAt = s.updated_at;
      }
    }

    const photoCountByUser = new Map<string, number>();
    for (const p of photos) {
      photoCountByUser.set(p.user_id, (photoCountByUser.get(p.user_id) ?? 0) + 1);
    }

    const userMap = new Map(users.map((u) => [u.id, u]));

    const summariesByUser = new Map(
      users.map((u) => [
        u.id,
        calculateCategorySummaries(categories, items, scoresByUser.get(u.id) ?? []),
      ])
    );

    const leaderboard = users
      .map((u) => {
        const summaries = summariesByUser.get(u.id) ?? [];
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
          username: u.username,
          groupName: u.group_name,
          isActive: u.is_active,
          totalXp: calculateTotalXp(summaries),
          passedCount,
          totalItems,
          photoCount: photoCountByUser.get(u.id) ?? 0,
        };
      })
      .sort((a, b) => b.totalXp - a.totalXp || b.passedCount - a.passedCount);

    // Realtime Monitor: grouped by Score Category -> per-group dot matrix
    const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const itemsByCategory = new Map<string, typeof items>();
    for (const it of items) {
      const bucket = itemsByCategory.get(it.category_id);
      if (bucket) bucket.push(it);
      else itemsByCategory.set(it.category_id, [it]);
    }

    const monitorCategories = sortedCategories.map((cat) => {
      const catItems = [...(itemsByCategory.get(cat.id) ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      );
      const groups = users.map((u) => {
        const userSummaries = summariesByUser.get(u.id) ?? [];
        const catSummary = userSummaries.find((s) => s.id === cat.id);
        const dots = catItems.map((it) => {
          const found = catSummary?.items.find((si) => si.id === it.id);
          return {
            itemId: it.id,
            title: it.title,
            xp: it.xp,
            passed: found?.passed ?? false,
          };
        });
        return {
          userId: u.id,
          username: u.username,
          groupName: u.group_name,
          isActive: u.is_active,
          earnedXp: catSummary?.earnedXp ?? 0,
          maxXp: catSummary?.maxXp ?? 0,
          passedCount: dots.filter((d) => d.passed).length,
          totalCount: dots.length,
          dots,
        };
      });

      return {
        categoryId: cat.id,
        title: cat.title,
        isOpen: cat.is_open !== false,
        items: catItems.map((it) => ({ id: it.id, title: it.title, xp: it.xp })),
        groups,
      };
    });

    const historyWithGroup = historyRows.map((h) => ({
      ...h,
      group_name: userMap.get(h.user_id)?.group_name ?? "ไม่ทราบกลุ่ม",
      username: userMap.get(h.user_id)?.username ?? h.changed_by,
    }));

    const photosWithGroup = photos.map((p) => ({
      id: p.id,
      userId: p.user_id,
      groupName: userMap.get(p.user_id)?.group_name ?? "ไม่ทราบกลุ่ม",
      username: userMap.get(p.user_id)?.username ?? "",
      issueCategory: p.issue_category ?? null,
      title: p.title,
      publicUrl: p.public_url,
      createdAt: p.created_at,
    }));

    const latestHistoryAt = historyRows[0]?.created_at ?? null;
    const latestPhotoAt = photos[0]?.created_at ?? null;

    // Combined latest timestamp for history tab (score changes OR photo uploads)
    const latestActivityForHistory =
      latestHistoryAt && latestPhotoAt
        ? latestHistoryAt > latestPhotoAt
          ? latestHistoryAt
          : latestPhotoAt
        : latestHistoryAt || latestPhotoAt;

    return NextResponse.json({
      projectName: settingsRes.data?.project_name || "ระบบจดคะแนน",
      leaderboardVisible: settingsRes.data?.leaderboard_visible !== false,
      projectIconUrl: settingsRes.data?.project_icon_url ?? null,
      leaderboard,
      monitorCategories,
      history: historyWithGroup,
      photos: photosWithGroup,
      latestActivity: {
        monitor: latestScoreAt || latestHistoryAt,
        history: latestActivityForHistory,
        photos: latestPhotoAt,
      },
    });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลสรุปได้" }, { status: 500 });
  }
}
