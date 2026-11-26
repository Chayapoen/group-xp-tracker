export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB (safely below Vercel 4.5 MB limit)
export const MAX_ICON_BYTES = 1 * 1024 * 1024; // 1 MB for 1:1 project icon

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const ICON_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
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

export function validateProjectIconUpload(
  file: { type: string; size: number } | null | undefined
): PhotoValidationResult {
  if (!file || file.size <= 0) {
    return { ok: false, error: "กรุณาเลือกไฟล์รูปไอคอน" };
  }
  if (!file.type || !ICON_MIME_TO_EXT[file.type.toLowerCase()]) {
    return {
      ok: false,
      error: "รองรับเฉพาะไฟล์รูปภาพ PNG, JPEG, WebP หรือ GIF เท่านั้น",
    };
  }
  if (file.size > MAX_ICON_BYTES) {
    return { ok: false, error: "ขนาดไฟล์ไอคอนต้องไม่เกิน 1 MB" };
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

export function getImageDimensions(
  buffer: Uint8Array,
  mimeType: string
): { width: number; height: number } | null {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const mime = mimeType.toLowerCase();

  // PNG: IHDR width (bytes 16-19 BE), height (bytes 20-23 BE)
  if (mime === "image/png" && buffer.length >= 24) {
    return {
      width: view.getUint32(16, false),
      height: view.getUint32(20, false),
    };
  }

  // GIF: logical screen width (bytes 6-7 LE), height (bytes 8-9 LE)
  if (mime === "image/gif" && buffer.length >= 10) {
    return {
      width: view.getUint16(6, true),
      height: view.getUint16(8, true),
    };
  }

  // WebP: VP8X / VP8L / VP8
  if (mime === "image/webp" && buffer.length >= 30) {
    const chunk = String.fromCharCode(
      buffer[12],
      buffer[13],
      buffer[14],
      buffer[15]
    );
    if (chunk === "VP8X") {
      const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      return { width, height };
    }
    if (chunk === "VP8L" && buffer.length >= 25) {
      const b0 = buffer[21];
      const b1 = buffer[22];
      const b2 = buffer[23];
      const b3 = buffer[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width, height };
    }
    if (chunk === "VP8 " && buffer.length >= 30) {
      const width = view.getUint16(26, true) & 0x3fff;
      const height = view.getUint16(28, true) & 0x3fff;
      return { width, height };
    }
  }

  // JPEG: scan SOF markers (0xC0..0xC3, 0xC5..0xC7, 0xC9..0xCB, 0xCD..0xCF)
  if (mime === "image/jpeg" && buffer.length >= 4) {
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      offset += 2;
      if (marker === 0xd8 || marker === 0x01) continue;
      if (marker === 0xd9 || marker === 0xda) break;
      if (offset + 2 > buffer.length) break;
      const len = view.getUint16(offset, false);
      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      if (isSof && offset + 7 <= buffer.length) {
        const height = view.getUint16(offset + 3, false);
        const width = view.getUint16(offset + 5, false);
        return { width, height };
      }
      if (len < 2) break;
      offset += len;
    }
  }

  return null;
}
