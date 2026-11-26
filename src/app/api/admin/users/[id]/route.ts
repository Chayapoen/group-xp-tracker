import { NextResponse } from "next/server";
import { hashPassword, requireAdminSession } from "@/lib/auth";
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
      username?: string;
      password?: string;
      groupName?: string;
      isActive?: boolean;
    };

    const updates: Record<string, unknown> = {};
    if (body.username !== undefined) {
      const trimmed = body.username.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Username ห้ามว่าง" }, { status: 400 });
      }
      updates.username = trimmed;
    }
    if (body.groupName !== undefined) {
      const trimmed = body.groupName.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "ชื่อกลุ่มห้ามว่าง" }, { status: 400 });
      }
      updates.group_name = trimmed;
    }
    if (body.password && body.password.trim()) {
      updates.password_hash = hashPassword(body.password);
    }
    if (typeof body.isActive === "boolean") {
      updates.is_active = body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องการอัปเดต" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("temp_users")
      .update(updates)
      .eq("id", id)
      .select("id, username, group_name, is_active, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Username นี้ถูกใช้งานแล้ว" }, { status: 409 });
      }
      return NextResponse.json({ error: "อัปเดตข้อมูลผู้ใช้ไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: "อัปเดตข้อมูลผู้ใช้ไม่สำเร็จ" }, { status: 500 });
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
  const { error } = await supabase.from("temp_users").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "ลบผู้ใช้ไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
