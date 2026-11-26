import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      categoryId?: string;
      title?: string;
      xp?: number;
      sortOrder?: number;
    };
    const categoryId = (body.categoryId ?? "").trim();
    const title = (body.title ?? "").trim();
    const xp = Number(body.xp);

    if (!categoryId || !title || !Number.isFinite(xp) || xp < 0) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลหัวข้อย่อยและค่า XP ให้ถูกต้อง" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("score_items")
      .insert({
        category_id: categoryId,
        title,
        xp: Math.round(xp),
        sort_order: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      })
      .select("id, category_id, title, xp, sort_order")
      .single();

    if (error) {
      return NextResponse.json({ error: "เพิ่มหัวข้อย่อยไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "เพิ่มหัวข้อย่อยไม่สำเร็จ" }, { status: 500 });
  }
}
