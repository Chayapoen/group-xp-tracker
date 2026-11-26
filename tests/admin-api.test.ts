import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdminSession = vi.fn();
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    requireAdminSession: () => mockRequireAdminSession(),
  };
});

const mockUserInsertSingle = vi.fn();
const mockOverviewTables: Record<string, unknown[]> = {};

const mockFrom = vi.fn((table: string) => {
  if (table === "temp_users") {
    return {
      insert: () => ({
        select: () => ({
          single: mockUserInsertSingle,
        }),
      }),
      select: () => ({
        order: () => Promise.resolve({ data: mockOverviewTables.temp_users ?? [], error: null }),
      }),
    };
  }
  return {
    select: () => ({
      order: () => Promise.resolve({ data: mockOverviewTables[table] ?? [], error: null }),
    }),
  };
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

import { POST as createUser } from "@/app/api/admin/users/route";
import { GET as exportCsv } from "@/app/api/admin/export/route";

describe("Admin API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin requests with 401", async () => {
    mockRequireAdminSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "u1", password: "pw", groupName: "G1" }),
    });
    const res = await createUser(req);
    expect(res.status).toBe(401);
  });

  it("validates empty groupName with 400 and handles duplicate username with 409", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });

    const badReq = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "u1", password: "pw", groupName: "  " }),
    });
    const badRes = await createUser(badReq);
    expect(badRes.status).toBe(400);

    mockUserInsertSingle.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    const dupReq = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "dup_user", password: "pw", groupName: "กลุ่ม 1" }),
    });
    const dupRes = await createUser(dupReq);
    expect(dupRes.status).toBe(409);
  });

  it("exports UTF-8 BOM CSV with group XP totals", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    mockOverviewTables.temp_users = [
      { id: "u1", username: "team01", group_name: "กลุ่ม 1", is_active: true, created_at: "2026-11-26T00:00:00Z" },
    ];
    mockOverviewTables.score_categories = [
      { id: "c1", title: "หมวด 1", sort_order: 1, created_at: "" },
    ];
    mockOverviewTables.score_items = [
      { id: "i1", category_id: "c1", title: "ข้อ 1", xp: 150, sort_order: 1 },
    ];
    mockOverviewTables.user_scores = [
      { user_id: "u1", item_id: "i1", passed: true },
    ];

    const res = await exportCsv();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder("utf-8").decode(bytes);
    expect(text).toContain("กลุ่ม 1");
    expect(text).toContain("150");
  });
});
