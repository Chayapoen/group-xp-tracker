import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET_NAME = "evidence-photos";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { title?: string };
    const title = (body.title ?? "").trim();

    if (!title) {
      return NextResponse.json({ error: "กรุณากรอกชื่อรูปหลักฐาน" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("evidence_photos")
      .update({ title })
      .eq("id", id)
      .eq("user_id", session.userId)
      .select("id, title")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "ไม่พบรูปภาพที่ต้องการแก้ไข" }, { status: 404 });
    }

    return NextResponse.json({ photo: data });
  } catch {
    return NextResponse.json({ error: "แก้ไขชื่อรูปไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: photo, error: findError } = await supabase
      .from("evidence_photos")
      .select("id, storage_path")
      .eq("id", id)
      .eq("user_id", session.userId)
      .maybeSingle();

    if (findError || !photo) {
      return NextResponse.json({ error: "ไม่พบรูปภาพที่ต้องการลบ" }, { status: 404 });
    }

    await supabase.storage.from(BUCKET_NAME).remove([photo.storage_path]);
    const { error: deleteError } = await supabase
      .from("evidence_photos")
      .delete()
      .eq("id", id)
      .eq("user_id", session.userId);

    if (deleteError) {
      return NextResponse.json({ error: "ลบรูปภาพไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "ลบรูปภาพไม่สำเร็จ" }, { status: 500 });
  }
}
