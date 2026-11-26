import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { title?: string; sortOrder?: number };
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const trimmed = body.title.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "ชื่อหมวดคะแนนห้ามว่าง" }, { status: 400 });
      }
      updates.title = trimmed;
    }
    if (typeof body.sortOrder === "number") {
      updates.sort_order = body.sortOrder;
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("score_categories")
      .update(updates)
      .eq("id", id)
      .select("id, title, sort_order, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "แก้ไขหมวดคะแนนไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ category: data });
  } catch {
    return NextResponse.json({ error: "แก้ไขหมวดคะแนนไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("score_categories").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "ลบหมวดคะแนนไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
