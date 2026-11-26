import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  calculateCategorySummaries,
  calculateMaxTotalXp,
  calculateTotalXp,
} from "@/lib/scoring";

export async function GET() {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const [settingsRes, categoriesRes, itemsRes, scoresRes, photosCountRes, historyCountRes] =
      await Promise.all([
        supabase.from("app_settings").select("project_name").eq("id", 1).maybeSingle(),
        supabase.from("score_categories").select("id, title, sort_order, is_open, created_at").order("sort_order"),
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

    if (
      categoriesRes.error ||
      itemsRes.error ||
      scoresRes.error ||
      photosCountRes.error ||
      historyCountRes.error
    ) {
      return NextResponse.json(
        { error: "ไม่สามารถโหลดข้อมูลคะแนนได้" },
        { status: 500 }
      );
    }

    const categories = calculateCategorySummaries(
      categoriesRes.data ?? [],
      itemsRes.data ?? [],
      scoresRes.data ?? []
    );

    return NextResponse.json({
      projectName: settingsRes.data?.project_name || "ระบบจดคะแนน",
      user: {
        userId: session.userId,
        username: session.username,
        groupName: session.groupName,
      },
      categories,
      totalXp: calculateTotalXp(categories),
      maxTotalXp: calculateMaxTotalXp(categories),
      counts: {
        photos: photosCountRes.count ?? 0,
        history: historyCountRes.count ?? 0,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลคะแนนได้" },
      { status: 500 }
    );
  }
}
