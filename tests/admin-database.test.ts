import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdminSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAdminSession: () => mockRequireAdminSession(),
}));

const mockSelectData = vi.fn();
const mockDeleteEq = vi.fn();
const mockStorageRemove = vi.fn();

const mockFrom = vi.fn(() => ({
  select: () => ({
    order: () => mockSelectData(),
    eq: () => ({
      maybeSingle: () => Promise.resolve({ data: { storage_path: "u1/pic.jpg" }, error: null }),
    }),
  }),
  delete: () => ({
    eq: mockDeleteEq,
  }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: () => ({ remove: mockStorageRemove }),
    },
  })),
}));

import { GET as getDbTable, DELETE as deleteDbRow } from "@/app/api/admin/database/route";

describe("Admin Database Manager API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin with 401 and invalid table name with 400", async () => {
    mockRequireAdminSession.mockResolvedValue(null);
    const res401 = await getDbTable(
      new Request("http://localhost/api/admin/database?table=temp_users")
    );
    expect(res401.status).toBe(401);

    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    const res400 = await getDbTable(
      new Request("http://localhost/api/admin/database?table=pg_shadow")
    );
    expect(res400.status).toBe(400);
  });

  it("never exposes password_hash when reading temp_users and exports BOM CSV", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    mockSelectData.mockResolvedValue({
      data: [
        {
          id: "u1",
          username: "=evil",
          group_name: "กลุ่ม 1",
          is_active: true,
          created_at: "2026-11-26T00:00:00Z",
        },
      ],
      error: null,
    });

    const jsonRes = await getDbTable(
      new Request("http://localhost/api/admin/database?table=temp_users")
    );
    expect(jsonRes.status).toBe(200);
    const body = await jsonRes.json();
    expect(body.columns).not.toContain("password_hash");
    expect(body.rows[0].username).toBe("=evil");

    const csvRes = await getDbTable(
      new Request("http://localhost/api/admin/database?table=temp_users&format=csv")
    );
    expect(csvRes.status).toBe(200);
    const bytes = new Uint8Array(await csvRes.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const csvText = new TextDecoder("utf-8").decode(bytes);
    expect(csvText).toContain("'=evil");
  });

  it("deletes allowed row and cleans storage for evidence_photos", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    mockDeleteEq.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/admin/database", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "evidence_photos", id: "p-1" }),
    });
    const res = await deleteDbRow(req);
    expect(res.status).toBe(200);
    expect(mockStorageRemove).toHaveBeenCalledWith(["u1/pic.jpg"]);
  });
});
