"use client";

import { useState } from "react";

interface SettingsTabProps {
  projectName: string;
  onSaved: (name: string) => void;
}

export function SettingsTab({ projectName, onSaved }: SettingsTabProps) {
  const [name, setName] = useState(projectName);
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
        body: JSON.stringify({ projectName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      onSaved(data.projectName);
      setMessage("บันทึกชื่อโปรเจกต์เรียบร้อยแล้ว");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="max-w-md space-y-3 rounded-2xl border border-[#E6DDD2] bg-white/95 p-5 shadow-xs"
    >
      <h2 className="text-sm font-bold text-[#111111]">
        ตั้งค่าชื่อโปรเจกต์ (แสดงมุมซ้ายบนของทุกหน้า)
      </h2>
      <input
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2 text-sm text-[#111111] focus:border-[#C06C84] focus:outline-none"
      />
      {message ? <div className="text-old-rose text-xs font-semibold">{message}</div> : null}
      <button
        type="submit"
        disabled={saving}
        className="brand-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs disabled:opacity-60"
      >
        {saving ? "กำลังบันทึก..." : "บันทึกชื่อโปรเจกต์"}
      </button>
    </form>
  );
}
