import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
  })),
}));

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({ from: mockFrom })),
}));

import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  verifyAdminCredentials,
  requireUserSession,
  requireAdminSession,
} from "@/lib/auth";

describe("Auth helpers", () => {
  const origSecret = process.env.SESSION_SECRET;
  const origAdminUser = process.env.ADMIN_USERNAME;
  const origAdminPass = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "test-secret-key-at-least-32-characters-long";
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "super-secret-password";
  });

  afterEach(() => {
    process.env.SESSION_SECRET = origSecret;
    process.env.ADMIN_USERNAME = origAdminUser;
    process.env.ADMIN_PASSWORD = origAdminPass;
  });

  it("hashes and verifies passwords with scrypt", () => {
    const hash = hashPassword("myPass123!");
    expect(hash).toContain(":");
    expect(verifyPassword("myPass123!", hash)).toBe(true);
    expect(verifyPassword("wrongPass", hash)).toBe(false);
    expect(verifyPassword("myPass123!", "malformed-hash")).toBe(false);
  });

  it("signs and verifies HMAC session tokens, rejecting tampered or expired tokens", () => {
    const token = signSessionToken({
      role: "user",
      userId: "u-1",
      username: "team01",
      groupName: "กลุ่ม 1",
    });
    const decoded = verifySessionToken(token);
    expect(decoded?.role).toBe("user");
    expect(decoded?.userId).toBe("u-1");

    // Tampered token
    const [body, sig] = token.split(".");
    const tampered = `${body}.${sig.slice(0, -2)}aa`;
    expect(verifySessionToken(tampered)).toBeNull();

    // Expired token
    const expired = signSessionToken(
      { role: "admin", username: "admin" },
      -10
    );
    expect(verifySessionToken(expired)).toBeNull();
  });

  it("verifies admin credentials safely", () => {
    expect(verifyAdminCredentials("admin", "super-secret-password")).toBe(true);
    expect(verifyAdminCredentials("admin", "wrong")).toBe(false);
    expect(verifyAdminCredentials("other", "super-secret-password")).toBe(false);
  });

  it("requireUserSession rejects deactivated users even with a valid cookie", async () => {
    const token = signSessionToken({
      role: "user",
      userId: "u-1",
      username: "team01",
      groupName: "กลุ่ม 1",
    });
    mockCookieGet.mockReturnValue({ value: token });
    mockMaybeSingle.mockResolvedValue({
      data: { id: "u-1", username: "team01", group_name: "กลุ่ม 1", is_active: false },
      error: null,
    });

    const session = await requireUserSession();
    expect(session).toBeNull();
  });

  it("requireUserSession returns live group info when user is active", async () => {
    const token = signSessionToken({
      role: "user",
      userId: "u-1",
      username: "team01",
      groupName: "กลุ่มเดิม",
    });
    mockCookieGet.mockReturnValue({ value: token });
    mockMaybeSingle.mockResolvedValue({
      data: { id: "u-1", username: "team01", group_name: "กลุ่มใหม่", is_active: true },
      error: null,
    });

    const session = await requireUserSession();
    expect(session).toEqual({
      role: "user",
      userId: "u-1",
      username: "team01",
      groupName: "กลุ่มใหม่",
    });
  });

  it("requireAdminSession returns admin session only for admin role cookie", async () => {
    const adminToken = signSessionToken({ role: "admin", username: "admin" });
    mockCookieGet.mockReturnValue({ value: adminToken });
    expect(await requireAdminSession()).toEqual({ role: "admin", username: "admin" });

    const userToken = signSessionToken({ role: "user", userId: "u-1", username: "t", groupName: "g" });
    mockCookieGet.mockReturnValue({ value: userToken });
    expect(await requireAdminSession()).toBeNull();
  });
});
