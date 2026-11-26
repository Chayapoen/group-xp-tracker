"use client";

import { useMemo, useState } from "react";
import type { AdminPhotoRow } from "@/components/admin/PhotosTab";

export interface AdminHistoryRow {
  id: string;
  user_id: string;
  group_name: string;
  username: string;
  category_title: string;
  item_title: string;
  xp: number;
  passed: boolean;
  changed_by: string;
  created_at: string;
}

interface HistoryTabProps {
  history: AdminHistoryRow[];
  photos: AdminPhotoRow[];
  groups: { userId: string; groupName: string; username: string }[];
}

interface UnifiedActivity {
  id: string;
  type: "score" | "photo";
  userId: string;
  groupName: string;
  username: string;
  createdAt: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeVariant: "pass" | "cancel" | "photo";
  xpText?: string;
  photoUrl?: string;
}

export function HistoryTab({ history, photos, groups }: HistoryTabProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "score" | "photo">("all");

  const activities = useMemo<UnifiedActivity[]>(() => {
    const scoreItems: UnifiedActivity[] = history.map((h) => ({
      id: `score-${h.id}`,
      type: "score",
      userId: h.user_id,
      groupName: h.group_name,
      username: h.username || h.changed_by,
      createdAt: h.created_at,
      title: h.item_title,
      subtitle: `${h.category_title} • โดย ${h.changed_by}`,
      badgeText: h.passed ? "ผ่าน" : "ยกเลิกผ่าน",
      badgeVariant: h.passed ? "pass" : "cancel",
      xpText: `${h.passed ? "+" : "-"}${h.xp.toLocaleString()} XP`,
    }));

    const photoItems: UnifiedActivity[] = photos.map((p) => ({
      id: `photo-${p.id}`,
      type: "photo",
      userId: p.userId,
      groupName: p.groupName,
      username: p.username,
      createdAt: p.createdAt,
      title: `อัปโหลดรูป: ${p.title}`,
      subtitle: `หมวดประเด็น: ${p.issueCategory || "ทั่วไป"} • โดย ${p.username}`,
      badgeText: "รูปหลักฐาน",
      badgeVariant: "photo",
      photoUrl: p.publicUrl,
    }));

    return [...scoreItems, ...photoItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [history, photos]);

  const filtered = activities.filter((a) => {
    if (selectedUserId !== "all" && a.userId !== selectedUserId) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DDD2] bg-white/95 p-4 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">
            ประวัติการใช้งานแยกรายกลุ่ม{" "}
            <span className="text-old-rose">({filtered.length} รายการ)</span>
          </h2>
          <p className="text-xs text-[#555555]">
            เลือกดูประวัติการจดคะแนนและการอัปโหลดรูปหลักฐานของแต่ละกลุ่ม
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-1.5 text-xs font-medium text-[#111111] focus:border-[#C06C84] focus:outline-none"
          >
            <option value="all">ทุกกลุ่ม</option>
            {groups.map((g) => (
              <option key={g.userId} value={g.userId}>
                {g.groupName} ({g.username})
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "all" | "score" | "photo")
            }
            className="rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-1.5 text-xs font-medium text-[#111111] focus:border-[#C06C84] focus:outline-none"
          >
            <option value="all">กิจกรรมทั้งหมด</option>
            <option value="score">เฉพาะการจดคะแนน</option>
            <option value="photo">เฉพาะการอัปโหลดรูป</option>
          </select>
        </div>
      </div>

      {/* Group quick-filter chips */}
      {groups.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedUserId("all")}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              selectedUserId === "all"
                ? "brand-gradient border-transparent text-white"
                : "border-[#E5DDD3] bg-white text-[#555555] hover:border-[#C06C84]"
            }`}
          >
            ทุกกลุ่ม
          </button>
          {groups.map((g) => (
            <button
              key={g.userId}
              type="button"
              onClick={() => setSelectedUserId(g.userId)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                selectedUserId === g.userId
                  ? "border-[#C06C84] bg-old-rose-soft text-old-rose"
                  : "border-[#E5DDD3] bg-white text-[#555555] hover:border-[#C06C84]"
              }`}
            >
              {g.groupName}
            </button>
          ))}
        </div>
      ) : null}

      <div className="divide-y divide-[#EFE8DF] overflow-hidden rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#555555]">
            ไม่พบประวัติการใช้งานตามเงื่อนไขที่เลือก
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-old-rose font-bold">{a.groupName}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-semibold ${
                      a.badgeVariant === "pass"
                        ? "bg-[#E8FCEF] text-[#15803D]"
                        : a.badgeVariant === "cancel"
                        ? "bg-[#FEF2F2] text-[#B91C1C]"
                        : "bg-old-rose-soft text-old-rose"
                    }`}
                  >
                    {a.badgeText}
                  </span>
                  <span className="font-semibold text-[#111111]">{a.title}</span>
                </div>
                <div className="mt-0.5 text-[#555555]">{a.subtitle}</div>
              </div>

              <div className="shrink-0 text-right font-mono">
                {a.xpText ? (
                  <div className="text-old-rose font-bold">{a.xpText}</div>
                ) : a.photoUrl ? (
                  <a
                    href={a.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-old-rose font-semibold hover:underline"
                  >
                    ดูรูป →
                  </a>
                ) : null}
                <div className="text-[#666666]">
                  {new Date(a.createdAt).toLocaleString("th-TH", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
