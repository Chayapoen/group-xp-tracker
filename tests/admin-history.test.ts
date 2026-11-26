import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdminSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAdminSession: () => mockRequireAdminSession(),
}));

const mockScoreDeleteIn = vi.fn();
const mockScoreDeleteEq = vi.fn();
const mockScoreDeleteNot = vi.fn();
const mockPhotoSelectIn = vi.fn();
const mockPhotoSelectNot = vi.fn();
const mockPhotoDeleteIn = vi.fn();
const mockPhotoDeleteNot = vi.fn();
const mockStorageRemove = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === "score_history") {
    return {
      delete: () => ({
        in: mockScoreDeleteIn,
        eq: mockScoreDeleteEq,
        not: mockScoreDeleteNot,
      }),
    };
  }
  if (table === "evidence_photos") {
    return {
      select: () => ({
        in: mockPhotoSelectIn,
        eq: mockPhotoSelectIn,
        not: mockPhotoSelectNot,
      }),
      delete: () => ({
        in: mockPhotoDeleteIn,
        eq: mockPhotoDeleteIn,
        not: mockPhotoDeleteNot,
      }),
    };
  }
  return {};
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: () => ({ remove: mockStorageRemove }),
    },
  })),
}));

import { DELETE as clearHistory } from "@/app/api/admin/history/route";

describe("Admin History Clear API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin with 401 and empty selection with 400", async () => {
    mockRequireAdminSession.mockResolvedValue(null);
    const res401 = await clearHistory(
      new Request("http://localhost/api/admin/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all" }),
      })
    );
    expect(res401.status).toBe(401);

    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    const res400 = await clearHistory(
      new Request("http://localhost/api/admin/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "selected", scoreIds: [], photoIds: [] }),
      })
    );
    expect(res400.status).toBe(400);
  });

  it("deletes selected score history and photo records (including Storage cleanup)", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    mockScoreDeleteIn.mockResolvedValue({ error: null });
    mockPhotoSelectIn.mockResolvedValue({
      data: [{ storage_path: "u1/pic1.jpg" }],
      error: null,
    });
    mockPhotoDeleteIn.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });

    const res = await clearHistory(
      new Request("http://localhost/api/admin/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "selected",
          scoreIds: ["h1", "h2"],
          photoIds: ["p1"],
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockScoreDeleteIn).toHaveBeenCalledWith("id", ["h1", "h2"]);
    expect(mockPhotoDeleteIn).toHaveBeenCalledWith("id", ["p1"]);
    expect(mockStorageRemove).toHaveBeenCalledWith(["u1/pic1.jpg"]);
  });

  it("clears all score history and photo history when mode is all", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    mockScoreDeleteNot.mockResolvedValue({ error: null });
    mockPhotoSelectNot.mockResolvedValue({
      data: [{ storage_path: "u1/a.jpg" }, { storage_path: "u2/b.png" }],
      error: null,
    });
    mockPhotoDeleteNot.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });

    const res = await clearHistory(
      new Request("http://localhost/api/admin/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all", type: "all" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockScoreDeleteNot).toHaveBeenCalledWith("id", "is", null);
    expect(mockPhotoDeleteNot).toHaveBeenCalledWith("id", "is", null);
    expect(mockStorageRemove).toHaveBeenCalledWith(["u1/a.jpg", "u2/b.png"]);
  });
});
