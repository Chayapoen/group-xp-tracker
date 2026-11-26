import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอก Username และรหัสผ่าน" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("temp_users")
      .select("id, username, password_hash, group_name, is_active")
      .eq("username", username)
      .maybeSingle();

    if (error || !user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ" },
        { status: 403 }
      );
    }

    const token = signSessionToken({
      role: "user",
      userId: user.id,
      username: user.username,
      groupName: user.group_name,
    });

    const response = NextResponse.json({
      user: {
        userId: user.id,
        username: user.username,
        groupName: user.group_name,
      },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
