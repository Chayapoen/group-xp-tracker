import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET_NAME = "evidence-photos";

interface ClearHistoryBody {
  mode?: "selected" | "all";
  scoreIds?: string[];
  photoIds?: string[];
  userId?: string;
  type?: "all" | "score" | "photo";
}

export async function DELETE(request: Request) {
  const admin = await requireAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ClearHistoryBody;
    const supabase = getSupabaseAdmin();

    if (body.mode === "selected") {
      const scoreIds = Array.isArray(body.scoreIds)
        ? body.scoreIds.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        : [];
      const photoIds = Array.isArray(body.photoIds)
        ? body.photoIds.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        : [];

      if (scoreIds.length === 0 && photoIds.length === 0) {
        return NextResponse.json(
          { error: "กรุณาเลือกรายการที่ต้องการลบอย่างน้อย 1 รายการ" },
          { status: 400 }
        );
      }

      if (scoreIds.length > 0) {
        const { error } = await supabase
          .from("score_history")
          .delete()
          .in("id", scoreIds);
        if (error) {
          return NextResponse.json(
            { error: "ลบประวัติการจดคะแนนไม่สำเร็จ" },
            { status: 500 }
          );
        }
      }

      if (photoIds.length > 0) {
        const { data: photos } = await supabase
          .from("evidence_photos")
          .select("storage_path")
          .in("id", photoIds);

        const { error } = await supabase
          .from("evidence_photos")
          .delete()
          .in("id", photoIds);
        if (error) {
          return NextResponse.json(
            { error: "ลบประวัติรูปหลักฐานไม่สำเร็จ" },
            { status: 500 }
          );
        }

        const paths = (photos ?? [])
          .map((p) => p.storage_path)
          .filter((p): p is string => Boolean(p));
        if (paths.length > 0) {
          await supabase.storage.from(BUCKET_NAME).remove(paths);
        }
      }

      return NextResponse.json({
        ok: true,
        deletedScores: scoreIds.length,
        deletedPhotos: photoIds.length,
      });
    }

    if (body.mode === "all") {
      const targetUserId =
        body.userId && body.userId !== "all" ? body.userId.trim() : null;
      const type = body.type ?? "all";

      if (type === "all" || type === "score") {
        const query = targetUserId
          ? supabase.from("score_history").delete().eq("user_id", targetUserId)
          : supabase.from("score_history").delete().not("id", "is", null);
        const { error } = await query;
        if (error) {
          return NextResponse.json(
            { error: "ล้างประวัติการจดคะแนนไม่สำเร็จ" },
            { status: 500 }
          );
        }
      }

      if (type === "all" || type === "photo") {
        const selectQuery = targetUserId
          ? supabase
              .from("evidence_photos")
              .select("storage_path")
              .eq("user_id", targetUserId)
          : supabase
              .from("evidence_photos")
              .select("storage_path")
              .not("id", "is", null);

        const { data: photos } = await selectQuery;

        const deleteQuery = targetUserId
          ? supabase.from("evidence_photos").delete().eq("user_id", targetUserId)
          : supabase.from("evidence_photos").delete().not("id", "is", null);

        const { error } = await deleteQuery;
        if (error) {
          return NextResponse.json(
            { error: "ล้างประวัติรูปหลักฐานไม่สำเร็จ" },
            { status: 500 }
          );
        }

        const paths = (photos ?? [])
          .map((p) => p.storage_path)
          .filter((p): p is string => Boolean(p));
        if (paths.length > 0) {
          await supabase.storage.from(BUCKET_NAME).remove(paths);
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "รูปแบบคำสั่งลบไม่ถูกต้อง" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "ล้างข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
