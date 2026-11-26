"use client";

import { useState } from "react";

export interface AdminPhotoRow {
  id: string;
  userId: string;
  groupName: string;
  username: string;
  issueCategory: string | null;
  title: string;
  publicUrl: string;
  createdAt: string;
}

interface PhotosTabProps {
  photos: AdminPhotoRow[];
}

export function PhotosTab({ photos }: PhotosTabProps) {
  const [groupFilter, setGroupFilter] = useState("all");
  const [issueFilter, setIssueFilter] = useState("all");

  const groups = Array.from(new Set(photos.map((p) => p.groupName)));
  const issues = Array.from(
    new Set(
      photos
        .map((p) => p.issueCategory?.trim())
        .filter((v): v is string => Boolean(v))
    )
  );

  const filtered = photos.filter((p) => {
    if (groupFilter !== "all" && p.groupName !== groupFilter) return false;
    if (issueFilter !== "all" && (p.issueCategory || "") !== issueFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#111111]">
          รูปหลักฐานทั้งหมด <span className="text-old-rose">({filtered.length} รูป)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="rounded-xl border border-[#DFD5C9] bg-white px-3 py-1.5 text-xs text-[#111111] focus:border-[#C06C84] focus:outline-none"
          >
            <option value="all">ทุกกลุ่ม</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {issues.length > 0 ? (
            <select
              value={issueFilter}
              onChange={(e) => setIssueFilter(e.target.value)}
              className="rounded-xl border border-[#DFD5C9] bg-white px-3 py-1.5 text-xs text-[#111111] focus:border-[#C06C84] focus:outline-none"
            >
              <option value="all">ทุกหมวดประเด็น</option>
              {issues.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-8 text-center text-sm text-[#555555]">
          ยังไม่มีรูปหลักฐานในระบบ
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs"
            >
              <a href={p.publicUrl} target="_blank" rel="noreferrer">
                <img
                  src={p.publicUrl}
                  alt={p.title}
                  className="h-40 w-full border-b border-[#EFE8DF] object-cover"
                />
              </a>
              <div className="space-y-1 p-3">
                <div className="text-old-rose text-xs font-bold">{p.groupName}</div>
                <div className="text-sm font-bold text-[#111111]">{p.title}</div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#555555]">
                  <span className="truncate rounded-full bg-old-rose-soft px-2 py-0.5 text-[11px] font-semibold text-old-rose">
                    {p.issueCategory || "ทั่วไป"}
                  </span>
                  <span className="shrink-0 font-mono">
                    {new Date(p.createdAt).toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
