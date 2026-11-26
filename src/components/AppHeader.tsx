"use client";

import { useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "saving" | "error";

interface AppHeaderProps {
  projectName: string;
  projectIconUrl?: string | null;
  saveStatus: SaveStatus;
  username: string;
  groupName: string;
}

const AVATAR_STYLES = [
  "bg-[#FDF2F5] text-[#B45A73] border-[#E7BAC7]",
  "bg-[#FFF3E0] text-[#C25E00] border-[#F6C89F]",
  "bg-[#E8FCEF] text-[#15803D] border-[#9AE6B4]",
  "bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]",
  "bg-[#FCE7F3] text-[#9D174D] border-[#F9A8D4]",
  "bg-[#ECFCCB] text-[#3F6212] border-[#BEF264]",
];

function getUserAvatarInfo(username: string) {
  const firstChar = Array.from(username.trim())[0]?.toUpperCase() || "?";
  const code = firstChar.codePointAt(0) ?? 0;
  const style = AVATAR_STYLES[code % AVATAR_STYLES.length];
  return { firstChar, style };
}

export function AppHeader({
  projectName,
  projectIconUrl,
  saveStatus,
  username,
  groupName,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const avatar = getUserAvatarInfo(username);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#EAE1D7] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
        {/* Top-Left: Project Icon + Name */}
        <div className="flex min-w-0 items-center gap-2">
          {projectIconUrl ? (
            <img
              src={projectIconUrl}
              alt={projectName}
              className="h-8 w-8 shrink-0 rounded-lg border border-[#E6DDD2] object-cover shadow-2xs"
            />
          ) : (
            <div className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-xs">
              XP
            </div>
          )}
          <span className="truncate text-sm font-bold text-[#111111]">
            {projectName}
          </span>
        </div>

        {/* Top-Right: Save Status right before User Initial Icon */}
        <div ref={menuContainerRef} className="relative flex shrink-0 items-center gap-2">
          {saveStatus === "saving" ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F5C596] bg-[#FFF4E6] px-2.5 py-1 text-xs font-semibold text-[#B45309]">
              <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-[#F59E0B]" />
              <span>กำลังบันทึก...</span>
            </div>
          ) : saveStatus === "error" ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#F2B8B5] bg-[#FEF2F2] px-2.5 py-1 text-xs font-semibold text-[#B91C1C]">
              <span>✕</span>
              <span>บันทึกไม่สำเร็จ</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#A7E3BE] bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold text-[#166534]">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.42 0l-3.2-3.2a1 1 0 111.42-1.42l2.49 2.49 6.49-6.49a1 1 0 011.42 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>บันทึกแล้ว</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex cursor-pointer items-center gap-2 rounded-full border border-[#E5DDD3] bg-[#FFFDFB] p-1 text-xs transition hover:border-[#C06C84] sm:pr-2.5"
            aria-label="ข้อมูลผู้ใช้งาน"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-extrabold ${avatar.style}`}
            >
              {avatar.firstChar}
            </span>
            <span className="hidden font-semibold text-[#111111] sm:inline">
              {username}
            </span>
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-[#E5DDD3] bg-white p-3 shadow-lg"
            >
              <div className="mb-2.5 border-b border-[#EFE8DF] pb-2.5">
                <div className="text-xs text-[#666666]">เข้าสู่ระบบในชื่อ</div>
                <div className="text-sm font-bold text-[#111111]">{username}</div>
                <div className="text-old-rose mt-0.5 text-xs font-semibold">
                  {groupName}
                </div>
              </div>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="w-full cursor-pointer rounded-lg border border-[#F2C6C6] bg-[#FFF5F5] px-3 py-1.5 text-xs font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2] disabled:opacity-60"
              >
                {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
