import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireUserSession = vi.fn();
const mockRequireAdminSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireUserSession: () => mockRequireUserSession(),
  requireAdminSession: () => mockRequireAdminSession(),
}));

const mockTables: Record<string, { data: unknown; error: unknown }> = {};

const mockFrom = vi.fn((table: string) => {
  if (table === "app_settings") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve(
              mockTables.app_settings ?? {
                data: { project_name: "Test", leaderboard_visible: true },
                error: null,
              }
            ),
        }),
      }),
    };
  }
  return {
    select: () => ({
      order: () =>
        Promise.resolve(mockTables[table] ?? { data: [], error: null }),
      eq: () => Promise.resolve(mockTables[table] ?? { data: [], error: null }),
    }),
  };
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

import { GET as getLeaderboard } from "@/app/api/leaderboard/route";

describe("Leaderboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(mockTables)) delete mockTables[k];
  });

  it("blocks user with 403 when leaderboard_visible is false", async () => {
    mockRequireUserSession.mockResolvedValue({
      role: "user",
      userId: "u1",
      username: "team01",
      groupName: "กลุ่ม 1",
    });
    mockRequireAdminSession.mockResolvedValue(null);
    mockTables.app_settings = {
      data: { project_name: "Camp", leaderboard_visible: false },
      error: null,
    };

    const res = await getLeaderboard();
    expect(res.status).toBe(403);
  });

  it("returns sorted team rankings for user when leaderboard_visible is true", async () => {
    mockRequireUserSession.mockResolvedValue({
      role: "user",
      userId: "u1",
      username: "team01",
      groupName: "กลุ่ม 1",
    });
    mockRequireAdminSession.mockResolvedValue(null);
    mockTables.app_settings = {
      data: { project_name: "Camp", leaderboard_visible: true },
      error: null,
    };
    mockTables.temp_users = {
      data: [
        { id: "u1", username: "team01", group_name: "กลุ่ม 1", is_active: true },
        { id: "u2", username: "team02", group_name: "กลุ่ม 2", is_active: true },
      ],
      error: null,
    };
    mockTables.score_categories = {
      data: [{ id: "c1", title: "หมวด 1", sort_order: 1, is_open: true, created_at: "" }],
      error: null,
    };
    mockTables.score_items = {
      data: [{ id: "i1", category_id: "c1", title: "ข้อ 1", xp: 200, sort_order: 1 }],
      error: null,
    };
    mockTables.user_scores = {
      data: [{ user_id: "u2", item_id: "i1", passed: true }],
      error: null,
    };

    const res = await getLeaderboard();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rankings[0].groupName).toBe("กลุ่ม 2");
    expect(body.rankings[0].totalXp).toBe(200);
    expect(body.rankings[1].groupName).toBe("กลุ่ม 1");
    expect(body.rankings[1].totalXp).toBe(0);
    expect(body.rankings[1].isCurrentUser).toBe(true);
  });

  it("allows admin to view leaderboard even when hidden from users", async () => {
    mockRequireUserSession.mockResolvedValue(null);
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    mockTables.app_settings = {
      data: { project_name: "Camp", leaderboard_visible: false },
      error: null,
    };

    const res = await getLeaderboard();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leaderboardVisible).toBe(false);
  });
});
