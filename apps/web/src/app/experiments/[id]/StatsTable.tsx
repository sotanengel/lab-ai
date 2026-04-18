import type { ExperimentStats } from "@lab-ai/shared";

function formatValue(v: number | null): string {
  if (v === null) return "—";
  if (Math.abs(v) >= 1_000_000 || (v !== 0 && Math.abs(v) < 0.001)) {
    return v.toExponential(3);
  }
  return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function StatsTable({ stats }: { stats: readonly ExperimentStats[] }) {
  if (stats.length === 0) {
    return <p className="text-sm opacity-70">統計対象のカラムがありません。</p>;
  }
  return (
    <div className="overflow-auto rounded-md border border-white/10">
      <table className="w-full text-xs">
        <thead className="bg-white/5 uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2 text-left">カラム</th>
            <th className="px-3 py-2 text-right">件数</th>
            <th className="px-3 py-2 text-right">NULL</th>
            <th className="px-3 py-2 text-right">min</th>
            <th className="px-3 py-2 text-right">max</th>
            <th className="px-3 py-2 text-right">mean</th>
            <th className="px-3 py-2 text-right">median</th>
            <th className="px-3 py-2 text-right">stddev</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.column} className="border-t border-white/5">
              <td className="px-3 py-2 font-mono">{s.column}</td>
              <td className="px-3 py-2 text-right">{s.count.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{s.nullCount.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{formatValue(s.min)}</td>
              <td className="px-3 py-2 text-right">{formatValue(s.max)}</td>
              <td className="px-3 py-2 text-right">{formatValue(s.mean)}</td>
              <td className="px-3 py-2 text-right">{formatValue(s.median)}</td>
              <td className="px-3 py-2 text-right">{formatValue(s.stddev)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
