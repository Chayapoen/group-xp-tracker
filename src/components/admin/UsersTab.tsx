"use client";

import { useState } from "react";

export interface AdminUserItem {
  id: string;
  username: string;
  group_name: string;
  is_active: boolean;
  created_at: string;
}

interface UsersTabProps {
  users: AdminUserItem[];
  onRefresh: () => Promise<void>;
}

export function UsersTab({ users, onRefresh }: UsersTabProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editPassword, setEditPassword] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, groupName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "สร้างบัญชีไม่สำเร็จ");
      setUsername("");
      setPassword("");
      setGroupName("");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างบัญชีไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(u: AdminUserItem) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.is_active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "เปลี่ยนสถานะไม่สำเร็จ");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปลี่ยนสถานะไม่สำเร็จ");
    }
  }

  async function handleSaveEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName: editGroupName,
          ...(editPassword.trim() ? { password: editPassword } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setEditingId(null);
      setEditPassword("");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    }
  }

  async function handleDelete(u: AdminUserItem) {
    if (!window.confirm(`ต้องการลบบัญชี "${u.username}" (${u.group_name}) ใช่หรือไม่?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "ลบผู้ใช้ไม่สำเร็จ");
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบผู้ใช้ไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-2xl border border-[#E6DDD2] bg-white/95 p-4 shadow-xs"
      >
        <h2 className="text-sm font-bold text-[#111111]">
          สร้างบัญชีชั่วคราวใหม่ (1 User = 1 กลุ่ม)
        </h2>
        {error ? (
          <div className="rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
            {error}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="text"
            required
            placeholder="Username (เช่น team01)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2 text-sm text-[#111111] focus:border-[#C06C84] focus:outline-none"
          />
          <input
            type="text"
            required
            placeholder="รหัสผ่านชั่วคราว"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2 text-sm text-[#111111] focus:border-[#C06C84] focus:outline-none"
          />
          <input
            type="text"
            required
            placeholder="ชื่อกลุ่ม (เช่น กลุ่ม 1 พยัคฆ์สายฟ้า)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2 text-sm text-[#111111] focus:border-[#C06C84] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="brand-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-95 disabled:opacity-60"
        >
          {busy ? "กำลังสร้าง..." : "+ เพิ่มบัญชีชั่วคราว"}
        </button>
      </form>

      <div className="divide-y divide-[#F1ECE6] overflow-hidden rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs">
        {users.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#555555]">
            ยังไม่มีบัญชีผู้ใช้ชั่วคราว
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                {editingId === u.id ? (
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="ชื่อกลุ่ม"
                      className="rounded-lg border border-[#C06C84] px-2.5 py-1 text-xs text-[#111111]"
                    />
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)"
                      className="rounded-lg border border-[#DFD5C9] px-2.5 py-1 text-xs text-[#111111]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(u.id)}
                      className="brand-gradient rounded-lg px-3 py-1 text-xs font-semibold text-white"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-[#555555] hover:underline"
                    >
                      ยกเลิก
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-bold text-[#111111]">{u.group_name}</div>
                    <div className="text-old-rose font-mono text-xs">
                      username: {u.username}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(u)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    u.is_active
                      ? "bg-[#E8FCEF] text-[#15803D]"
                      : "bg-[#F3F4F6] text-[#6B7280]"
                  }`}
                >
                  {u.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(u.id);
                    setEditGroupName(u.group_name);
                    setEditPassword("");
                  }}
                  className="text-old-rose text-xs font-semibold hover:underline"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(u)}
                  className="text-xs font-medium text-[#B91C1C] hover:underline"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
