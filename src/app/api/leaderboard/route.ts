import { NextResponse } from "next/server";
import { requireAdminSession, requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  calculateCategorySummaries,
  calculateMaxTotalXp,
  calculateTotalXp,
} from "@/lib/scoring";

export async function GET() {
  const [userSession, adminSession] = await Promise.all([
    requireUserSession(),
    requireAdminSession(),
  ]);

  if (!userSession && !adminSession) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: settings, error: settingsErr } = await supabase
      .from("app_settings")
      .select("project_name, leaderboard_visible")
      .eq("id", 1)
      .maybeSingle();

    if (settingsErr) {
      return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลได้" }, { status: 500 });
    }

    const leaderboardVisible = settings?.leaderboard_visible !== false;
    if (!adminSession && !leaderboardVisible) {
      return NextResponse.json(
        { error: "ผู้ดูแลระบบปิดการแสดงหน้าอันดับคะแนนชั่วคราว" },
        { status: 403 }
      );
    }

    const [usersRes, catsRes, itemsRes, scoresRes] = await Promise.all([
      supabase
        .from("temp_users")
        .select("id, username, group_name, is_active")
        .order("created_at", { ascending: true }),
      supabase
        .from("score_categories")
        .select("id, title, sort_order, is_open, created_at")
        .order("sort_order"),
      supabase
        .from("score_items")
        .select("id, category_id, title, xp, sort_order")
        .order("sort_order"),
      supabase.from("user_scores").select("user_id, item_id, passed").order("user_id"),
    ]);

    if (usersRes.error || catsRes.error || itemsRes.error || scoresRes.error) {
      return NextResponse.json(
        { error: "ไม่สามารถโหลดตารางอันดับได้" },
        { status: 500 }
      );
    }

    const users = (usersRes.data ?? []).filter((u) => u.is_active);
    const categories = catsRes.data ?? [];
    const items = itemsRes.data ?? [];
    const scores = scoresRes.data ?? [];

    const scoresByUser = new Map<string, { item_id: string; passed: boolean }[]>();
    for (const s of scores) {
      const arr = scoresByUser.get(s.user_id);
      if (arr) arr.push(s);
      else scoresByUser.set(s.user_id, [s]);
    }

    const rankings = users
      .map((u) => {
        const summaries = calculateCategorySummaries(
          categories,
          items,
          scoresByUser.get(u.id) ?? []
        );
        const totalXp = calculateTotalXp(summaries);
        const maxTotalXp = calculateMaxTotalXp(summaries);
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
          totalXp,
          maxTotalXp,
          passedCount,
          totalItems,
          isCurrentUser: userSession?.userId === u.id,
        };
      })
      .sort((a, b) => b.totalXp - a.totalXp || b.passedCount - a.passedCount);

    return NextResponse.json({
      projectName: settings?.project_name || "ระบบจดคะแนน",
      leaderboardVisible,
      rankings,
    });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดตารางอันดับได้" }, { status: 500 });
  }
}
