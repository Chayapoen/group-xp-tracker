"use client";

import Link from "next/link";

interface NavTabsProps {
  active: "scoring" | "photos" | "history" | "leaderboard";
  photosCount?: number;
  historyCount?: number;
  leaderboardVisible?: boolean;
}

export function NavTabs({
  active,
  photosCount,
  historyCount,
  leaderboardVisible = true,
}: NavTabsProps) {
  const tabs: {
    id: "scoring" | "photos" | "history" | "leaderboard";
    href: string;
    label: string;
    count?: number;
  }[] = [
    { id: "scoring", href: "/", label: "จดคะแนน" },
    { id: "photos", href: "/photos", label: "ถ่ายรูปหลักฐาน", count: photosCount },
    { id: "history", href: "/history", label: "ประวัติคะแนน", count: historyCount },
  ];

  if (leaderboardVisible) {
    tabs.push({ id: "leaderboard", href: "/leaderboard", label: "อันดับคะแนน" });
  }

  return (
    <nav className="border-b border-[#EAE1D7] bg-white/80">
      <div className="mx-auto flex max-w-4xl flex-wrap gap-1 px-4 pt-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                isActive
                  ? "border-[#C06C84] text-old-rose"
                  : "border-transparent text-[#555555] hover:text-[#111111]"
              }`}
            >
              {tab.label}
              {tab.count !== undefined ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-xs ${
                    isActive
                      ? "bg-old-rose-soft text-old-rose"
                      : "bg-[#F3EFE9] text-[#555555]"
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
