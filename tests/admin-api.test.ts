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
const mockStorageRemove = vi.fn();
const mockUserDeleteEq = vi.fn();
const mockOverviewTables: Record<string, { data: unknown[]; error: unknown }> = {};

const mockFrom = vi.fn((table: string) => {
  if (table === "temp_users") {
    return {
      insert: () => ({
        select: () => ({
          single: mockUserInsertSingle,
        }),
      }),
      delete: () => ({
        eq: mockUserDeleteEq,
      }),
      select: () => ({
        order: () =>
          Promise.resolve(mockOverviewTables.temp_users ?? { data: [], error: null }),
      }),
    };
  }
  if (table === "evidence_photos") {
    return {
      select: () => ({
        eq: () =>
          Promise.resolve(mockOverviewTables.evidence_photos ?? { data: [], error: null }),
      }),
    };
  }
  return {
    select: () => ({
      order: () =>
        Promise.resolve(mockOverviewTables[table] ?? { data: [], error: null }),
    }),
  };
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: () => ({
        remove: mockStorageRemove,
      }),
    },
  })),
}));

import { POST as createUser } from "@/app/api/admin/users/route";
import { DELETE as deleteUser } from "@/app/api/admin/users/[id]/route";
import { GET as exportCsv } from "@/app/api/admin/export/route";

describe("Admin API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(mockOverviewTables)) delete mockOverviewTables[k];
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

  it("exports UTF-8 BOM CSV with formula injection neutralized and returns 500 on DB error", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    mockOverviewTables.temp_users = {
      data: [
        {
          id: "u1",
          username: "=HYPERLINK(\"http://evil\")",
          group_name: "+กลุ่ม 1",
          is_active: true,
          created_at: "2026-11-26T00:00:00Z",
        },
      ],
      error: null,
    };
    mockOverviewTables.score_categories = {
      data: [{ id: "c1", title: "หมวด 1", sort_order: 1, created_at: "" }],
      error: null,
    };
    mockOverviewTables.score_items = {
      data: [{ id: "i1", category_id: "c1", title: "ข้อ 1", xp: 150, sort_order: 1 }],
      error: null,
    };
    mockOverviewTables.user_scores = {
      data: [{ user_id: "u1", item_id: "i1", passed: true }],
      error: null,
    };

    const res = await exportCsv();
    expect(res.status).toBe(200);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder("utf-8").decode(bytes);
    expect(text).toContain("'+กลุ่ม 1");
    expect(text).toContain("\"'=HYPERLINK");
    expect(text).toContain("150");

    // DB error must return 500 instead of silent 0 XP CSV
    mockOverviewTables.user_scores = { data: [], error: { message: "db outage" } };
    const errRes = await exportCsv();
    expect(errRes.status).toBe(500);
  });

  it("cleans up user's storage objects when deleting a temp user", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    mockOverviewTables.evidence_photos = {
      data: [{ storage_path: "u1/a.jpg" }, { storage_path: "u1/b.png" }],
      error: null,
    };
    mockUserDeleteEq.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/admin/users/u1", { method: "DELETE" });
    const res = await deleteUser(req, { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(200);
    expect(mockStorageRemove).toHaveBeenCalledWith(["u1/a.jpg", "u1/b.png"]);
  });
});
