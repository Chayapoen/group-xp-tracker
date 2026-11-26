import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("app_settings")
      .select("project_name")
      .eq("id", 1)
      .maybeSingle();

    return NextResponse.json({
      projectName: data?.project_name || "ระบบจดคะแนน",
    });
  } catch {
    return NextResponse.json({ projectName: "ระบบจดคะแนน" });
  }
}
