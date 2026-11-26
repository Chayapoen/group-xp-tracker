import { NextResponse } from "next/server";
import { requireAdminSession, requireUserSession } from "@/lib/auth";

export async function GET() {
  const user = await requireUserSession();
  if (user) {
    return NextResponse.json({ session: user });
  }
  const admin = await requireAdminSession();
  if (admin) {
    return NextResponse.json({ session: admin });
  }
  return NextResponse.json({ session: null }, { status: 401 });
}
