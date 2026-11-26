import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const [settingsRes, historyRes, photosCountRes] = await Promise.all([
      supabase.from("app_settings").select("project_name").eq("id", 1).maybeSingle(),
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

    if (historyRes.error || photosCountRes.error) {
      return NextResponse.json(
        { error: "ไม่สามารถโหลดประวัติคะแนนได้" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      projectName: settingsRes.data?.project_name || "ระบบจดคะแนน",
      user: {
        userId: session.userId,
        username: session.username,
        groupName: session.groupName,
      },
      history: historyRes.data ?? [],
      counts: {
        photos: photosCountRes.count ?? 0,
        history: (historyRes.data ?? []).length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดประวัติคะแนนได้" },
      { status: 500 }
    );
  }
}
