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
    const body = (await request.json()) as {
      title?: string;
      xp?: number;
      sortOrder?: number;
    };
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const trimmed = body.title.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "ชื่อหัวข้อย่อยห้ามว่าง" }, { status: 400 });
      }
      updates.title = trimmed;
    }
    if (body.xp !== undefined) {
      const xp = Number(body.xp);
      if (!Number.isFinite(xp) || xp < 0) {
        return NextResponse.json({ error: "ค่า XP ต้องไม่ติดลบ" }, { status: 400 });
      }
      updates.xp = Math.round(xp);
    }
    if (typeof body.sortOrder === "number") {
      updates.sort_order = body.sortOrder;
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("score_items")
      .update(updates)
      .eq("id", id)
      .select("id, category_id, title, xp, sort_order")
      .single();

    if (error) {
      return NextResponse.json({ error: "แก้ไขหัวข้อย่อยไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch {
    return NextResponse.json({ error: "แก้ไขหัวข้อย่อยไม่สำเร็จ" }, { status: 500 });
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
  const { error } = await supabase.from("score_items").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "ลบหัวข้อย่อยไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
