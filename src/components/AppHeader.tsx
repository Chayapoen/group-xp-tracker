"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SaveStatus = "saved" | "saving" | "error";

interface AppHeaderProps {
  projectName: string;
  saveStatus: SaveStatus;
  username: string;
  groupName: string;
}

export function AppHeader({
  projectName,
  saveStatus,
  username,
  groupName,
}: AppHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#EAE1D7] bg-white/90 backdrop-blur">
      <div className="mx-auto grid max-w-4xl grid-cols-3 items-center gap-2 px-4 py-3">
        {/* Top-Left: Project Name */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs">
            XP
          </div>
          <span className="truncate text-sm font-bold text-[#111111]">
            {projectName}
          </span>
        </div>

        {/* Top-Center: Save Status */}
        <div className="flex justify-center">
          {saveStatus === "saving" ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F5C596] bg-[#FFF4E6] px-3 py-1 text-xs font-semibold text-[#B45309]">
              <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-[#F59E0B]" />
              กำลังบันทึก...
            </div>
          ) : saveStatus === "error" ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F2B8B5] bg-[#FEF2F2] px-3 py-1 text-xs font-semibold text-[#B91C1C]">
              <span>✕</span> บันทึกไม่สำเร็จ
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#A7E3BE] bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#166534]">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 111.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z"
                  clipRule="evenodd"
                />
              </svg>
              บันทึกแล้ว
            </div>
          )}
        </div>

        {/* Top-Right: User Icon */}
        <div className="relative flex justify-end">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-[#E5DDD3] bg-[#FFFDFB] p-1 pr-2.5 text-xs transition hover:border-[#C06C84]"
            aria-label="ข้อมูลผู้ใช้งาน"
          >
            <span className="bg-old-rose-soft text-old-rose flex h-7 w-7 items-center justify-center rounded-full">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="hidden font-semibold text-[#111111] sm:inline">
              {username}
            </span>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-12 z-40 w-60 rounded-xl border border-[#E5DDD3] bg-white p-3 shadow-lg">
              <div className="mb-2.5 border-b border-[#EFE8DF] pb-2.5">
                <div className="text-xs text-[#666666]">เข้าสู่ระบบในชื่อ</div>
                <div className="text-sm font-bold text-[#111111]">{username}</div>
                <div className="text-old-rose mt-0.5 text-xs font-semibold">
                  {groupName}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-lg border border-[#F2C6C6] bg-[#FFF5F5] px-3 py-1.5 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2]"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
