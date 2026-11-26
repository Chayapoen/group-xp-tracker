import { NextResponse } from "next/server";
import { hashPassword, requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("temp_users")
    .select("id, username, group_name, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "ไม่สามารถโหลดรายชื่อผู้ใช้ได้" }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      groupName?: string;
    };
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    const groupName = (body.groupName ?? "").trim();

    if (!username || !password || !groupName) {
      return NextResponse.json(
        { error: "กรุณากรอก Username, รหัสผ่าน และชื่อกลุ่มให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("temp_users")
      .insert({
        username,
        password_hash: hashPassword(password),
        group_name: groupName,
        is_active: true,
      })
      .select("id, username, group_name, is_active, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Username "${username}" ถูกใช้งานแล้ว` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "สร้างบัญชีผู้ใช้ไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ user: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "สร้างบัญชีผู้ใช้ไม่สำเร็จ" }, { status: 500 });
  }
}
