"use client";

import { fetchExperiment, fetchExperimentRows } from "@/lib/api-client";
import { isNumericColumn, toNumberOrNull } from "@/lib/chart-utils";
import type {
  ColumnDefinition,
  ExperimentDetail,
  ExperimentMeta,
  ExperimentRow,
} from "@lab-ai/shared";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

interface Props {
  available: ExperimentMeta[];
  initialSelected: string[];
}

type Mode = "line" | "scatter";

interface LoadedExperiment {
  detail: ExperimentDetail;
  rows: ExperimentRow[];
}

const SERIES_COLORS = ["#4f8cff", "#f59e0b", "#10b981", "#e11d48", "#8b5cf6", "#14b8a6"];

export function CompareWorkbench({ available, initialSelected }: Props) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [loaded, setLoaded] = useState<Record<string, LoadedExperiment>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("line");
  const [xColumn, setXColumn] = useState<string>("");
  const [yColumn, setYColumn] = useState<string>("");

  useEffect(() => {
    const ids = selected.filter((id) => !loaded[id]);
    if (ids.length === 0) return;
    setLoading(true);
    Promise.all(
      ids.map(async (id) => {
        const [detail, rowsRes] = await Promise.all([
          fetchExperiment(id),
          fetchExperimentRows(id, { limit: 10_000, offset: 0 }),
        ]);
        return [id, { detail, rows: rowsRes.items }] as const;
      }),
    )
      .then((pairs) => {
        setLoaded((prev) => {
          const next = { ...prev };
          for (const [id, item] of pairs) next[id] = item;
          return next;
        });
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "load failed");
      })
      .finally(() => setLoading(false));
  }, [selected, loaded]);

  const sharedColumns = useMemo(() => {
    const loadedSelected = selected
      .map((id) => loaded[id])
      .filter((x): x is LoadedExperiment => Boolean(x));
    if (loadedSelected.length === 0) return [] as ColumnDefinition[];
    const [first, ...rest] = loadedSelected;
    if (!first) return [];
    return first.detail.columns.filter((col) =>
      rest.every((exp) => exp.detail.columns.some((c) => c.name === col.name)),
    );
  }, [loaded, selected]);

  const numericSharedColumns = useMemo(
    () => sharedColumns.filter(isNumericColumn),
    [sharedColumns],
  );

  // Auto-pick default axes once columns are available
  useEffect(() => {
    if (!xColumn && sharedColumns[0]) setXColumn(sharedColumns[0].name);
    if (!yColumn && numericSharedColumns[0]) setYColumn(numericSharedColumns[0].name);
  }, [sharedColumns, numericSharedColumns, xColumn, yColumn]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const chartSeries = useMemo(() => {
    return selected
      .map((id, idx) => {
        const exp = loaded[id];
        if (!exp) return null;
        const data = exp.rows
          .map((r) => ({
            x: toNumberOrNull(r[xColumn]) ?? r[xColumn],
            y: toNumberOrNull(r[yColumn]),
          }))
          .filter((p) => p.y !== null);
        return {
          id,
          name: exp.detail.name,
          color: SERIES_COLORS[idx % SERIES_COLORS.length] ?? "#4f8cff",
          data,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [selected, loaded, xColumn, yColumn]);

  const mergedLineData = useMemo(() => {
    const xs = new Set<string | number>();
    for (const series of chartSeries) {
      for (const p of series.data) {
        if (p.x !== null && p.x !== undefined) xs.add(p.x as string | number);
      }
    }
    const sortedX = [...xs].sort((a, b) => {
      if (typeof a === "number" && typeof b === "number") return a - b;
      return String(a).localeCompare(String(b));
    });
    return sortedX.map((x) => {
      const row: Record<string, number | string | null> = { x };
      for (const series of chartSeries) {
        const match = series.data.find((p) => p.x === x);
        row[series.id] = match?.y ?? null;
      }
      return row;
    });
  }, [chartSeries]);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4 rounded-md border border-white/10 bg-white/5 p-4 text-sm">
        <div>
          <div className="text-xs uppercase opacity-70 mb-1">実験を選択</div>
          {available.length === 0 ? (
            <p className="text-xs opacity-70">取込済みの実験がありません。</p>
          ) : (
            <ul className="max-h-[360px] overflow-auto space-y-1 pr-1">
              {available.map((exp) => (
                <li key={exp.id}>
                  <label className="flex items-start gap-2 rounded-md px-1 py-0.5 hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={selected.includes(exp.id)}
                      onChange={() => toggle(exp.id)}
                      className="mt-1"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-xs">{exp.name}</span>
                      <span className="text-[10px] opacity-60">
                        {exp.rowCount.toLocaleString()} 行 ·{" "}
                        {new Date(exp.registeredAt).toLocaleDateString("ja-JP")}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected.length > 0 && (
          <>
            <div>
              <div className="text-xs uppercase opacity-70 mb-1">チャート種</div>
              <div className="grid grid-cols-2 gap-1">
                {(["line", "scatter"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-md px-2 py-1.5 text-xs ${
                      mode === m ? "bg-[var(--accent)] text-white" : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    {m === "line" ? "折れ線" : "散布図"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase opacity-70 mb-1">X 軸</label>
              <select
                value={xColumn}
                onChange={(e) => setXColumn(e.target.value)}
                className="w-full rounded-md bg-white/10 px-2 py-1.5 text-sm"
              >
                {sharedColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase opacity-70 mb-1">Y 軸（数値）</label>
              <select
                value={yColumn}
                onChange={(e) => setYColumn(e.target.value)}
                className="w-full rounded-md bg-white/10 px-2 py-1.5 text-sm"
              >
                {numericSharedColumns.length === 0 ? (
                  <option>共通する数値カラムがありません</option>
                ) : (
                  numericSharedColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </>
        )}
        {loading && <p className="text-xs opacity-70">読み込み中...</p>}
        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
            {error}
          </p>
        )}
      </aside>

      <section className="rounded-md border border-white/10 bg-white/5 p-4 min-h-[480px]">
        {selected.length === 0 && (
          <p className="text-sm opacity-70">左から 2 つ以上の実験を選ぶとグラフが表示されます。</p>
        )}
        {selected.length > 0 &&
          numericSharedColumns.length === 0 &&
          Object.keys(loaded).length > 0 && (
            <p className="text-sm opacity-70">
              選択した実験に共通する数値カラムがありません。カラム名を揃えた上で再度お試しください。
            </p>
          )}
        {selected.length > 0 && xColumn && yColumn && chartSeries.length > 0 && (
          <ResponsiveContainer width="100%" height={480}>
            {mode === "line" ? (
              <LineChart data={mergedLineData} margin={{ top: 12, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="x"
                  stroke="#cbd5f5"
                  tick={{ fontSize: 12 }}
                  label={{ value: xColumn, position: "insideBottom", offset: -10, fill: "#cbd5f5" }}
                />
                <YAxis
                  stroke="#cbd5f5"
                  tick={{ fontSize: 12 }}
                  label={{ value: yColumn, angle: -90, position: "insideLeft", fill: "#cbd5f5" }}
                />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #334155" }} />
                <Legend />
                {chartSeries.map((series) => (
                  <Line
                    key={series.id}
                    type="monotone"
                    dataKey={series.id}
                    name={series.name}
                    stroke={series.color}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            ) : (
              <ScatterChart margin={{ top: 12, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="x" stroke="#cbd5f5" tick={{ fontSize: 12 }} name={xColumn} />
                <YAxis dataKey="y" stroke="#cbd5f5" tick={{ fontSize: 12 }} name={yColumn} />
                <ZAxis range={[30, 30]} />
                <Tooltip
                  contentStyle={{ background: "#0b1220", border: "1px solid #334155" }}
                  cursor={{ strokeDasharray: "3 3" }}
                />
                <Legend />
                {chartSeries.map((series) => (
                  <Scatter
                    key={series.id}
                    name={series.name}
                    data={series.data.map((p) => ({ x: p.x, y: p.y }))}
                    fill={series.color}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            )}
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}
