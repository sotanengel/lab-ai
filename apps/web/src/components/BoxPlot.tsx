"use client";

import { computeBoxStats } from "@/lib/chart-utils";

interface SeriesInput {
  label: string;
  values: readonly number[];
  color: string;
}

interface Props {
  series: readonly SeriesInput[];
  height?: number;
}

const PADDING = { top: 30, right: 30, bottom: 50, left: 60 } as const;

export function BoxPlot({ series, height = 480 }: Props) {
  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm opacity-70" style={{ height }}>
        箱ひげ図に表示する数値カラムを選択してください
      </div>
    );
  }
  const computed = series
    .map((s) => ({
      label: s.label,
      color: s.color,
      count: s.values.length,
      stats: computeBoxStats(s.values),
    }))
    .filter(
      (
        s,
      ): s is {
        label: string;
        color: string;
        count: number;
        stats: NonNullable<ReturnType<typeof computeBoxStats>>;
      } => s.stats !== null,
    );

  if (computed.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm opacity-70" style={{ height }}>
        対象カラムに数値データがありません
      </div>
    );
  }

  const allValues = computed.flatMap((s) => [s.stats.min, s.stats.max, ...s.stats.outliers]);
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yRange = yMax - yMin || 1;

  const width = 720;
  const innerH = height - PADDING.top - PADDING.bottom;
  const innerW = width - PADDING.left - PADDING.right;
  const slot = innerW / computed.length;
  const boxWidth = Math.min(60, slot * 0.5);

  const yPos = (v: number) => PADDING.top + innerH - ((v - yMin) / yRange) * innerH;

  const ticks = niceTicks(yMin, yMax, 5);

  return (
    <div className="overflow-auto">
      <svg width={width} height={height} role="img" aria-label="Box plot">
        <rect x={0} y={0} width={width} height={height} fill="transparent" />
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={yPos(t)}
              y2={yPos(t)}
              stroke="#334155"
              strokeDasharray="3 3"
            />
            <text
              x={PADDING.left - 6}
              y={yPos(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="#cbd5f5"
            >
              {formatTick(t)}
            </text>
          </g>
        ))}
        {computed.map((s, i) => {
          const cx = PADDING.left + slot * (i + 0.5);
          const x0 = cx - boxWidth / 2;
          const x1 = cx + boxWidth / 2;
          return (
            <g key={s.label}>
              <line
                x1={cx}
                x2={cx}
                y1={yPos(s.stats.min)}
                y2={yPos(s.stats.max)}
                stroke={s.color}
                strokeWidth={1.5}
              />
              <line
                x1={cx - boxWidth / 4}
                x2={cx + boxWidth / 4}
                y1={yPos(s.stats.min)}
                y2={yPos(s.stats.min)}
                stroke={s.color}
                strokeWidth={1.5}
              />
              <line
                x1={cx - boxWidth / 4}
                x2={cx + boxWidth / 4}
                y1={yPos(s.stats.max)}
                y2={yPos(s.stats.max)}
                stroke={s.color}
                strokeWidth={1.5}
              />
              <rect
                x={x0}
                y={yPos(s.stats.q3)}
                width={boxWidth}
                height={Math.max(2, yPos(s.stats.q1) - yPos(s.stats.q3))}
                fill={s.color}
                fillOpacity={0.25}
                stroke={s.color}
                strokeWidth={1.5}
              />
              <line
                x1={x0}
                x2={x1}
                y1={yPos(s.stats.median)}
                y2={yPos(s.stats.median)}
                stroke={s.color}
                strokeWidth={2}
              />
              {s.stats.outliers.map((o, idx) => (
                <circle
                  key={`${s.label}-out-${idx}`}
                  cx={cx}
                  cy={yPos(o)}
                  r={3}
                  fill={s.color}
                  fillOpacity={0.7}
                  stroke={s.color}
                />
              ))}
              <text
                x={cx}
                y={height - PADDING.bottom + 18}
                textAnchor="middle"
                fontSize={11}
                fill="#cbd5f5"
              >
                {s.label}
              </text>
              <text
                x={cx}
                y={height - PADDING.bottom + 32}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
              >
                n={s.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function niceTicks(lo: number, hi: number, count: number): number[] {
  if (lo === hi) return [lo];
  const step = (hi - lo) / count;
  const out: number[] = [];
  for (let i = 0; i <= count; i += 1) out.push(lo + step * i);
  return out;
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01)) {
    return v.toExponential(2);
  }
  return v.toLocaleString(undefined, { maximumFractionDigits: 3 });
}
