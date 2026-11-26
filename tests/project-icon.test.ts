import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdminSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAdminSession: () => mockRequireAdminSession(),
}));

const mockSettingsMaybeSingle = vi.fn();
const mockSettingsUpsertSingle = vi.fn();
const mockStorageUpload = vi.fn();
const mockStorageRemove = vi.fn();

const mockFrom = vi.fn(() => ({
  select: () => ({
    eq: () => ({
      maybeSingle: mockSettingsMaybeSingle,
    }),
  }),
  upsert: () => ({
    select: () => ({
      single: mockSettingsUpsertSingle,
    }),
  }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: mockStorageUpload,
        remove: mockStorageRemove,
        getPublicUrl: (p: string) => ({
          data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/evidence-photos/${p}` },
        }),
      }),
    },
  })),
}));

import {
  MAX_ICON_BYTES,
  validateProjectIconUpload,
  getImageDimensions,
} from "@/lib/photo-validation";
import { POST as uploadIcon } from "@/app/api/admin/settings/icon/route";

function makeMinimalPng(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  // PNG signature
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  // IHDR chunk length & type
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

describe("Project Icon validation & upload API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces 1 MB max size and raster MIME allowlist", () => {
    expect(MAX_ICON_BYTES).toBe(1024 * 1024);
    expect(
      validateProjectIconUpload({ type: "image/png", size: MAX_ICON_BYTES + 1 })
    ).toEqual({ ok: false, error: "ขนาดไฟล์ไอคอนต้องไม่เกิน 1 MB" });
    expect(
      validateProjectIconUpload({ type: "image/svg+xml", size: 500 })
    ).toEqual({
      ok: false,
      error: "รองรับเฉพาะไฟล์รูปภาพ PNG, JPEG, WebP หรือ GIF เท่านั้น",
    });
    expect(
      validateProjectIconUpload({ type: "image/png", size: 2048 })
    ).toEqual({ ok: true });
  });

  it("parses PNG dimensions accurately", () => {
    expect(getImageDimensions(makeMinimalPng(256, 256), "image/png")).toEqual({
      width: 256,
      height: 256,
    });
    expect(getImageDimensions(makeMinimalPng(400, 200), "image/png")).toEqual({
      width: 400,
      height: 200,
    });
  });

  it("rejects non-1:1 image uploads with 400", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    const rectPng = makeMinimalPng(300, 200);
    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array(rectPng)], "wide.png", { type: "image/png" })
    );

    const req = new Request("http://localhost/api/admin/settings/icon", {
      method: "POST",
      body: formData,
    });
    const res = await uploadIcon(req);
    expect(res.status).toBe(400);
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("uploads valid 1:1 PNG <= 1 MB and cleans up previous icon", async () => {
    mockRequireAdminSession.mockResolvedValue({ role: "admin", username: "admin" });
    mockSettingsMaybeSingle.mockResolvedValue({
      data: { project_icon_path: "project-icons/old.png" },
      error: null,
    });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockSettingsUpsertSingle.mockResolvedValue({
      data: {
        project_icon_url:
          "https://example.supabase.co/storage/v1/object/public/evidence-photos/project-icons/new.png",
      },
      error: null,
    });
    mockStorageRemove.mockResolvedValue({ error: null });

    const squarePng = makeMinimalPng(256, 256);
    const formData = new FormData();
    formData.append(
      "file",
      new File([new Uint8Array(squarePng)], "logo.png", { type: "image/png" })
    );

    const req = new Request("http://localhost/api/admin/settings/icon", {
      method: "POST",
      body: formData,
    });
    const res = await uploadIcon(req);
    expect(res.status).toBe(200);
    expect(mockStorageUpload).toHaveBeenCalled();
    expect(mockStorageRemove).toHaveBeenCalledWith(["project-icons/old.png"]);
  });
});
