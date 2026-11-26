"use client";

import { useState } from "react";

interface SettingsTabProps {
  projectName: string;
  leaderboardVisible: boolean;
  onSaved: (settings: { projectName: string; leaderboardVisible: boolean }) => void;
}

export function SettingsTab({
  projectName,
  leaderboardVisible,
  onSaved,
}: SettingsTabProps) {
  const [name, setName] = useState(projectName);
  const [showLeaderboard, setShowLeaderboard] = useState(leaderboardVisible);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: name.trim(),
          leaderboardVisible: showLeaderboard,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      onSaved({
        projectName: data.projectName,
        leaderboardVisible: data.leaderboardVisible !== false,
      });
      setMessage("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="max-w-lg space-y-4 rounded-2xl border border-[#E6DDD2] bg-white/95 p-5 shadow-xs"
    >
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-[#111111]">
          ชื่อโปรเจกต์ (แสดงมุมซ้ายบนของทุกหน้า)
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2 text-sm text-[#111111] focus:border-[#C06C84] focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#EFE8DF] bg-[#FFFDFB] p-3.5">
        <div>
          <div className="text-sm font-bold text-[#111111]">
            เปิดให้ User เห็นหน้า &ldquo;อันดับคะแนน&rdquo;
          </div>
          <p className="text-xs text-[#555555]">
            หากปิดไว้ เมนูอันดับคะแนนจะถูกซ่อนจากผู้ใช้งานชั่วคราว
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowLeaderboard((prev) => !prev)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            showLeaderboard
              ? "bg-[#E8FCEF] text-[#15803D]"
              : "bg-[#F3F4F6] text-[#6B7280]"
          }`}
        >
          {showLeaderboard ? "เปิดแสดง" : "ซ่อนไว้"}
        </button>
      </div>

      {message ? <div className="text-old-rose text-xs font-semibold">{message}</div> : null}

      <button
        type="submit"
        disabled={saving}
        className="brand-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs disabled:opacity-60"
      >
        {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
      </button>
    </form>
  );
}
