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
    .select("project_name, leaderboard_visible, updated_at")
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json({
    projectName: data?.project_name || "ระบบจดคะแนน",
    leaderboardVisible: data?.leaderboard_visible !== false,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PATCH(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      projectName?: string;
      leaderboardVisible?: boolean;
    };

    const updates: Record<string, unknown> = {
      id: 1,
      updated_at: new Date().toISOString(),
    };

    if (body.projectName !== undefined) {
      const trimmed = body.projectName.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "กรุณากรอกชื่อโปรเจกต์" }, { status: 400 });
      }
      updates.project_name = trimmed;
    }

    if (typeof body.leaderboardVisible === "boolean") {
      updates.leaderboard_visible = body.leaderboardVisible;
    }

    if (Object.keys(updates).length <= 2) {
      return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องการอัปเดต" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .upsert(updates, { onConflict: "id" })
      .select("project_name, leaderboard_visible, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "บันทึกการตั้งค่าไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({
      projectName: data.project_name,
      leaderboardVisible: data.leaderboard_visible !== false,
      updatedAt: data.updated_at,
    });
  } catch {
    return NextResponse.json({ error: "บันทึกการตั้งค่าไม่สำเร็จ" }, { status: 500 });
  }
}
