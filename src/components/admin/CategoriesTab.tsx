"use client";

import { useState } from "react";

export interface AdminCategoryItem {
  id: string;
  title: string;
  sort_order: number;
  items: {
    id: string;
    category_id: string;
    title: string;
    xp: number;
    sort_order: number;
  }[];
}

interface CategoriesTabProps {
  categories: AdminCategoryItem[];
  onRefresh: () => Promise<void>;
}

export function CategoriesTab({ categories, onRefresh }: CategoriesTabProps) {
  const [newCatTitle, setNewCatTitle] = useState("");
  const [newItemByCat, setNewItemByCat] = useState<
    Record<string, { title: string; xp: string }>
  >({});
  const [error, setError] = useState<string | null>(null);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatTitle.trim()) return;
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newCatTitle.trim(),
        sortOrder: categories.length + 1,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "เพิ่มหมวดคะแนนไม่สำเร็จ");
      return;
    }
    setNewCatTitle("");
    await onRefresh();
  }

  async function handleDeleteCategory(id: string, title: string) {
    if (!window.confirm(`ต้องการลบหมวด "${title}" และหัวข้อย่อยทั้งหมดใช่หรือไม่?`)) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    await onRefresh();
  }

  async function handleAddItem(catId: string, currentCount: number) {
    const draft = newItemByCat[catId] ?? { title: "", xp: "100" };
    if (!draft.title.trim()) return;
    setError(null);
    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: catId,
        title: draft.title.trim(),
        xp: Number(draft.xp || 0),
        sortOrder: currentCount + 1,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "เพิ่มหัวข้อย่อยไม่สำเร็จ");
      return;
    }
    setNewItemByCat((prev) => ({
      ...prev,
      [catId]: { title: "", xp: draft.xp || "100" },
    }));
    await onRefresh();
  }

  async function handleDeleteItem(id: string) {
    await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
    await onRefresh();
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleAddCategory}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E6DDD2] bg-white/95 p-4 shadow-xs"
      >
        <input
          type="text"
          required
          value={newCatTitle}
          onChange={(e) => setNewCatTitle(e.target.value)}
          placeholder="ชื่อหมวดคะแนนใหม่ (เช่น คะแนนหมวด 1 — วางแผน)"
          className="min-w-[220px] flex-1 rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-2 text-sm text-[#111111] focus:border-[#C06C84] focus:outline-none"
        />
        <button
          type="submit"
          className="brand-gradient rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs"
        >
          + เพิ่มหมวดคะแนน
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-[#E6DDD2] bg-white/95 p-6 text-center text-sm text-[#555555]">
            ยังไม่มีหมวดคะแนน เริ่มเพิ่มหมวดแรกด้านบนได้เลย
          </div>
        ) : (
          categories.map((cat) => {
            const draft = newItemByCat[cat.id] ?? { title: "", xp: "150" };
            return (
              <div
                key={cat.id}
                className="space-y-3 rounded-2xl border border-[#E6DDD2] bg-white/95 p-4 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[#EFE8DF] pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-[#111111]">{cat.title}</h3>
                    <span className="text-old-rose font-mono text-xs font-semibold">
                      {cat.items.length} หัวข้อย่อย
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.title)}
                    className="text-xs font-medium text-[#B91C1C] hover:underline"
                  >
                    ลบหมวดนี้
                  </button>
                </div>

                <div className="space-y-2 border-l-2 border-[#E7BAC7] pl-3">
                  {cat.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium text-[#111111]">{it.title}</span>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-old-rose font-mono font-bold">
                          {it.xp.toLocaleString()} XP
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(it.id)}
                          className="text-[#B91C1C] hover:underline"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="ชื่อหัวข้อย่อย (เช่น สำเร็จข้อ 1)"
                    value={draft.title}
                    onChange={(e) =>
                      setNewItemByCat((prev) => ({
                        ...prev,
                        [cat.id]: { ...draft, title: e.target.value },
                      }))
                    }
                    className="min-w-[180px] flex-1 rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-1.5 text-xs text-[#111111] focus:border-[#C06C84] focus:outline-none"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="XP"
                    value={draft.xp}
                    onChange={(e) =>
                      setNewItemByCat((prev) => ({
                        ...prev,
                        [cat.id]: { ...draft, xp: e.target.value },
                      }))
                    }
                    className="w-24 rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-1.5 font-mono text-xs text-[#111111] focus:border-[#C06C84] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddItem(cat.id, cat.items.length)}
                    className="bg-old-rose-soft border-old-rose-soft text-old-rose rounded-xl border px-3 py-1.5 text-xs font-semibold hover:bg-[#FAE6EC]"
                  >
                    + เพิ่มหัวข้อย่อย
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
