import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireUserSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireUserSession: () => mockRequireUserSession(),
}));

const mockUpsert = vi.fn();
const mockInsert = vi.fn();
const mockItemSingle = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === "score_items") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: mockItemSingle,
        }),
      }),
    };
  }
  if (table === "user_scores") {
    return { upsert: mockUpsert };
  }
  if (table === "score_history") {
    return { insert: mockInsert };
  }
  return {};
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

import { calculateCategorySummaries, calculateTotalXp } from "@/lib/scoring";
import { POST as toggleScore } from "@/app/api/scores/toggle/route";

describe("Scoring calculations & toggle API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates category earned XP, max XP, and total XP matching spec example", () => {
    const categories = [
      { id: "c1", title: "คะแนนหมวด 1", sort_order: 1, created_at: "" },
      { id: "c2", title: "คะแนนหมวด 2", sort_order: 2, created_at: "" },
    ];
    const items = [
      { id: "i1", category_id: "c1", title: "สำเร็จข้อ 1", xp: 150, sort_order: 1 },
      { id: "i2", category_id: "c1", title: "สำเร็จข้อ 2", xp: 150, sort_order: 2 },
      { id: "i3", category_id: "c2", title: "สำเร็จข้อ 1", xp: 200, sort_order: 1 },
      { id: "i4", category_id: "c2", title: "สำเร็จข้อ 2", xp: 200, sort_order: 2 },
    ];
    const userScores = [
      { user_id: "u1", item_id: "i1", passed: true },
      { user_id: "u1", item_id: "i2", passed: false },
      { user_id: "u1", item_id: "i3", passed: true },
      { user_id: "u1", item_id: "i4", passed: true },
    ];

    const summaries = calculateCategorySummaries(categories, items, userScores);
    expect(summaries[0].earnedXp).toBe(150);
    expect(summaries[0].maxXp).toBe(300);
    expect(summaries[1].earnedXp).toBe(400);
    expect(summaries[1].maxXp).toBe(400);
    expect(calculateTotalXp(summaries)).toBe(550);
  });

  it("rejects unauthenticated toggle requests with 401", async () => {
    mockRequireUserSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/scores/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: "i1", passed: true }),
    });
    const res = await toggleScore(req);
    expect(res.status).toBe(401);
  });

  it("upserts user_scores and appends immutable snapshot to score_history", async () => {
    mockRequireUserSession.mockResolvedValue({
      role: "user",
      userId: "u1",
      username: "team01",
      groupName: "กลุ่ม 1",
    });
    mockItemSingle.mockResolvedValue({
      data: {
        id: "i1",
        title: "สำเร็จข้อ 1",
        xp: 150,
        score_categories: { title: "คะแนนหมวด 1" },
      },
      error: null,
    });
    mockUpsert.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/scores/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: "i1", passed: true }),
    });
    const res = await toggleScore(req);
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", item_id: "i1", passed: true }),
      { onConflict: "user_id,item_id" }
    );
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        item_id: "i1",
        category_title: "คะแนนหมวด 1",
        item_title: "สำเร็จข้อ 1",
        xp: 150,
        passed: true,
        changed_by: "team01",
      })
    );
  });
});
