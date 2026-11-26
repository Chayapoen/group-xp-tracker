import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("app_settings")
    .select("project_name, updated_at")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    projectName: data?.project_name || "ระบบจดคะแนน",
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { projectName?: string };
    const projectName = (body.projectName ?? "").trim();
    if (!projectName) {
      return NextResponse.json({ error: "กรุณากรอกชื่อโปรเจกต์" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .upsert(
        { id: 1, project_name: projectName, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      )
      .select("project_name, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "บันทึกชื่อโปรเจกต์ไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({
      projectName: data.project_name,
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({ error: "บันทึกชื่อโปรเจกต์ไม่สำเร็จ" }, { status: 500 });
  }
}
