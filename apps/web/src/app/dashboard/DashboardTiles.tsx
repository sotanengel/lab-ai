"use client";

import { fetchExperiment, fetchExperimentRows } from "@/lib/api-client";
import { isNumericColumn, toNumberOrNull } from "@/lib/chart-utils";
import type { ExperimentDetail, ExperimentMeta, ExperimentRow } from "@lab-ai/shared";
import { useCallback, useEffect, useState } from "react";
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

function generateTileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type TileKind = "line" | "scatter" | "bar";

interface Tile {
  id: string;
  experimentId: string;
  kind: TileKind;
  xColumn: string;
  yColumn: string;
}

interface Loaded {
  detail: ExperimentDetail;
  rows: ExperimentRow[];
}

const COLORS = ["#4f8cff", "#f59e0b", "#10b981", "#e11d48", "#8b5cf6", "#14b8a6"];
const STORAGE_KEY = "lab-ai:dashboard:v1";
const KIND_LABELS: Record<TileKind, string> = {
  line: "折れ線",
  scatter: "散布図",
  bar: "棒",
};

interface Props {
  experiments: ExperimentMeta[];
}

export function DashboardTiles({ experiments }: Props) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate tiles from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Tile[];
        if (Array.isArray(parsed)) setTiles(parsed);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tiles));
    } catch {
      // ignore
    }
  }, [tiles, hydrated]);

  // Load experiments referenced by tiles
  useEffect(() => {
    const missing = new Set(tiles.map((t) => t.experimentId).filter((id) => id && !loaded[id]));
    if (missing.size === 0) return;
    Promise.all(
      Array.from(missing).map(async (id) => {
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
      })
      .catch(() => {
        // ignore: individual tiles surface their own error
      });
  }, [tiles, loaded]);

  const addTile = useCallback(() => {
    const first = experiments[0];
    if (!first) return;
    setTiles((prev) => [
      ...prev,
      {
        id: generateTileId(),
        experimentId: first.id,
        kind: "line",
        xColumn: "",
        yColumn: "",
      },
    ]);
  }, [experiments]);

  const updateTile = useCallback((id: string, patch: Partial<Tile>) => {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const removeTile = useCallback((id: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (experiments.length === 0) {
    return (
      <p className="rounded-md border border-white/10 bg-white/5 p-5 text-sm opacity-80">
        表示する実験がありません。まず実験を取り込んでください。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs opacity-60">{tiles.length} タイル · 自動保存（ローカル）</p>
        <button
          type="button"
          onClick={addTile}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          + タイルを追加
        </button>
      </div>
      {tiles.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/15 p-10 text-center opacity-70">
          タイルがありません。「+ タイルを追加」から開始してください。
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tiles.map((tile) => (
            <DashboardTile
              key={tile.id}
              tile={tile}
              experiments={experiments}
              loaded={loaded[tile.experimentId]}
              onChange={(patch) => updateTile(tile.id, patch)}
              onRemove={() => removeTile(tile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TileProps {
  tile: Tile;
  experiments: ExperimentMeta[];
  loaded: Loaded | undefined;
  onChange: (patch: Partial<Tile>) => void;
  onRemove: () => void;
}

function DashboardTile({ tile, experiments, loaded, onChange, onRemove }: TileProps) {
  const detail = loaded?.detail;
  const rows = loaded?.rows ?? [];

  const firstCol = detail?.columns[0];
  const firstNumeric = detail?.columns.find(isNumericColumn);
  const effectiveX = tile.xColumn || firstCol?.name || "";
  const effectiveY = tile.yColumn || firstNumeric?.name || "";

  const data = detail
    ? rows
        .map((r) => ({
          x: toNumberOrNull(r[effectiveX]) ?? r[effectiveX] ?? "",
          y: toNumberOrNull(r[effectiveY]),
        }))
        .filter((p) => p.y !== null)
    : [];

  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select
          value={tile.experimentId}
          onChange={(e) => onChange({ experimentId: e.target.value, xColumn: "", yColumn: "" })}
          className="rounded-md bg-white/10 px-2 py-1 text-xs flex-1 min-w-0"
        >
          {experiments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          value={tile.kind}
          onChange={(e) => onChange({ kind: e.target.value as TileKind })}
          className="rounded-md bg-white/10 px-2 py-1 text-xs"
        >
          {(Object.keys(KIND_LABELS) as TileKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10"
        >
          削除
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <label className="flex items-center gap-1 text-xs opacity-80">
          X:
          <select
            value={effectiveX}
            onChange={(e) => onChange({ xColumn: e.target.value })}
            className="rounded-md bg-white/10 px-2 py-0.5 text-xs"
          >
            {detail?.columns.map((col) => (
              <option key={col.id} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs opacity-80">
          Y:
          <select
            value={effectiveY}
            onChange={(e) => onChange({ yColumn: e.target.value })}
            className="rounded-md bg-white/10 px-2 py-0.5 text-xs"
          >
            {detail?.columns.filter(isNumericColumn).map((col) => (
              <option key={col.id} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ height: 240 }}>
        {!detail ? (
          <div className="flex h-full items-center justify-center text-xs opacity-60">
            読み込み中...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs opacity-60">
            数値データがありません
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {tile.kind === "line" ? (
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="x" stroke="#cbd5f5" tick={{ fontSize: 10 }} />
                <YAxis stroke="#cbd5f5" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #334155" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="y"
                  name={effectiveY}
                  stroke={COLORS[0]}
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : tile.kind === "scatter" ? (
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="x" stroke="#cbd5f5" tick={{ fontSize: 10 }} />
                <YAxis dataKey="y" stroke="#cbd5f5" tick={{ fontSize: 10 }} />
                <ZAxis range={[30, 30]} />
                <Tooltip
                  contentStyle={{ background: "#0b1220", border: "1px solid #334155" }}
                  cursor={{ strokeDasharray: "3 3" }}
                />
                <Scatter name={effectiveY} data={data} fill={COLORS[0]} isAnimationActive={false} />
              </ScatterChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="x" stroke="#cbd5f5" tick={{ fontSize: 10 }} />
                <YAxis stroke="#cbd5f5" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #334155" }} />
                <Bar dataKey="y" name={effectiveY} fill={COLORS[0]} isAnimationActive={false} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
