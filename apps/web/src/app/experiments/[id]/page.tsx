import {
  ApiError,
  fetchExperiment,
  fetchExperimentRows,
  fetchExperimentStats,
} from "@/lib/api-client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExperimentActions } from "./ExperimentActions";
import { IntegrityChecker } from "./IntegrityChecker";
import { StatsTable } from "./StatsTable";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExperimentDetailPage({ params }: PageProps) {
  const { id } = await params;
  try {
    const [detail, rowsRes, statsRes] = await Promise.all([
      fetchExperiment(id),
      fetchExperimentRows(id, { limit: 100, offset: 0 }),
      fetchExperimentStats(id),
    ]);

    return (
      <div className="px-6 py-10 max-w-6xl mx-auto w-full space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs opacity-70">
              <Link href="/" className="underline">
                実験一覧
              </Link>
              {" / "}
              {detail.id}
            </div>
            <h1 className="mt-1 text-3xl font-bold">{detail.name}</h1>
            {detail.description && (
              <p className="mt-2 text-sm opacity-80 whitespace-pre-wrap">{detail.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs opacity-80">
              <span>{detail.sourceFormat.toUpperCase()}</span>
              <span>·</span>
              <span>{detail.rowCount.toLocaleString()} 行</span>
              <span>·</span>
              <span>{detail.columns.length} カラム</span>
              <span>·</span>
              <span>登録日 {new Date(detail.registeredAt).toLocaleString("ja-JP")}</span>
              {detail.sourceFilename && (
                <>
                  <span>·</span>
                  <span>
                    元ファイル <span className="font-mono">{detail.sourceFilename}</span>
                  </span>
                </>
              )}
            </div>
            {detail.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {detail.tags.map((tag) => (
                  <span key={tag} className="rounded-sm bg-white/10 px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href={`/experiments/${detail.id}/charts`}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              グラフを開く →
            </Link>
            <ExperimentActions id={detail.id} />
          </div>
        </header>

        <section className="rounded-md border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-3">カラム定義</h2>
          <div className="overflow-auto rounded-md border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">名前</th>
                  <th className="px-3 py-2 text-left">型</th>
                  <th className="px-3 py-2 text-left">単位</th>
                </tr>
              </thead>
              <tbody>
                {detail.columns.map((col) => (
                  <tr key={col.id} className="border-t border-white/5">
                    <td className="px-3 py-2 font-mono">{col.name}</td>
                    <td className="px-3 py-2">{col.type}</td>
                    <td className="px-3 py-2 opacity-70">{col.unit ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-3">統計サマリ</h2>
          <StatsTable stats={statsRes.stats} />
        </section>

        <IntegrityChecker
          experimentId={detail.id}
          registeredHash={detail.sourceHash}
          sourceFormat={detail.sourceFormat}
        />

        <section className="rounded-md border border-white/10 bg-white/5 p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">データ（先頭 100 行）</h2>
          </div>
          <div className="overflow-auto rounded-md border border-white/10 max-h-[480px]">
            <table className="w-full text-xs">
              <thead className="bg-white/5 sticky top-0">
                <tr>
                  {detail.columns.map((col) => (
                    <th key={col.id} className="whitespace-nowrap px-3 py-2 text-left">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsRes.items.map((row, idx) => (
                  <tr key={idx} className="border-t border-white/5">
                    {detail.columns.map((col) => (
                      <td key={col.id} className="whitespace-nowrap px-3 py-1.5 opacity-85">
                        {formatCellValue(row[col.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
