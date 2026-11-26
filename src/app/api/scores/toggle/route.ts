import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface JoinedScoreItem {
  id: string;
  title: string;
  xp: number;
  score_categories: { title: string } | { title: string }[] | null;
}

export async function POST(request: Request) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { itemId?: string; passed?: boolean };
    const itemId = (body.itemId ?? "").trim();
    if (!itemId || typeof body.passed !== "boolean") {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: itemData, error: itemError } = await supabase
      .from("score_items")
      .select("id, title, xp, score_categories(title)")
      .eq("id", itemId)
      .maybeSingle();

    const item = itemData as JoinedScoreItem | null;
    if (itemError || !item) {
      return NextResponse.json({ error: "ไม่พบหัวข้อคะแนนนี้" }, { status: 404 });
    }

    const categoryObj = Array.isArray(item.score_categories)
      ? item.score_categories[0]
      : item.score_categories;
    const categoryTitle = categoryObj?.title ?? "ไม่ระบุหมวดหมู่";

    const now = new Date().toISOString();
    const { error: upsertError } = await supabase
      .from("user_scores")
      .upsert(
        {
          user_id: session.userId,
          item_id: item.id,
          passed: body.passed,
          updated_at: now,
        },
        { onConflict: "user_id,item_id" }
      );

    if (upsertError) {
      return NextResponse.json({ error: "บันทึกคะแนนไม่สำเร็จ" }, { status: 500 });
    }

    const { error: historyError } = await supabase.from("score_history").insert({
      user_id: session.userId,
      item_id: item.id,
      category_title: categoryTitle,
      item_title: item.title,
      xp: item.xp,
      passed: body.passed,
      changed_by: session.username,
    });

    if (historyError) {
      return NextResponse.json(
        { error: "บันทึกประวัติการให้คะแนนไม่สำเร็จ" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      itemId: item.id,
      passed: body.passed,
      updatedAt: now,
    });
  } catch {
    return NextResponse.json({ error: "บันทึกคะแนนไม่สำเร็จ" }, { status: 500 });
  }
}
