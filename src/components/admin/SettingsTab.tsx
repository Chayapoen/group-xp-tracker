"use client";

import { useState } from "react";

interface SettingsTabProps {
  projectName: string;
  projectIconUrl: string | null;
  leaderboardVisible: boolean;
  onSaved: (settings: {
    projectName: string;
    leaderboardVisible: boolean;
  }) => void;
  onIconChanged: (iconUrl: string | null) => void;
}

const MAX_ICON_BYTES = 1024 * 1024;

function readImageDimensionsClient(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    };
    img.src = url;
  });
}

export function SettingsTab({
  projectName,
  projectIconUrl,
  leaderboardVisible,
  onSaved,
  onIconChanged,
}: SettingsTabProps) {
  const [name, setName] = useState(projectName);
  const [showLeaderboard, setShowLeaderboard] = useState(leaderboardVisible);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [iconBusy, setIconBusy] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [iconMsg, setIconMsg] = useState<string | null>(null);

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

  async function handleIconFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIconError(null);
    setIconMsg(null);

    if (file.size > MAX_ICON_BYTES) {
      setIconError("ขนาดไฟล์ไอคอนต้องไม่เกิน 1 MB");
      return;
    }

    try {
      const dims = await readImageDimensionsClient(file);
      if (dims.width <= 0 || dims.height <= 0 || dims.width !== dims.height) {
        setIconError(
          `รูปที่เลือกมีขนาด ${dims.width}×${dims.height} px — กรุณาเลือกรูปอัตราส่วน 1:1 (กว้างเท่ากับยาว)`
        );
        return;
      }
    } catch (err) {
      setIconError(err instanceof Error ? err.message : "ไม่สามารถอ่านรูปภาพได้");
      return;
    }

    setIconBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/settings/icon", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "อัปโหลดไอคอนไม่สำเร็จ");
      }
      onIconChanged(data.projectIconUrl ?? null);
      setIconMsg("อัปเดตไอคอนโปรเจกต์เรียบร้อยแล้ว");
    } catch (err) {
      setIconError(err instanceof Error ? err.message : "อัปโหลดไอคอนไม่สำเร็จ");
    } finally {
      setIconBusy(false);
    }
  }

  async function handleResetIcon() {
    if (!window.confirm("ต้องการลบไอคอนและกลับไปใช้ไอคอน XP เริ่มต้นใช่หรือไม่?")) return;
    setIconError(null);
    setIconMsg(null);
    setIconBusy(true);
    try {
      const res = await fetch("/api/admin/settings/icon", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "รีเซ็ตไอคอนไม่สำเร็จ");
      onIconChanged(null);
      setIconMsg("กลับไปใช้ไอคอนเริ่มต้นเรียบร้อยแล้ว");
    } catch (err) {
      setIconError(err instanceof Error ? err.message : "รีเซ็ตไอคอนไม่สำเร็จ");
    } finally {
      setIconBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      {/* Project Icon 1:1 Card */}
      <section className="space-y-3 rounded-2xl border border-[#E6DDD2] bg-white/95 p-5 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">
            ไอคอนของงาน (แสดงมุมซ้ายบนของทุกหน้า)
          </h2>
          <p className="mt-0.5 text-xs text-[#555555]">
            รองรับไฟล์ PNG, JPEG, WebP, GIF อัตราส่วน <strong className="text-old-rose">1:1</strong> ขนาดไม่เกิน <strong className="text-old-rose">1 MB</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {projectIconUrl ? (
            <img
              src={projectIconUrl}
              alt="ไอคอนโปรเจกต์"
              className="h-16 w-16 shrink-0 rounded-2xl border border-[#E6DDD2] object-cover shadow-xs"
            />
          ) : (
            <div className="brand-gradient flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white shadow-xs">
              XP
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`brand-gradient cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-95 ${
                iconBusy ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {iconBusy ? "กำลังอัปโหลด..." : "เลือกรูปไอคอน (1:1)"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleIconFileChange}
                disabled={iconBusy}
              />
            </label>
            {projectIconUrl ? (
              <button
                type="button"
                disabled={iconBusy}
                onClick={handleResetIcon}
                className="rounded-xl border border-[#F2C6C6] bg-[#FFF5F5] px-3 py-2 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:opacity-60"
              >
                ใช้ไอคอนเริ่มต้น
              </button>
            ) : null}
          </div>
        </div>

        {iconError ? (
          <div className="rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
            {iconError}
          </div>
        ) : null}
        {iconMsg ? (
          <div className="text-old-rose text-xs font-semibold">{iconMsg}</div>
        ) : null}
      </section>

      {/* Project Name & Leaderboard Visibility Form */}
      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-[#E6DDD2] bg-white/95 p-5 shadow-xs"
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

        {message ? (
          <div className="text-old-rose text-xs font-semibold">{message}</div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="brand-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </form>
    </div>
  );
}
