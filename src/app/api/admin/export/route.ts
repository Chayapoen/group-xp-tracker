import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { calculateCategorySummaries, calculateTotalXp } from "@/lib/scoring";

function escapeCsvCell(value: string | number | boolean): string {
  let str = String(value);
  // Neutralize Excel/Sheets formula injection (CWE-1236)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const [usersRes, catsRes, itemsRes, scoresRes] = await Promise.all([
      supabase
        .from("temp_users")
        .select("id, username, group_name, is_active, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("score_categories")
        .select("id, title, sort_order, created_at")
        .order("sort_order"),
      supabase
        .from("score_items")
        .select("id, category_id, title, xp, sort_order")
        .order("sort_order"),
      supabase.from("user_scores").select("user_id, item_id, passed").order("user_id"),
    ]);

    if (usersRes.error || catsRes.error || itemsRes.error || scoresRes.error) {
      return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลคะแนนได้" }, { status: 500 });
    }

    const users = usersRes.data ?? [];
    const categories = catsRes.data ?? [];
    const items = itemsRes.data ?? [];
    const scores = scoresRes.data ?? [];

    const scoresByUser = new Map<string, { item_id: string; passed: boolean }[]>();
    for (const s of scores) {
      const arr = scoresByUser.get(s.user_id);
      if (arr) arr.push(s);
      else scoresByUser.set(s.user_id, [s]);
    }

    const sortedCategories = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const headers = [
      "อันดับ",
      "ชื่อกลุ่ม",
      "Username",
      "สถานะ",
      ...sortedCategories.map((c) => c.title),
      "คะแนนรวม XP",
    ];

    const rows = users
      .map((u) => {
        const summaries = calculateCategorySummaries(
          sortedCategories,
          items,
          scoresByUser.get(u.id) ?? []
        );
        return {
          groupName: u.group_name,
          username: u.username,
          status: u.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน",
          categoryXps: summaries.map((s) => s.earnedXp),
          totalXp: calculateTotalXp(summaries),
        };
      })
      .sort((a, b) => b.totalXp - a.totalXp);

    const csvLines = [
      headers.map(escapeCsvCell).join(","),
      ...rows.map((r, idx) =>
        [
          idx + 1,
          r.groupName,
          r.username,
          r.status,
          ...r.categoryXps,
          r.totalXp,
        ]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];

    const csvContent = "\uFEFF" + csvLines.join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="group-xp-scores.csv"',
      },
    });
  } catch {
    return NextResponse.json({ error: "Export CSV ไม่สำเร็จ" }, { status: 500 });
  }
}
