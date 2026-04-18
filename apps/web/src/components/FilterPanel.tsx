"use client";

import {
  type CategoryFilter,
  type NumericRangeFilter,
  type RowFilters,
  classifyColumn,
  collectCategories,
  columnRange,
} from "@/lib/filter-utils";
import type { ColumnDefinition, ExperimentRow } from "@lab-ai/shared";
import { useMemo, useState } from "react";

interface Props {
  columns: readonly ColumnDefinition[];
  rows: readonly ExperimentRow[];
  filters: RowFilters;
  onChange: (next: RowFilters) => void;
}

export function FilterPanel({ columns, rows, filters, onChange }: Props) {
  const [addColumn, setAddColumn] = useState<string>("");

  const unusedColumns = useMemo(() => {
    const used = new Set<string>([
      ...filters.numeric.map((f) => f.column),
      ...filters.category.map((f) => f.column),
    ]);
    return columns.filter(
      (col) => !used.has(col.name) && classifyColumn(columns, col.name) !== null,
    );
  }, [columns, filters]);

  const addFilter = () => {
    if (!addColumn) return;
    const kind = classifyColumn(columns, addColumn);
    if (kind === "numeric") {
      const range = columnRange(rows, addColumn);
      if (!range) return;
      onChange({
        ...filters,
        numeric: [...filters.numeric, { column: addColumn, min: range.min, max: range.max }],
      });
    } else if (kind === "category") {
      const cats = collectCategories(rows, addColumn);
      onChange({
        ...filters,
        category: [...filters.category, { column: addColumn, allowed: new Set(cats) }],
      });
    }
    setAddColumn("");
  };

  const removeNumeric = (column: string) => {
    onChange({ ...filters, numeric: filters.numeric.filter((f) => f.column !== column) });
  };

  const removeCategory = (column: string) => {
    onChange({ ...filters, category: filters.category.filter((f) => f.column !== column) });
  };

  const updateNumeric = (next: NumericRangeFilter) => {
    onChange({
      ...filters,
      numeric: filters.numeric.map((f) => (f.column === next.column ? next : f)),
    });
  };

  const updateCategory = (next: CategoryFilter) => {
    onChange({
      ...filters,
      category: filters.category.map((f) => (f.column === next.column ? next : f)),
    });
  };

  const resetAll = () => {
    onChange({ numeric: [], category: [] });
  };

  const totalActive = filters.numeric.length + filters.category.length;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between text-xs uppercase opacity-70">
        <span>フィルタ ({totalActive})</span>
        {totalActive > 0 && (
          <button type="button" onClick={resetAll} className="opacity-80 underline">
            リセット
          </button>
        )}
      </div>

      {filters.numeric.map((f) => (
        <NumericFilterRow
          key={f.column}
          filter={f}
          onChange={updateNumeric}
          onRemove={() => removeNumeric(f.column)}
        />
      ))}

      {filters.category.map((f) => {
        const cats = collectCategories(rows, f.column);
        return (
          <CategoryFilterRow
            key={f.column}
            filter={f}
            categories={cats}
            onChange={updateCategory}
            onRemove={() => removeCategory(f.column)}
          />
        );
      })}

      {unusedColumns.length > 0 && (
        <div className="flex gap-1 pt-1">
          <select
            value={addColumn}
            onChange={(e) => setAddColumn(e.target.value)}
            className="flex-1 rounded-md bg-white/10 px-2 py-1 text-xs"
          >
            <option value="">カラムを追加...</option>
            {unusedColumns.map((col) => (
              <option key={col.id} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addFilter}
            disabled={!addColumn}
            className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/15 disabled:opacity-40"
          >
            追加
          </button>
        </div>
      )}
    </div>
  );
}

interface NumericRowProps {
  filter: NumericRangeFilter;
  onChange: (next: NumericRangeFilter) => void;
  onRemove: () => void;
}

function NumericFilterRow({ filter, onChange, onRemove }: NumericRowProps) {
  const parse = (v: string): number | null => {
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return (
    <div className="rounded-md bg-black/30 p-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs">{filter.column}</span>
        <button type="button" onClick={onRemove} className="text-[10px] opacity-70 underline">
          削除
        </button>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <input
          type="number"
          value={filter.min ?? ""}
          onChange={(e) => onChange({ ...filter, min: parse(e.target.value) })}
          placeholder="min"
          className="w-20 rounded-sm bg-white/10 px-1 py-0.5 text-[11px]"
        />
        <span className="opacity-50">〜</span>
        <input
          type="number"
          value={filter.max ?? ""}
          onChange={(e) => onChange({ ...filter, max: parse(e.target.value) })}
          placeholder="max"
          className="w-20 rounded-sm bg-white/10 px-1 py-0.5 text-[11px]"
        />
      </div>
    </div>
  );
}

interface CategoryRowProps {
  filter: CategoryFilter;
  categories: readonly string[];
  onChange: (next: CategoryFilter) => void;
  onRemove: () => void;
}

function CategoryFilterRow({ filter, categories, onChange, onRemove }: CategoryRowProps) {
  const toggle = (cat: string) => {
    const allowed = new Set(filter.allowed);
    if (allowed.has(cat)) allowed.delete(cat);
    else allowed.add(cat);
    onChange({ ...filter, allowed });
  };
  const allOn = () => onChange({ ...filter, allowed: new Set(categories) });
  const allOff = () => onChange({ ...filter, allowed: new Set() });
  return (
    <div className="rounded-md bg-black/30 p-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs">{filter.column}</span>
        <div className="flex items-center gap-2 text-[10px] opacity-70">
          <button type="button" onClick={allOn} className="underline">
            全て
          </button>
          <button type="button" onClick={allOff} className="underline">
            クリア
          </button>
          <button type="button" onClick={onRemove} className="underline">
            削除
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => {
          const active = filter.allowed.has(cat);
          return (
            <button
              key={cat || "(empty)"}
              type="button"
              onClick={() => toggle(cat)}
              className={`rounded-sm px-1.5 py-0.5 text-[10px] ${
                active ? "bg-[var(--accent)] text-white" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              {cat || "(空)"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
