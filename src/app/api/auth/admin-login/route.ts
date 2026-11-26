import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  signSessionToken,
  verifyAdminCredentials,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่านผู้ดูแลระบบ" },
        { status: 400 }
      );
    }

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const token = signSessionToken({ role: "admin", username });
    const response = NextResponse.json({ admin: { username } });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      buildSessionCookieOptions(undefined, request)
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถเข้าสู่ระบบผู้ดูแลได้" },
      { status: 500 }
    );
  }
}
