export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB (safely below Vercel 4.5 MB limit)

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export type PhotoValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function extensionForMimeType(mimeType: string): string | null {
  return MIME_TO_EXT[mimeType.toLowerCase()] ?? null;
}

export function validatePhotoUpload(
  file: { type: string; size: number } | null | undefined,
  title: string
): PhotoValidationResult {
  if (!title || !title.trim()) {
    return { ok: false, error: "กรุณากรอกชื่อรูปหลักฐาน" };
  }
  if (!file || file.size <= 0) {
    return { ok: false, error: "กรุณาถ่ายรูปหรือเลือกไฟล์รูปภาพ" };
  }
  if (!file.type || !extensionForMimeType(file.type)) {
    return {
      ok: false,
      error: "รองรับเฉพาะไฟล์รูปภาพ JPEG, PNG, WebP, GIF หรือ HEIC เท่านั้น",
    };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 4 MB" };
  }
  return { ok: true };
}

export function validateImageBuffer(buffer: Uint8Array, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  const mime = mimeType.toLowerCase();

  if (mime === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mime === "image/gif") {
    return (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    );
  }
  if (mime === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  }
  if (mime === "image/heic" || mime === "image/heif") {
    // ISO Base Media File Format: "ftyp" at byte offset 4
    return (
      buffer.length >= 12 &&
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70
    );
  }
  return false;
}
