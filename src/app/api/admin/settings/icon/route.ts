import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  extensionForMimeType,
  getImageDimensions,
  validateImageBuffer,
  validateProjectIconUpload,
} from "@/lib/photo-validation";

const BUCKET_NAME = "evidence-photos";

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "กรุณาเลือกไฟล์รูปไอคอน" }, { status: 400 });
    }

    const validation = validateProjectIconUpload({ type: file.type, size: file.size });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const ext = extensionForMimeType(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์รูปภาพ PNG, JPEG, WebP หรือ GIF เท่านั้น" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateImageBuffer(buffer, file.type)) {
      return NextResponse.json(
        { error: "ไฟล์รูปภาพไม่ถูกต้องหรือเสียหาย" },
        { status: 400 }
      );
    }

    const dims = getImageDimensions(buffer, file.type);
    if (!dims || dims.width <= 0 || dims.height <= 0 || dims.width !== dims.height) {
      return NextResponse.json(
        { error: "กรุณาเลือกรูปอัตราส่วน 1:1 (ความกว้างต้องเท่ากับความสูง)" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("app_settings")
      .select("project_icon_path")
      .eq("id", 1)
      .maybeSingle();

    const storagePath = `project-icons/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "อัปโหลดรูปไอคอนไม่สำเร็จ" },
        { status: 500 }
      );
    }

    const { data: pubData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const { data: saved, error: dbError } = await supabase
      .from("app_settings")
      .upsert(
        {
          id: 1,
          project_icon_url: pubData.publicUrl,
          project_icon_path: storagePath,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("project_icon_url")
      .single();

    if (dbError) {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      return NextResponse.json({ error: "บันทึกไอคอนไม่สำเร็จ" }, { status: 500 });
    }

    if (existing?.project_icon_path) {
      await supabase.storage.from(BUCKET_NAME).remove([existing.project_icon_path]);
    }

    return NextResponse.json({ projectIconUrl: saved.project_icon_url });
  } catch {
    return NextResponse.json({ error: "อัปโหลดรูปไอคอนไม่สำเร็จ" }, { status: 500 });
  }
}

export async function DELETE() {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase
      .from("app_settings")
      .select("project_icon_path")
      .eq("id", 1)
      .maybeSingle();

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          id: 1,
          project_icon_url: null,
          project_icon_path: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      return NextResponse.json({ error: "รีเซ็ตไอคอนไม่สำเร็จ" }, { status: 500 });
    }

    if (existing?.project_icon_path) {
      await supabase.storage.from(BUCKET_NAME).remove([existing.project_icon_path]);
    }

    return NextResponse.json({ projectIconUrl: null });
  } catch {
    return NextResponse.json({ error: "รีเซ็ตไอคอนไม่สำเร็จ" }, { status: 500 });
  }
}
