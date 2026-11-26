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
  onRefresh: () => Promise<void>;
}

interface UnifiedActivity {
  key: string;
  rawId: string;
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

export function HistoryTab({
  history,
  photos,
  groups,
  onRefresh,
}: HistoryTabProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "score" | "photo">("all");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activities = useMemo<UnifiedActivity[]>(() => {
    const scoreItems: UnifiedActivity[] = history.map((h) => ({
      key: `score-${h.id}`,
      rawId: h.id,
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
      key: `photo-${p.id}`,
      rawId: p.id,
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

  const filteredKeys = filtered.map((a) => a.key);
  const allFilteredSelected =
    filteredKeys.length > 0 && filteredKeys.every((k) => selectedKeys.has(k));

  function toggleOne(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const k of filteredKeys) next.delete(k);
      } else {
        for (const k of filteredKeys) next.add(k);
      }
      return next;
    });
  }

  async function handleClearSelected() {
    const selectedItems = activities.filter((a) => selectedKeys.has(a.key));
    if (selectedItems.length === 0) return;

    const scoreIds = selectedItems
      .filter((a) => a.type === "score")
      .map((a) => a.rawId);
    const photoIds = selectedItems
      .filter((a) => a.type === "photo")
      .map((a) => a.rawId);

    const ok = window.confirm(
      `ต้องการลบประวัติที่เลือกจำนวน ${selectedItems.length} รายการใช่หรือไม่?` +
        (photoIds.length > 0
          ? `\n(รวมรูปหลักฐาน ${photoIds.length} รูปที่จะถูกลบออกจากระบบด้วย)`
          : "")
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "selected", scoreIds, photoIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "ลบประวัติที่เลือกไม่สำเร็จ");
      setSelectedKeys(new Set());
      setNotice(`ลบประวัติที่เลือกจำนวน ${selectedItems.length} รายการเรียบร้อยแล้ว`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบประวัติที่เลือกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleClearAll(scope: "filtered" | "everything") {
    const isEverything = scope === "everything";
    const targetGroup =
      !isEverything && selectedUserId !== "all"
        ? groups.find((g) => g.userId === selectedUserId)?.groupName ?? "กลุ่มที่เลือก"
        : "ทุกกลุ่ม";
    const targetTypeLabel =
      isEverything || typeFilter === "all"
        ? "ประวัติการจดคะแนนและรูปหลักฐานทั้งหมด"
        : typeFilter === "score"
        ? "ประวัติการจดคะแนนทั้งหมด"
        : "ประวัติและไฟล์รูปหลักฐานทั้งหมด";

    const ok = window.confirm(
      `ยืนยันล้างข้อมูล: ลบ${targetTypeLabel}ของ "${targetGroup}"?\n(การกระทำนี้ไม่สามารถย้อนกลับได้ — คะแนนปัจจุบันและบัญชีกลุ่มยังคงอยู่)`
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "all",
          userId: isEverything ? "all" : selectedUserId,
          type: isEverything ? "all" : typeFilter,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "ล้างประวัติไม่สำเร็จ");
      setSelectedKeys(new Set());
      setNotice("ล้างประวัติการใช้งานเรียบร้อยแล้ว");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ล้างประวัติไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const isFiltered = selectedUserId !== "all" || typeFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DDD2] bg-white/95 p-4 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">
            ประวัติการใช้งานแยกรายกลุ่ม{" "}
            <span className="text-old-rose">({filtered.length} รายการ)</span>
          </h2>
          <p className="text-xs text-[#555555]">
            เลือกดูประวัติการจดคะแนนและอัปโหลดรูป หรือเลือกติ๊กเพื่อล้างข้อมูลได้
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

      {/* Clear / Bulk Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E6DDD2] bg-white/95 px-4 py-2.5 shadow-xs">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#111111]">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            disabled={filtered.length === 0 || busy}
            onChange={toggleSelectAllFiltered}
            className="h-4 w-4 accent-[#B45A73]"
          />
          <span>
            เลือกทั้งหมดในรายการนี้ ({selectedKeys.size} ที่เลือกไว้)
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={selectedKeys.size === 0 || busy}
            onClick={handleClearSelected}
            className="rounded-xl border border-[#F2B8B5] bg-[#FFF5F5] px-3 py-1.5 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-45"
          >
            ล้างข้อมูลที่เลือก ({selectedKeys.size})
          </button>

          {isFiltered ? (
            <button
              type="button"
              disabled={filtered.length === 0 || busy}
              onClick={() => handleClearAll("filtered")}
              className="rounded-xl border border-[#F2B8B5] bg-white px-3 py-1.5 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-45"
            >
              ล้างข้อมูลตามที่กรอง ({filtered.length})
            </button>
          ) : null}

          <button
            type="button"
            disabled={activities.length === 0 || busy}
            onClick={() => handleClearAll("everything")}
            className="rounded-xl bg-[#DC2626] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? "กำลังล้างข้อมูล..." : "ล้างประวัติทั้งหมด"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="bg-old-rose-soft border-old-rose-soft text-old-rose rounded-xl border px-3 py-2 text-xs font-semibold">
          {notice}
        </div>
      ) : null}

      <div className="divide-y divide-[#EFE8DF] overflow-hidden rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#555555]">
            ไม่พบประวัติการใช้งานตามเงื่อนไขที่เลือก
          </div>
        ) : (
          filtered.map((a) => {
            const checked = selectedKeys.has(a.key);
            return (
              <div
                key={a.key}
                className={`flex items-center justify-between gap-3 px-4 py-3 text-xs transition ${
                  checked ? "bg-[#FDF7F9]" : ""
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={() => toggleOne(a.key)}
                    aria-label={`เลือก ${a.title}`}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#B45A73]"
                  />
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
            );
          })
        )}
      </div>
    </div>
  );
}
