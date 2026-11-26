import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireUserSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireUserSession: () => mockRequireUserSession(),
}));

const mockPhotoMaybeSingle = vi.fn();
const mockDeleteEq = vi.fn();
const mockStorageRemove = vi.fn();

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
      eq: mockDeleteEq,
    }),
  }),
}));

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

import { validatePhotoUpload, MAX_PHOTO_BYTES } from "@/lib/photo-validation";
import { DELETE as deletePhoto } from "@/app/api/photos/[id]/route";

describe("Photo validation & delete ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects empty title, non-image MIME types, and oversized files", () => {
    expect(
      validatePhotoUpload({ type: "image/jpeg", size: 1024 }, "   ")
    ).toEqual({ ok: false, error: "กรุณากรอกชื่อรูปหลักฐาน" });

    expect(
      validatePhotoUpload({ type: "application/pdf", size: 1024 }, "ใบงาน")
    ).toEqual({ ok: false, error: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น" });

    expect(
      validatePhotoUpload({ type: "image/png", size: MAX_PHOTO_BYTES + 1 }, "รูปใหญ่")
    ).toEqual({ ok: false, error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB" });

    expect(
      validatePhotoUpload({ type: "image/jpeg", size: 1024 * 500 }, "หลักฐานภารกิจ 1")
    ).toEqual({ ok: true });
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
});
