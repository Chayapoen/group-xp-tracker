"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-[#E6DDD2] bg-white/95 p-6 shadow-md space-y-5">
        <div className="text-center space-y-1.5">
          <div className="brand-gradient mx-auto inline-flex h-12 items-center justify-center rounded-2xl px-4 text-white text-sm font-extrabold shadow-xs">
            ADMIN
          </div>
          <h1 className="text-xl font-extrabold text-[#111111]">เข้าสู่ระบบผู้ดูแล</h1>
          <p className="text-xs text-[#555555]">
            จัดการบัญชีชั่วคราว หมวดคะแนน และดูสรุปผลทุกกลุ่ม
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="admin-user" className="mb-1 block text-xs font-semibold text-[#111111]">
              Admin Username
            </label>
            <input
              id="admin-user"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2.5 text-sm text-[#111111] focus:border-[#C06C84] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="admin-pass" className="mb-1 block text-xs font-semibold text-[#111111]">
              Admin Password
            </label>
            <input
              id="admin-pass"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2.5 text-sm text-[#111111] focus:border-[#C06C84] focus:outline-none"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="brand-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-xs transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบผู้ดูแล"}
          </button>
        </form>

        <div className="border-t border-[#EFE8DF] pt-3 text-center">
          <Link href="/login" className="text-xs font-semibold text-old-rose hover:underline">
            ← กลับไปหน้าเข้าสู่ระบบผู้ใช้งาน
          </Link>
        </div>
      </div>
    </div>
  );
}
