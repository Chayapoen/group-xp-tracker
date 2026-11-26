"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("ระบบจดคะแนน");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.projectName) setProjectName(data.projectName);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }
      router.push("/");
      router.refresh();
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
          <div className="brand-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-white text-lg font-extrabold shadow-xs">
            XP
          </div>
          <h1 className="text-xl font-extrabold text-[#111111]">{projectName}</h1>
          <p className="text-xs text-[#555555]">
            เข้าสู่ระบบด้วย <span className="font-semibold text-old-rose">Username ชั่วคราว</span> ที่ผู้ดูแลกำหนดให้
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="username" className="mb-1 block text-xs font-semibold text-[#111111]">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอก Username"
              className="w-full rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#8A8A8A] focus:border-[#C06C84] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold text-[#111111]">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              className="w-full rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2.5 text-sm text-[#111111] placeholder:text-[#8A8A8A] focus:border-[#C06C84] focus:outline-none"
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
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <div className="border-t border-[#EFE8DF] pt-3 text-center">
          <Link href="/admin/login" className="text-xs font-semibold text-old-rose hover:underline">
            สำหรับผู้ดูแลระบบ (Admin Login) →
          </Link>
        </div>
      </div>
    </div>
  );
}
