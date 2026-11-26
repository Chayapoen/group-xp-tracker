"use client";

import { useState } from "react";
import { AppHeader, type SaveStatus } from "@/components/AppHeader";
import { NavTabs } from "@/components/NavTabs";

export interface PhotoView {
  id: string;
  issueCategory: string | null;
  title: string;
  publicUrl: string;
  createdAt: string;
}

interface PhotosManagerProps {
  projectName: string;
  leaderboardVisible: boolean;
  user: {
    userId: string;
    username: string;
    groupName: string;
  };
  initialPhotos: PhotoView[];
  historyCount: number;
}

export function PhotosManager({
  projectName,
  leaderboardVisible,
  user,
  initialPhotos,
  historyCount,
}: PhotosManagerProps) {
  const [photos, setPhotos] = useState<PhotoView[]>(initialPhotos);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [issueCategory, setIssueCategory] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Unique user-created "หมวดประเด็น" derived from their own photos
  const existingIssues = Array.from(
    new Set(
      photos
        .map((p) => p.issueCategory?.trim())
        .filter((v): v is string => Boolean(v))
    )
  );

  const filteredPhotos =
    filterCategory === "all"
      ? photos
      : filterCategory === "__none__"
      ? photos.filter((p) => !p.issueCategory)
      : photos.filter((p) => p.issueCategory === filterCategory);

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
      if (issueCategory.trim()) {
        formData.append("issueCategory", issueCategory.trim());
      }

      const res = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          res.status === 413
            ? "ขนาดไฟล์รูปภาพใหญ่เกินไป (ต้องไม่เกิน 4 MB)"
            : data.error || "อัปโหลดรูปหลักฐานไม่สำเร็จ"
        );
      }

      const raw = data.photo;
      const created: PhotoView = {
        id: raw.id,
        issueCategory: raw.issue_category ?? null,
        title: raw.title,
        publicUrl: raw.public_url,
        createdAt: raw.created_at,
      };

      setPhotos((prev) => [created, ...prev]);
      clearDraft();
      setTitle("");
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
    if (!trimmed) {
      setError("กรุณากรอกชื่อรูปหลักฐาน");
      return;
    }
    setError(null);
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "แก้ไขชื่อรูปไม่สำเร็จ");
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, title: trimmed } : p))
      );
      setEditingId(null);
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "แก้ไขชื่อรูปไม่สำเร็จ");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("ต้องการลบรูปหลักฐานนี้ใช่หรือไม่?")) return;
    setError(null);
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "ลบรูปภาพไม่สำเร็จ");
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      setError(err instanceof Error ? err.message : "ลบรูปภาพไม่สำเร็จ");
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
        leaderboardVisible={leaderboardVisible}
      />

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5 sm:px-6">
        <section className="space-y-4 rounded-2xl border border-[#E6DDD2] bg-white/95 p-4 shadow-xs sm:p-5">
          <div>
            <h1 className="text-base font-bold text-[#111111]">ถ่ายรูปแนบหลักฐาน</h1>
            <p className="text-xs text-[#555555]">
              แนบรูปหลักฐานของ{" "}
              <span className="text-old-rose font-semibold">{user.groupName}</span>{" "}
              พร้อมตั้งชื่อหมวดประเด็นเองได้
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleUpload} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
              className="flex min-h-[190px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#DFD4C6] p-5 text-center"
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
                  <p className="mb-3 text-xs font-medium text-[#111111]">
                    รองรับ JPEG, PNG, WebP, GIF, HEIC (ไม่เกิน 4 MB)
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <label className="brand-gradient cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-95">
                      ถ่ายรูปด้วยกล้อง
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                    <label className="bg-old-rose-soft border-old-rose-soft text-old-rose cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-semibold transition hover:bg-[#FAE6EC]">
                      เลือกจากแกลเลอรี
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
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
                    htmlFor="issue-category"
                    className="mb-1 block text-xs font-semibold text-[#111111]"
                  >
                    หมวดประเด็น (พิมพ์ตั้งชื่อใหม่เองได้ หรือเลือกจากเดิม)
                  </label>
                  <input
                    id="issue-category"
                    type="text"
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                    placeholder="เช่น ปัญหาหน้างาน, ผลงานรอบเช้า, ความปลอดภัย"
                    className="w-full rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2 text-sm text-[#111111] placeholder:text-[#8A8A8A] focus:border-[#C06C84] focus:outline-none"
                  />
                  {existingIssues.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {existingIssues.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setIssueCategory(cat)}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                            issueCategory.trim() === cat
                              ? "border-[#C06C84] bg-old-rose-soft text-old-rose"
                              : "border-[#E5DDD3] bg-[#FAF8F5] text-[#555555] hover:border-[#C06C84]"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  ) : null}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#111111]">
              แกลเลอรีหลักฐานของกลุ่ม{" "}
              <span className="text-old-rose">({filteredPhotos.length} รูป)</span>
            </h2>
            {existingIssues.length > 0 ? (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-xl border border-[#DFD5C9] bg-white px-3 py-1.5 text-xs text-[#111111] focus:border-[#C06C84] focus:outline-none"
              >
                <option value="all">ทุกหมวดประเด็น</option>
                {existingIssues.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__none__">ไม่ระบุหมวดประเด็น</option>
              </select>
            ) : null}
          </div>

          {filteredPhotos.length === 0 ? (
            <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-8 text-center text-sm text-[#555555]">
              ยังไม่มีรูปหลักฐานในหมวดนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {filteredPhotos.map((p) => (
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
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="shrink-0 text-xs text-[#555555] hover:underline"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-[#111111]">{p.title}</div>
                    )}

                    <div className="flex items-center justify-between gap-2 text-xs text-[#555555]">
                      <span className="truncate rounded-full bg-old-rose-soft px-2 py-0.5 text-[11px] font-semibold text-old-rose">
                        {p.issueCategory || "ทั่วไป"}
                      </span>
                      <span className="shrink-0 font-mono text-[#666666]">
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
