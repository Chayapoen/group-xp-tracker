"use client";

import { useCallback, useEffect, useState } from "react";

const TABLES = [
  { id: "temp_users", label: "temp_users (ผู้ใช้ & กลุ่ม)" },
  { id: "score_categories", label: "score_categories (หมวดคะแนน)" },
  { id: "score_items", label: "score_items (หัวข้อย่อย & XP)" },
  { id: "user_scores", label: "user_scores (คะแนนล่าสุด)" },
  { id: "score_history", label: "score_history (ประวัติคะแนน)" },
  { id: "evidence_photos", label: "evidence_photos (รูปหลักฐาน)" },
  { id: "app_settings", label: "app_settings (ตั้งค่าแอป)" },
];

interface DatabaseTabProps {
  onMutated: () => Promise<void>;
}

export function DatabaseTab({ onMutated }: DatabaseTabProps) {
  const [selectedTable, setSelectedTable] = useState("temp_users");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [deletable, setDeletable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTable = useCallback(async (table: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/database?table=${encodeURIComponent(table)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "โหลดตารางไม่สำเร็จ");
      setColumns(data.columns ?? []);
      setRows(data.rows ?? []);
      setDeletable(Boolean(data.deletable));
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดตารางไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTable(selectedTable);
  }, [selectedTable, loadTable]);

  async function handleDeleteRow(id: string) {
    if (
      !window.confirm(
        `ต้องการลบข้อมูลแถวนี้ (id: ${id}) ออกจากตาราง "${selectedTable}" ใช่หรือไม่?`
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/admin/database", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: selectedTable, id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "ลบข้อมูลไม่สำเร็จ");
      await Promise.all([loadTable(selectedTable), onMutated()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6DDD2] bg-white/95 p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="db-table-select" className="text-xs font-bold text-[#111111]">
            เลือกตาราง Database:
          </label>
          <select
            id="db-table-select"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-1.5 text-xs font-semibold text-[#111111] focus:border-[#C06C84] focus:outline-none"
          >
            {TABLES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <span className="bg-old-rose-soft text-old-rose rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold">
            {rows.length} แถว
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadTable(selectedTable)}
            className="rounded-xl border border-[#DFD5C9] bg-[#FFFDFB] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#C06C84]"
          >
            รีเฟรช
          </button>
          <a
            href={`/api/admin/database?table=${encodeURIComponent(selectedTable)}&format=csv`}
            className="brand-gradient rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
          >
            ⬇ Export ตารางนี้ (CSV)
          </a>
          <a
            href="/api/admin/export"
            className="bg-old-rose-soft border-old-rose-soft text-old-rose rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition hover:bg-[#FAE6EC]"
          >
            ⬇ Export สรุปคะแนนรวม (CSV)
          </a>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#F2B8B5] bg-[#FEF2F2] px-3 py-2 text-xs font-medium text-[#B91C1C]">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[#E6DDD2] bg-white/95 shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#555555]">
            กำลังโหลดข้อมูลตาราง {selectedTable}...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#555555]">
            ยังไม่มีข้อมูลในตาราง {selectedTable}
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#EFE8DF] bg-[#FAF6F0] text-[#555555]">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="whitespace-nowrap px-3 py-2.5 font-mono">
                    {col}
                  </th>
                ))}
                {deletable ? <th className="px-3 py-2.5 text-right">จัดการ</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {rows.map((row, idx) => {
                const rowId = String(row.id ?? idx);
                return (
                  <tr key={rowId} className="hover:bg-[#FFFBF6]">
                    {columns.map((col) => {
                      const val = row[col];
                      const display =
                        val === null || val === undefined
                          ? "—"
                          : typeof val === "boolean"
                          ? val
                            ? "true"
                            : "false"
                          : String(val);
                      return (
                        <td
                          key={col}
                          className="max-w-[240px] truncate px-3 py-2.5 font-mono text-[#111111]"
                          title={display}
                        >
                          {display}
                        </td>
                      );
                    })}
                    {deletable ? (
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(rowId)}
                          className="font-semibold text-[#B91C1C] hover:underline"
                        >
                          ลบ
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
