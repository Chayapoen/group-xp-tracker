"use client";

import { useState } from "react";

export interface AdminCategoryItem {
  id: string;
  title: string;
  sort_order: number;
  is_open: boolean;
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

  // Edit category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatTitle, setEditCatTitle] = useState("");

  // Edit item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemXp, setEditItemXp] = useState("0");

  async function safeRequest(url: string, init: RequestInit, fallbackErr: string) {
    setError(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || fallbackErr);
        return false;
      }
      return true;
    } catch {
      setError(fallbackErr);
      return false;
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatTitle.trim()) return;
    const ok = await safeRequest(
      "/api/admin/categories",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newCatTitle.trim(),
          sortOrder: categories.length + 1,
        }),
      },
      "เพิ่มหมวดคะแนนไม่สำเร็จ"
    );
    if (ok) {
      setNewCatTitle("");
      await onRefresh();
    }
  }

  async function handleSaveCategoryEdit(id: string) {
    if (!editCatTitle.trim()) return;
    const ok = await safeRequest(
      `/api/admin/categories/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editCatTitle.trim() }),
      },
      "แก้ไขหมวดคะแนนไม่สำเร็จ"
    );
    if (ok) {
      setEditingCatId(null);
      await onRefresh();
    }
  }

  async function handleMoveCategory(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const a = categories[index];
    const b = categories[target];
    const okA = await safeRequest(
      `/api/admin/categories/${a.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: target + 1 }),
      },
      "จัดลำดับหมวดคะแนนไม่สำเร็จ"
    );
    const okB = await safeRequest(
      `/api/admin/categories/${b.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: index + 1 }),
      },
      "จัดลำดับหมวดคะแนนไม่สำเร็จ"
    );
    if (okA && okB) await onRefresh();
  }

  async function handleToggleCategoryOpen(cat: AdminCategoryItem) {
    const ok = await safeRequest(
      `/api/admin/categories/${cat.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: !cat.is_open }),
      },
      "เปลี่ยนสถานะหมวดคะแนนไม่สำเร็จ"
    );
    if (ok) await onRefresh();
  }

  async function handleDeleteCategory(id: string, title: string) {
    if (!window.confirm(`ต้องการลบหมวด "${title}" และหัวข้อย่อยทั้งหมดใช่หรือไม่?`)) return;
    const ok = await safeRequest(
      `/api/admin/categories/${id}`,
      { method: "DELETE" },
      "ลบหมวดคะแนนไม่สำเร็จ"
    );
    if (ok) await onRefresh();
  }

  async function handleAddItem(catId: string, currentCount: number) {
    const draft = newItemByCat[catId] ?? { title: "", xp: "100" };
    if (!draft.title.trim()) return;
    const ok = await safeRequest(
      "/api/admin/items",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: catId,
          title: draft.title.trim(),
          xp: Number(draft.xp || 0),
          sortOrder: currentCount + 1,
        }),
      },
      "เพิ่มหัวข้อย่อยไม่สำเร็จ"
    );
    if (ok) {
      setNewItemByCat((prev) => ({
        ...prev,
        [catId]: { title: "", xp: draft.xp || "100" },
      }));
      await onRefresh();
    }
  }

  async function handleSaveItemEdit(id: string) {
    if (!editItemTitle.trim()) return;
    const ok = await safeRequest(
      `/api/admin/items/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editItemTitle.trim(),
          xp: Number(editItemXp || 0),
        }),
      },
      "แก้ไขหัวข้อย่อยไม่สำเร็จ"
    );
    if (ok) {
      setEditingItemId(null);
      await onRefresh();
    }
  }

  async function handleMoveItem(
    items: AdminCategoryItem["items"],
    index: number,
    delta: -1 | 1
  ) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    const okA = await safeRequest(
      `/api/admin/items/${a.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: target + 1 }),
      },
      "จัดลำดับหัวข้อย่อยไม่สำเร็จ"
    );
    const okB = await safeRequest(
      `/api/admin/items/${b.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: index + 1 }),
      },
      "จัดลำดับหัวข้อย่อยไม่สำเร็จ"
    );
    if (okA && okB) await onRefresh();
  }

  async function handleDeleteItem(id: string) {
    if (!window.confirm("ต้องการลบหัวข้อย่อยนี้ใช่หรือไม่?")) return;
    const ok = await safeRequest(
      `/api/admin/items/${id}`,
      { method: "DELETE" },
      "ลบหัวข้อย่อยไม่สำเร็จ"
    );
    if (ok) await onRefresh();
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
          categories.map((cat, catIdx) => {
            const draft = newItemByCat[cat.id] ?? { title: "", xp: "150" };
            return (
              <div
                key={cat.id}
                className="space-y-3 rounded-2xl border border-[#E6DDD2] bg-white/95 p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE8DF] pb-2.5">
                  <div className="min-w-0 flex-1">
                    {editingCatId === cat.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={editCatTitle}
                          onChange={(e) => setEditCatTitle(e.target.value)}
                          className="min-w-[200px] flex-1 rounded-lg border border-[#C06C84] px-2.5 py-1 text-xs text-[#111111]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveCategoryEdit(cat.id)}
                          className="brand-gradient rounded-lg px-3 py-1 text-xs font-semibold text-white"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="text-xs text-[#555555] hover:underline"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-[#111111]">{cat.title}</h3>
                        <span className="text-old-rose font-mono text-xs font-semibold">
                          {cat.items.length} หัวข้อย่อย
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleCategoryOpen(cat)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        cat.is_open !== false
                          ? "bg-[#E8FCEF] text-[#15803D] hover:bg-[#D1FADF]"
                          : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                      }`}
                    >
                      {cat.is_open !== false ? "เปิดให้จดคะแนน" : "ปิดการจดคะแนน"}
                    </button>
                    <button
                      type="button"
                      disabled={catIdx === 0}
                      onClick={() => handleMoveCategory(catIdx, -1)}
                      className="rounded border border-[#E5DDD3] px-1.5 py-0.5 text-[#555555] disabled:opacity-30"
                      title="เลื่อนขึ้น"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={catIdx === categories.length - 1}
                      onClick={() => handleMoveCategory(catIdx, 1)}
                      className="rounded border border-[#E5DDD3] px-1.5 py-0.5 text-[#555555] disabled:opacity-30"
                      title="เลื่อนลง"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditCatTitle(cat.title);
                      }}
                      className="text-old-rose font-semibold hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.title)}
                      className="font-medium text-[#B91C1C] hover:underline"
                    >
                      ลบหมวดนี้
                    </button>
                  </div>
                </div>

                <div className="space-y-2 border-l-2 border-[#E7BAC7] pl-3">
                  {cat.items.map((it, itIdx) => (
                    <div
                      key={it.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      {editingItemId === it.id ? (
                        <div className="flex flex-1 flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={editItemTitle}
                            onChange={(e) => setEditItemTitle(e.target.value)}
                            className="min-w-[160px] flex-1 rounded-lg border border-[#C06C84] px-2 py-1 text-xs text-[#111111]"
                          />
                          <input
                            type="number"
                            min={0}
                            value={editItemXp}
                            onChange={(e) => setEditItemXp(e.target.value)}
                            className="w-20 rounded-lg border border-[#C06C84] px-2 py-1 font-mono text-xs text-[#111111]"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveItemEdit(it.id)}
                            className="brand-gradient rounded-lg px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            บันทึก
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="text-xs text-[#555555] hover:underline"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-[#111111]">{it.title}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-old-rose font-mono font-bold">
                              {it.xp.toLocaleString()} XP
                            </span>
                            <button
                              type="button"
                              disabled={itIdx === 0}
                              onClick={() => handleMoveItem(cat.items, itIdx, -1)}
                              className="rounded border border-[#E5DDD3] px-1 text-[#555555] disabled:opacity-30"
                              title="เลื่อนขึ้น"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={itIdx === cat.items.length - 1}
                              onClick={() => handleMoveItem(cat.items, itIdx, 1)}
                              className="rounded border border-[#E5DDD3] px-1 text-[#555555] disabled:opacity-30"
                              title="เลื่อนลง"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItemId(it.id);
                                setEditItemTitle(it.title);
                                setEditItemXp(String(it.xp));
                              }}
                              className="text-old-rose font-semibold hover:underline"
                            >
                              แก้
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(it.id)}
                              className="text-[#B91C1C] hover:underline"
                            >
                              ลบ
                            </button>
                          </div>
                        </>
                      )}
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
