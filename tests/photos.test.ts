import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireUserSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireUserSession: () => mockRequireUserSession(),
}));

const mockPhotoMaybeSingle = vi.fn();
const mockDeleteEq = vi.fn();
const mockStorageRemove = vi.fn();
const callOrder: string[] = [];

const mockFrom = vi.fn(() => ({
  select: () => ({
    eq: () => ({
      eq: () => ({
        maybeSingle: mockPhotoMaybeSingle,
      }),
    }),
  }),
  delete: () => ({
    eq: () => ({
      eq: async (...args: unknown[]) => {
        callOrder.push("db-delete");
        return mockDeleteEq(...args);
      },
    }),
  }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: () => ({
        remove: async (...args: unknown[]) => {
          callOrder.push("storage-remove");
          return mockStorageRemove(...args);
        },
      }),
    },
  })),
}));

import {
  validatePhotoUpload,
  validateImageBuffer,
  extensionForMimeType,
  MAX_PHOTO_BYTES,
} from "@/lib/photo-validation";
import { DELETE as deletePhoto } from "@/app/api/photos/[id]/route";

describe("Photo validation & delete safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder.length = 0;
  });

  it("rejects empty title, SVG XSS, non-image MIME types, and files over 4 MB", () => {
    expect(MAX_PHOTO_BYTES).toBe(4 * 1024 * 1024);

    expect(
      validatePhotoUpload({ type: "image/jpeg", size: 1024 }, "   ")
    ).toEqual({ ok: false, error: "กรุณากรอกชื่อรูปหลักฐาน" });

    expect(
      validatePhotoUpload({ type: "image/svg+xml", size: 512 }, "xss")
    ).toEqual({
      ok: false,
      error: "รองรับเฉพาะไฟล์รูปภาพ JPEG, PNG, WebP, GIF หรือ HEIC เท่านั้น",
    });

    expect(
      validatePhotoUpload({ type: "application/pdf", size: 1024 }, "ใบงาน")
    ).toEqual({
      ok: false,
      error: "รองรับเฉพาะไฟล์รูปภาพ JPEG, PNG, WebP, GIF หรือ HEIC เท่านั้น",
    });

    expect(
      validatePhotoUpload({ type: "image/png", size: MAX_PHOTO_BYTES + 1 }, "รูปใหญ่")
    ).toEqual({ ok: false, error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 4 MB" });

    expect(
      validatePhotoUpload({ type: "image/jpeg", size: 1024 * 500 }, "หลักฐานภารกิจ 1")
    ).toEqual({ ok: true });
  });

  it("validates image magic bytes and maps safe extensions from MIME", () => {
    const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const fakeSvgAsJpeg = Buffer.from("<svg onload=alert(1)>");

    expect(validateImageBuffer(validJpeg, "image/jpeg")).toBe(true);
    expect(validateImageBuffer(validPng, "image/png")).toBe(true);
    expect(validateImageBuffer(fakeSvgAsJpeg, "image/jpeg")).toBe(false);
    expect(extensionForMimeType("image/jpeg")).toBe("jpg");
    expect(extensionForMimeType("image/png")).toBe("png");
    expect(extensionForMimeType("image/webp")).toBe("webp");
  });

  it("returns 404 when deleting a photo not owned by current user", async () => {
    mockRequireUserSession.mockResolvedValue({
      role: "user",
      userId: "user-a",
      username: "teamA",
      groupName: "กลุ่ม A",
    });
    mockPhotoMaybeSingle.mockResolvedValue({ data: null, error: null });

    const req = new Request("http://localhost/api/photos/photo-999", {
      method: "DELETE",
    });
    const res = await deletePhoto(req, {
      params: Promise.resolve({ id: "photo-999" }),
    });
    expect(res.status).toBe(404);
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it("deletes DB row BEFORE removing storage object to avoid broken gallery links", async () => {
    mockRequireUserSession.mockResolvedValue({
      role: "user",
      userId: "user-a",
      username: "teamA",
      groupName: "กลุ่ม A",
    });
    mockPhotoMaybeSingle.mockResolvedValue({
      data: { id: "p-1", storage_path: "user-a/1.jpg" },
      error: null,
    });
    mockDeleteEq.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });

    const req = new Request("http://localhost/api/photos/p-1", {
      method: "DELETE",
    });
    const res = await deletePhoto(req, {
      params: Promise.resolve({ id: "p-1" }),
    });
    expect(res.status).toBe(200);
    expect(callOrder).toEqual(["db-delete", "storage-remove"]);
  });
});
