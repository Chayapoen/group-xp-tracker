import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const [catsRes, itemsRes] = await Promise.all([
    supabase
      .from("score_categories")
      .select("id, title, sort_order, created_at")
      .order("sort_order"),
    supabase
      .from("score_items")
      .select("id, category_id, title, xp, sort_order")
      .order("sort_order"),
  ]);

  if (catsRes.error || itemsRes.error) {
    return NextResponse.json({ error: "ไม่สามารถโหลดหมวดคะแนนได้" }, { status: 500 });
  }

  const itemsByCat = new Map<string, typeof itemsRes.data>();
  for (const it of itemsRes.data ?? []) {
    const arr = itemsByCat.get(it.category_id);
    if (arr) arr.push(it);
    else itemsByCat.set(it.category_id, [it]);
  }

  const categories = (catsRes.data ?? []).map((cat) => ({
    ...cat,
    items: itemsByCat.get(cat.id) ?? [],
  }));

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { title?: string; sortOrder?: number };
    const title = (body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "กรุณากรอกชื่อหมวดคะแนน" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("score_categories")
      .insert({
        title,
        sort_order: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      })
      .select("id, title, sort_order, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "เพิ่มหมวดคะแนนไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ category: { ...data, items: [] } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "เพิ่มหมวดคะแนนไม่สำเร็จ" }, { status: 500 });
  }
}
