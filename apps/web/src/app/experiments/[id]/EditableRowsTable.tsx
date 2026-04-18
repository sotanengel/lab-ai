"use client";

import { deleteExperimentRow, updateExperimentRow } from "@/lib/api-client";
import type { ColumnDefinition, ExperimentRow, ExperimentRowRecord } from "@lab-ai/shared";
import { useState, useTransition } from "react";

interface Props {
  experimentId: string;
  columns: ColumnDefinition[];
  initialRows: ExperimentRowRecord[];
}

function coerce(raw: string, type: ColumnDefinition["type"]): unknown {
  if (raw === "") return null;
  if (type === "integer") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : raw;
  }
  if (type === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (type === "boolean") {
    if (raw === "true") return true;
    if (raw === "false") return false;
    return raw;
  }
  return raw;
}

function toInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function EditableRowsTable({ experimentId, columns, initialRows }: Props) {
  const [rows, setRows] = useState<ExperimentRowRecord[]>(initialRows);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEdit = (row: ExperimentRowRecord) => {
    setEditingId(row.id);
    const d: Record<string, string> = {};
    for (const col of columns) {
      d[col.name] = toInput(row.data[col.name]);
    }
    setDraft(d);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const saveEdit = () => {
    if (!editingId) return;
    setError(null);
    const patch: ExperimentRow = {};
    for (const col of columns) {
      patch[col.name] = coerce(draft[col.name] ?? "", col.type);
    }
    startTransition(async () => {
      try {
        const updated = await updateExperimentRow(experimentId, editingId, patch);
        setRows((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
        cancelEdit();
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      }
    });
  };

  const remove = (row: ExperimentRowRecord) => {
    if (!confirm(`row ${row.rowIndex + 1} を削除しますか？`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteExperimentRow(experimentId, row.id);
        setRows((prev) => prev.filter((r) => r.id !== row.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      }
    });
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </p>
      )}
      <div className="overflow-auto rounded-md border border-white/10 max-h-[520px]">
        <table className="w-full text-xs">
          <thead className="bg-white/5 sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left w-10 opacity-60">#</th>
              {columns.map((col) => (
                <th key={col.id} className="whitespace-nowrap px-3 py-2 text-left">
                  {col.name}
                  {col.unit && <span className="opacity-60"> ({col.unit})</span>}
                </th>
              ))}
              <th className="px-3 py-2 text-right w-28 opacity-60">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const editing = row.id === editingId;
              return (
                <tr key={row.id} className="border-t border-white/5 align-top">
                  <td className="px-2 py-1.5 opacity-50">{row.rowIndex + 1}</td>
                  {columns.map((col) => (
                    <td key={col.id} className="px-3 py-1.5">
                      {editing ? (
                        <input
                          value={draft[col.name] ?? ""}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [col.name]: e.target.value }))
                          }
                          className="w-full rounded-sm bg-white/10 px-2 py-0.5 text-xs"
                        />
                      ) : (
                        <span className="opacity-85">{formatCellDisplay(row.data[col.name])}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right whitespace-nowrap">
                    {editing ? (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-sm border border-white/20 px-2 py-0.5 text-[10px]"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={isPending}
                          className="rounded-sm bg-[var(--accent)] px-2 py-0.5 text-[10px] text-white disabled:opacity-50"
                        >
                          保存
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded-sm border border-white/20 px-2 py-0.5 text-[10px]"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(row)}
                          className="rounded-sm border border-red-500/40 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-500/10"
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCellDisplay(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
