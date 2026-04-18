"use client";

import type { ColumnDefinition, ExperimentDetail, ExperimentRow } from "@lab-ai/shared";
import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
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
import {
  buildHistogram,
  extractNumericSeries,
  isNumericColumn,
  toNumberOrNull,
} from "@/lib/chart-utils";

type ChartKind = "line" | "scatter" | "bar" | "histogram";

const CHART_LABELS: Record<ChartKind, string> = {
  line: "折れ線",
  scatter: "散布図",
  bar: "棒グラフ",
  histogram: "ヒストグラム",
};

interface Props {
  detail: ExperimentDetail;
  rows: ExperimentRow[];
}

export function ChartsWorkbench({ detail, rows }: Props) {
  const [chartKind, setChartKind] = useState<ChartKind>("line");
  const [xColumn, setXColumn] = useState<string>(() => detail.columns[0]?.name ?? "");
  const [yColumns, setYColumns] = useState<string[]>(() => {
    const firstNumeric = detail.columns.find(isNumericColumn);
    return firstNumeric ? [firstNumeric.name] : [];
  });
  const [categoryColumn, setCategoryColumn] = useState<string>("");
  const [binCount, setBinCount] = useState<number>(20);
  const containerRef = useRef<HTMLDivElement>(null);

  const numericColumns = useMemo(
    () => detail.columns.filter(isNumericColumn),
    [detail.columns],
  );

  const toggleY = (name: string) => {
    setYColumns((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const chartData = useMemo(() => prepareChartData(rows, xColumn, yColumns), [rows, xColumn, yColumns]);
  const histogramSource = yColumns[0] ?? xColumn;
  const histogramData = useMemo(
    () => buildHistogram(extractNumericSeries(rows, histogramSource), binCount),
    [rows, histogramSource, binCount],
  );
  const barData = useMemo(
    () => buildBarData(rows, xColumn, yColumns, categoryColumn),
    [rows, xColumn, yColumns, categoryColumn],
  );

  const exportPng = async () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    const rect = svg.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `${safeFilename(detail.name)}-${chartKind}.png`);
    });
  };

  const exportSvg = () => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, `${safeFilename(detail.name)}-${chartKind}.svg`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-5 rounded-md border border-white/10 bg-white/5 p-4 text-sm">
        <div>
          <label className="block text-xs uppercase opacity-70 mb-1">チャート種</label>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(CHART_LABELS) as ChartKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setChartKind(kind)}
                className={`rounded-md px-2 py-1.5 text-xs ${
                  chartKind === kind
                    ? "bg-[var(--accent)] text-white"
                    : "bg-white/10 hover:bg-white/15"
                }`}
              >
                {CHART_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>

        {chartKind !== "histogram" && (
          <ColumnPicker
            label="X 軸"
            columns={detail.columns}
            value={xColumn}
            onChange={setXColumn}
          />
        )}

        <div>
          <div className="mb-1 text-xs uppercase opacity-70">
            {chartKind === "histogram" ? "対象カラム（数値）" : "Y 軸（数値・複数選択可）"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {numericColumns.length === 0 ? (
              <p className="text-xs opacity-60">数値カラムがありません</p>
            ) : (
              numericColumns.map((col) => {
                const active = yColumns.includes(col.name);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      if (chartKind === "histogram") {
                        setYColumns([col.name]);
                      } else {
                        toggleY(col.name);
                      }
                    }}
                    className={`rounded-md px-2 py-1 text-xs ${
                      active
                        ? "bg-[var(--accent)] text-white"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    {col.name}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {chartKind === "bar" && (
          <div>
            <label className="block text-xs uppercase opacity-70 mb-1">
              カテゴリ列（任意）
            </label>
            <select
              value={categoryColumn}
              onChange={(e) => setCategoryColumn(e.target.value)}
              className="w-full rounded-md bg-white/10 px-2 py-1.5 text-sm"
            >
              <option value="">— なし —</option>
              {detail.columns
                .filter((col) => !isNumericColumn(col))
                .map((col) => (
                  <option key={col.id} value={col.name}>
                    {col.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {chartKind === "histogram" && (
          <div>
            <label className="block text-xs uppercase opacity-70 mb-1">
              ビン数: {binCount}
            </label>
            <input
              type="range"
              min={4}
              max={80}
              value={binCount}
              onChange={(e) => setBinCount(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={exportPng}
            className="rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15"
          >
            PNG 保存
          </button>
          <button
            type="button"
            onClick={exportSvg}
            className="rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15"
          >
            SVG 保存
          </button>
        </div>
      </aside>

      <section
        ref={containerRef}
        className="rounded-md border border-white/10 bg-white/5 p-4 min-h-[480px]"
      >
        {chartKind === "line" && (
          <LineChartView data={chartData} xColumn={xColumn} yColumns={yColumns} />
        )}
        {chartKind === "scatter" && (
          <ScatterChartView data={chartData} xColumn={xColumn} yColumns={yColumns} />
        )}
        {chartKind === "bar" && (
          <BarChartView
            data={barData.data}
            xColumn={xColumn}
            yColumns={yColumns}
            categories={barData.categories}
            categoryColumn={categoryColumn}
          />
        )}
        {chartKind === "histogram" && (
          <HistogramView columnName={histogramSource} bins={histogramData} />
        )}
      </section>
    </div>
  );
}

interface ColumnPickerProps {
  label: string;
  columns: readonly ColumnDefinition[];
  value: string;
  onChange: (v: string) => void;
}

function ColumnPicker({ label, columns, value, onChange }: ColumnPickerProps) {
  return (
    <div>
      <label className="block text-xs uppercase opacity-70 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md bg-white/10 px-2 py-1.5 text-sm"
      >
        {columns.map((col) => (
          <option key={col.id} value={col.name}>
            {col.name} ({col.type})
          </option>
        ))}
      </select>
    </div>
  );
}

interface ChartPoint {
  x: number | string;
  [key: string]: number | string | null;
}

function prepareChartData(
  rows: readonly ExperimentRow[],
  xColumn: string,
  yColumns: readonly string[],
): ChartPoint[] {
  const data: ChartPoint[] = [];
  for (const row of rows) {
    const rawX = row[xColumn];
    const x = toNumberOrNull(rawX) ?? (rawX === null || rawX === undefined ? "" : String(rawX));
    const point: ChartPoint = { x };
    for (const y of yColumns) {
      point[y] = toNumberOrNull(row[y]);
    }
    data.push(point);
  }
  return data;
}

interface BarDataResult {
  data: Array<Record<string, number | string>>;
  categories: string[];
}

function buildBarData(
  rows: readonly ExperimentRow[],
  xColumn: string,
  yColumns: readonly string[],
  categoryColumn: string,
): BarDataResult {
  const primaryY = yColumns[0];
  if (!primaryY) return { data: [], categories: [] };

  const buckets = new Map<string, Map<string, { sum: number; count: number }>>();
  const categorySet = new Set<string>();

  for (const row of rows) {
    const xKey = row[xColumn] === null || row[xColumn] === undefined
      ? ""
      : String(row[xColumn]);
    const catKey = categoryColumn
      ? row[categoryColumn] === null || row[categoryColumn] === undefined
        ? ""
        : String(row[categoryColumn])
      : primaryY;
    const y = toNumberOrNull(row[primaryY]);
    if (y === null) continue;
    categorySet.add(catKey);
    let perCat = buckets.get(xKey);
    if (!perCat) {
      perCat = new Map();
      buckets.set(xKey, perCat);
    }
    const current = perCat.get(catKey) ?? { sum: 0, count: 0 };
    current.sum += y;
    current.count += 1;
    perCat.set(catKey, current);
  }

  const data = Array.from(buckets.entries()).map(([xKey, perCat]) => {
    const entry: Record<string, number | string> = { x: xKey };
    for (const [cat, { sum, count }] of perCat) {
      entry[cat] = count > 0 ? sum / count : 0;
    }
    return entry;
  });
  return { data, categories: [...categorySet] };
}

const SERIES_COLORS = ["#4f8cff", "#f59e0b", "#10b981", "#e11d48", "#8b5cf6", "#14b8a6"];

function LineChartView({
  data,
  xColumn,
  yColumns,
}: {
  data: ChartPoint[];
  xColumn: string;
  yColumns: string[];
}) {
  if (yColumns.length === 0) return <EmptyState message="Y 軸カラムを選択してください" />;
  return (
    <ResponsiveContainer width="100%" height={480}>
      <LineChart data={data} margin={{ top: 12, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="x" stroke="#cbd5f5" tick={{ fontSize: 12 }} label={{ value: xColumn, position: "insideBottom", offset: -10, fill: "#cbd5f5" }} />
        <YAxis stroke="#cbd5f5" tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #334155" }} />
        <Legend />
        {yColumns.map((y, i) => (
          <Line
            key={y}
            type="monotone"
            dataKey={y}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function ScatterChartView({
  data,
  xColumn,
  yColumns,
}: {
  data: ChartPoint[];
  xColumn: string;
  yColumns: string[];
}) {
  if (yColumns.length === 0) return <EmptyState message="Y 軸カラムを選択してください" />;
  return (
    <ResponsiveContainer width="100%" height={480}>
      <ScatterChart margin={{ top: 12, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="x" stroke="#cbd5f5" tick={{ fontSize: 12 }} name={xColumn} />
        <YAxis stroke="#cbd5f5" tick={{ fontSize: 12 }} />
        <ZAxis range={[30, 30]} />
        <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #334155" }} cursor={{ strokeDasharray: "3 3" }} />
        <Legend />
        {yColumns.map((y, i) => (
          <Scatter
            key={y}
            name={y}
            data={data.map((p) => ({ x: p.x, y: p[y] }))}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function BarChartView({
  data,
  xColumn,
  yColumns,
  categories,
  categoryColumn,
}: {
  data: Array<Record<string, number | string>>;
  xColumn: string;
  yColumns: string[];
  categories: string[];
  categoryColumn: string;
}) {
  if (yColumns.length === 0 || data.length === 0) {
    return <EmptyState message="Y 軸カラムを選択してください" />;
  }
  const seriesKeys = categoryColumn ? categories : [yColumns[0] as string];
  return (
    <ResponsiveContainer width="100%" height={480}>
      <BarChart data={data} margin={{ top: 12, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="x" stroke="#cbd5f5" tick={{ fontSize: 12 }} label={{ value: xColumn, position: "insideBottom", offset: -10, fill: "#cbd5f5" }} />
        <YAxis stroke="#cbd5f5" tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #334155" }} />
        <Legend />
        {seriesKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function HistogramView({
  columnName,
  bins,
}: {
  columnName: string;
  bins: Array<{ label: string; count: number }>;
}) {
  if (bins.length === 0) {
    return <EmptyState message="ヒストグラム対象の数値カラムを選択してください" />;
  }
  return (
    <ResponsiveContainer width="100%" height={480}>
      <BarChart data={bins} margin={{ top: 12, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="label" stroke="#cbd5f5" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(bins.length / 10))} />
        <YAxis stroke="#cbd5f5" tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #334155" }} />
        <Bar dataKey="count" fill={SERIES_COLORS[0]} name={columnName} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[480px] items-center justify-center text-sm opacity-70">
      {message}
    </div>
  );
}

function safeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9_.-]+/g, "_");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
