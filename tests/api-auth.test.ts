import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword } from "@/lib/auth";

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

import { POST as userLogin } from "@/app/api/auth/login/route";
import { POST as adminLogin } from "@/app/api/auth/admin-login/route";

describe("Auth API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "test-secret-key-at-least-32-characters-long";
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "admin-pass-123";
  });

  it("logs in an active temp user and sets session cookie", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        username: "team01",
        password_hash: hashPassword("pass123"),
        group_name: "กลุ่ม 1",
        is_active: true,
      },
      error: null,
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "team01", password: "pass123" }),
    });
    const res = await userLogin(req);
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("gxp_session=");
    const body = await res.json();
    expect(body.user.groupName).toBe("กลุ่ม 1");
  });

  it("returns 403 when user is deactivated", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "user-2",
        username: "team02",
        password_hash: hashPassword("pass123"),
        group_name: "กลุ่ม 2",
        is_active: false,
      },
      error: null,
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "team02", password: "pass123" }),
    });
    const res = await userLogin(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 for wrong password", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        username: "team01",
        password_hash: hashPassword("pass123"),
        group_name: "กลุ่ม 1",
        is_active: true,
      },
      error: null,
    });

    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "team01", password: "wrong" }),
    });
    const res = await userLogin(req);
    expect(res.status).toBe(401);
  });

  it("logs in admin and sets session cookie", async () => {
    const req = new Request("http://localhost/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin-pass-123" }),
    });
    const res = await adminLogin(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("gxp_session=");
  });
});
