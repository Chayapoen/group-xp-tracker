import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface JoinedScoreItem {
  id: string;
  title: string;
  xp: number;
  score_categories:
    | { title: string; is_open?: boolean }
    | { title: string; is_open?: boolean }[]
    | null;
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
      .select("id, title, xp, score_categories(title, is_open)")
      .eq("id", itemId)
      .maybeSingle();

    const item = itemData as JoinedScoreItem | null;
    if (itemError || !item) {
      return NextResponse.json({ error: "ไม่พบหัวข้อคะแนนนี้" }, { status: 404 });
    }

    const categoryObj = Array.isArray(item.score_categories)
      ? item.score_categories[0]
      : item.score_categories;
    if (categoryObj?.is_open === false) {
      return NextResponse.json(
        { error: "หมวดคะแนนนี้ถูกปิดการจดคะแนนชั่วคราว" },
        { status: 403 }
      );
    }
    const categoryTitle = categoryObj?.title ?? "ไม่ระบุหมวดหมู่";

    const { error: rpcError } = await supabase.rpc("toggle_user_score", {
      p_user_id: session.userId,
      p_item_id: item.id,
      p_passed: body.passed,
      p_category_title: categoryTitle,
      p_item_title: item.title,
      p_xp: item.xp,
      p_changed_by: session.username,
    });

    if (rpcError) {
      return NextResponse.json({ error: "บันทึกคะแนนไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      itemId: item.id,
      passed: body.passed,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "บันทึกคะแนนไม่สำเร็จ" }, { status: 500 });
  }
}
