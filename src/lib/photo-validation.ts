export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export type PhotoValidationResult =
  | { ok: true }
  | { ok: false; error: string };

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
  if (!file.type || !file.type.startsWith("image/")) {
    return { ok: false, error: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น" };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB" };
  }
  return { ok: true };
}
