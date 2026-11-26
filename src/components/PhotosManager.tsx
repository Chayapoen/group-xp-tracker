"use client";

import { useState } from "react";
import { AppHeader, type SaveStatus } from "@/components/AppHeader";
import { NavTabs } from "@/components/NavTabs";

export interface PhotoView {
  id: string;
  categoryId: string | null;
  categoryTitle: string | null;
  title: string;
  publicUrl: string;
  createdAt: string;
}

interface PhotosManagerProps {
  projectName: string;
  user: {
    userId: string;
    username: string;
    groupName: string;
  };
  categories: { id: string; title: string }[];
  initialPhotos: PhotoView[];
  historyCount: number;
}

export function PhotosManager({
  projectName,
  user,
  categories,
  initialPhotos,
  historyCount,
}: PhotosManagerProps) {
  const [photos, setPhotos] = useState<PhotoView[]>(initialPhotos);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
    setError(null);
  }

  function clearDraft() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError("กรุณาถ่ายรูปหรือเลือกไฟล์รูปภาพ");
      return;
    }
    if (!title.trim()) {
      setError("กรุณากรอกชื่อรูปหลักฐาน");
      return;
    }

    setUploading(true);
    setSaveStatus("saving");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      if (categoryId) formData.append("categoryId", categoryId);

      const res = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "อัปโหลดรูปหลักฐานไม่สำเร็จ");
      }

      const raw = data.photo;
      const catObj = Array.isArray(raw.score_categories)
        ? raw.score_categories[0]
        : raw.score_categories;

      const created: PhotoView = {
        id: raw.id,
        categoryId: raw.category_id,
        categoryTitle: catObj?.title ?? null,
        title: raw.title,
        publicUrl: raw.public_url,
        createdAt: raw.created_at,
      };

      setPhotos((prev) => [created, ...prev]);
      clearDraft();
      setTitle("");
      setCategoryId("");
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "อัปโหลดรูปหลักฐานไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function handleRenameSave(id: string) {
    const trimmed = editingTitle.trim();
    if (!trimmed) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("แก้ไขชื่อรูปไม่สำเร็จ");
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, title: trimmed } : p))
      );
      setEditingId(null);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      setError("แก้ไขชื่อรูปไม่สำเร็จ");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ต้องการลบรูปหลักฐานนี้ใช่หรือไม่?")) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบรูปภาพไม่สำเร็จ");
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
      setError("ลบรูปภาพไม่สำเร็จ");
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        projectName={projectName}
        saveStatus={saveStatus}
        username={user.username}
        groupName={user.groupName}
      />
      <NavTabs
        active="photos"
        photosCount={photos.length}
        historyCount={historyCount}
      />

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5 sm:px-6">
        <section className="space-y-4 rounded-2xl border border-[#E6DDD2] bg-white/95 p-4 shadow-xs sm:p-5">
          <div>
            <h1 className="text-base font-bold text-[#111111]">ถ่ายรูปแนบหลักฐาน</h1>
            <p className="text-xs text-[#555555]">
              แนบรูปประกอบการให้คะแนนของ{" "}
              <span className="text-old-rose font-semibold">{user.groupName}</span>
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleUpload} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
              className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#DFD4C6] p-5 text-center"
              style={{ background: "linear-gradient(135deg, #FFF9F2 0%, #F4FCF7 100%)" }}
            >
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="ตัวอย่างรูปหลักฐาน"
                    className="mb-2 max-h-44 rounded-lg border border-[#E6DDD2] object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="text-old-rose text-xs font-semibold hover:underline"
                  >
                    เปลี่ยนรูป
                  </button>
                </>
              ) : (
                <>
                  <svg
                    className="text-old-rose mb-2 h-9 w-9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <p className="mb-2 text-xs font-medium text-[#111111]">
                    เปิดกล้องถ่ายรูป หรือเลือกไฟล์รูปภาพ (ไม่เกิน 5 MB)
                  </p>
                  <label className="brand-gradient cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-95">
                    เปิดกล้อง / เลือกรูปภาพ
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="flex flex-col justify-between space-y-3">
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="photo-title"
                    className="mb-1 block text-xs font-semibold text-[#111111]"
                  >
                    ชื่อรูป / คำอธิบายหลักฐาน <span className="text-old-rose">*</span>
                  </label>
                  <input
                    id="photo-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น ภาพชิ้นงานต้นแบบหลังประกอบเสร็จ"
                    className="w-full rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2 text-sm text-[#111111] placeholder:text-[#8A8A8A] focus:border-[#C06C84] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="photo-category"
                    className="mb-1 block text-xs font-semibold text-[#111111]"
                  >
                    หมวดคะแนนที่เกี่ยวข้อง (ไม่บังคับ)
                  </label>
                  <select
                    id="photo-category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2 text-sm text-[#111111] focus:border-[#C06C84] focus:outline-none"
                  >
                    <option value="">— ไม่ระบุหมวดหมู่ —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="brand-gradient w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:opacity-95 disabled:opacity-60"
              >
                {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปหลักฐาน"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#111111]">
            แกลเลอรีหลักฐานของกลุ่ม{" "}
            <span className="text-old-rose">({photos.length} รูป)</span>
          </h2>

          {photos.length === 0 ? (
            <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-8 text-center text-sm text-[#555555]">
              ยังไม่มีรูปหลักฐานที่อัปโหลด
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs"
                >
                  <a href={p.publicUrl} target="_blank" rel="noreferrer">
                    <img
                      src={p.publicUrl}
                      alt={p.title}
                      className="h-40 w-full border-b border-[#EFE8DF] object-cover"
                    />
                  </a>
                  <div className="space-y-1.5 p-3">
                    {editingId === p.id ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full rounded-lg border border-[#C06C84] px-2 py-1 text-xs text-[#111111] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameSave(p.id)}
                          className="brand-gradient shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          บันทึก
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-[#111111]">{p.title}</div>
                    )}

                    <div className="flex items-center justify-between gap-2 text-xs text-[#555555]">
                      <span className="truncate">{p.categoryTitle || "ทั่วไป"}</span>
                      <span className="text-old-rose shrink-0 font-mono">
                        {new Date(p.createdAt).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(p.id);
                          setEditingTitle(p.title);
                        }}
                        className="text-old-rose text-xs font-semibold hover:underline"
                      >
                        แก้ชื่อ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="text-xs font-medium text-[#B91C1C] hover:underline"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
