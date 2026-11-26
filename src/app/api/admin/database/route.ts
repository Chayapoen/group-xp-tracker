import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildUtf8BomCsv } from "@/lib/csv";

const BUCKET_NAME = "evidence-photos";

interface TableMeta {
  columns: string[];
  orderBy: string;
  ascending: boolean;
  deletable: boolean;
}

const ALLOWED_TABLES: Record<string, TableMeta> = {
  temp_users: {
    columns: ["id", "username", "group_name", "is_active", "created_at"],
    orderBy: "created_at",
    ascending: false,
    deletable: true,
  },
  score_categories: {
    columns: ["id", "title", "sort_order", "is_open", "created_at"],
    orderBy: "sort_order",
    ascending: true,
    deletable: true,
  },
  score_items: {
    columns: ["id", "category_id", "title", "xp", "sort_order", "created_at"],
    orderBy: "sort_order",
    ascending: true,
    deletable: true,
  },
  user_scores: {
    columns: ["id", "user_id", "item_id", "passed", "updated_at"],
    orderBy: "updated_at",
    ascending: false,
    deletable: true,
  },
  score_history: {
    columns: [
      "id",
      "user_id",
      "item_id",
      "category_title",
      "item_title",
      "xp",
      "passed",
      "changed_by",
      "created_at",
    ],
    orderBy: "created_at",
    ascending: false,
    deletable: true,
  },
  evidence_photos: {
    columns: [
      "id",
      "user_id",
      "issue_category",
      "title",
      "storage_path",
      "public_url",
      "created_at",
    ],
    orderBy: "created_at",
    ascending: false,
    deletable: true,
  },
  app_settings: {
    columns: ["id", "project_name", "leaderboard_visible", "updated_at"],
    orderBy: "id",
    ascending: true,
    deletable: false,
  },
};

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  const url = new URL(request.url);
  const table = (url.searchParams.get("table") ?? "temp_users").trim();
  const format = (url.searchParams.get("format") ?? "json").trim().toLowerCase();

  const meta = ALLOWED_TABLES[table];
  if (!meta) {
    return NextResponse.json({ error: "ไม่พบตารางที่ระบุ" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(table)
      .select(meta.columns.join(", "))
      .order(meta.orderBy, { ascending: meta.ascending });

    if (error) {
      return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลจากตารางได้" }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    if (format === "csv") {
      const csvRows = rows.map((row) => meta.columns.map((col) => row[col]));
      const csv = buildUtf8BomCsv(meta.columns, csvRows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${table}.csv"`,
        },
      });
    }

    return NextResponse.json({
      table,
      columns: meta.columns,
      deletable: meta.deletable,
      rows,
    });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลจากตารางได้" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { table?: string; id?: string };
    const table = (body.table ?? "").trim();
    const id = (body.id ?? "").trim();

    const meta = ALLOWED_TABLES[table];
    if (!meta || !meta.deletable || !id) {
      return NextResponse.json(
        { error: "ไม่สามารถลบข้อมูลในตารางนี้ได้" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    let storagePaths: string[] = [];

    if (table === "evidence_photos") {
      const { data: photo } = await supabase
        .from("evidence_photos")
        .select("storage_path")
        .eq("id", id)
        .maybeSingle();
      if (photo?.storage_path) storagePaths = [photo.storage_path];
    } else if (table === "temp_users") {
      const { data: photos } = await supabase
        .from("evidence_photos")
        .select("storage_path")
        .eq("user_id", id);
      storagePaths = (photos ?? [])
        .map((p) => p.storage_path)
        .filter((p): p is string => Boolean(p));
    }

    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
    }

    if (storagePaths.length > 0) {
      await supabase.storage.from(BUCKET_NAME).remove(storagePaths);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "ลบข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
