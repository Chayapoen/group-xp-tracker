import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validatePhotoUpload } from "@/lib/photo-validation";

const BUCKET_NAME = "evidence-photos";

export async function GET() {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("evidence_photos")
      .select("id, category_id, title, public_url, created_at, score_categories(title)")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "ไม่สามารถโหลดรูปหลักฐานได้" }, { status: 500 });
    }

    return NextResponse.json({ photos: data ?? [] });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดรูปหลักฐานได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = String(formData.get("title") ?? "").trim();
    const categoryIdRaw = String(formData.get("categoryId") ?? "").trim();
    const categoryId = categoryIdRaw || null;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "กรุณาถ่ายรูปหรือเลือกไฟล์รูปภาพ" },
        { status: 400 }
      );
    }

    const validation = validatePhotoUpload({ type: file.type, size: file.size }, title);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const ext = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
      : "jpg";
    const storagePath = `${session.userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "อัปโหลดไฟล์ไปยัง Storage ไม่สำเร็จ" },
        { status: 500 }
      );
    }

    const { data: pubData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const { data: inserted, error: dbError } = await supabase
      .from("evidence_photos")
      .insert({
        user_id: session.userId,
        category_id: categoryId,
        title,
        storage_path: storagePath,
        public_url: pubData.publicUrl,
      })
      .select("id, category_id, title, public_url, created_at, score_categories(title)")
      .single();

    if (dbError) {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      return NextResponse.json(
        { error: "บันทึกข้อมูลรูปภาพไม่สำเร็จ" },
        { status: 500 }
      );
    }

    return NextResponse.json({ photo: inserted }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "อัปโหลดรูปหลักฐานไม่สำเร็จ" }, { status: 500 });
  }
}
