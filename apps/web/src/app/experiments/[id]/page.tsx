import { Markdown } from "@/components/Markdown";
import {
  ApiError,
  fetchAdviceNotes,
  fetchExperiment,
  fetchExperimentNotes,
  fetchExperimentRowsFull,
  fetchExperimentStats,
} from "@/lib/api-client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditableRowsTable } from "./EditableRowsTable";
import { ExperimentActions } from "./ExperimentActions";
import { IntegrityChecker } from "./IntegrityChecker";
import { NotesPanel } from "./NotesPanel";
import { StatsTable } from "./StatsTable";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExperimentDetailPage({ params }: PageProps) {
  const { id } = await params;
  try {
    const [detail, rowsRes, statsRes, notesRes, userNotesRes] = await Promise.all([
      fetchExperiment(id),
      fetchExperimentRowsFull(id, { limit: 200, offset: 0 }),
      fetchExperimentStats(id),
      fetchAdviceNotes(id),
      fetchExperimentNotes(id),
    ]);

    return (
      <div className="px-6 py-10 max-w-6xl mx-auto w-full space-y-8 relative z-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-white/30 mb-2">
              <Link href="/" className="hover:text-white/60 transition-colors">
                実験一覧
              </Link>
              <span className="mx-2">/</span>
              <span className="text-white/50">{detail.name}</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{detail.name}</h1>
            {detail.description && (
              <p className="mt-2 text-sm text-white/50 whitespace-pre-wrap">{detail.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/35">
              <span className="inline-flex items-center gap-1">
                <svg
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  opacity="0.5"
                >
                  <path d="M4 1h8l3 3v11H1V1h3zm1 1v3h6V2H5z" />
                </svg>
                {detail.sourceFormat.toUpperCase()}
              </span>
              <span>{detail.rowCount.toLocaleString()} 行</span>
              <span>{detail.columns.length} カラム</span>
              <span>登録日 {new Date(detail.registeredAt).toLocaleString("ja-JP")}</span>
              {detail.sourceFilename && (
                <span>
                  元ファイル{" "}
                  <span className="font-mono text-white/25">{detail.sourceFilename}</span>
                </span>
              )}
            </div>
            {detail.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.tags.map((tag) => (
                  <span key={tag} className="badge">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link href={`/experiments/${detail.id}/charts`} className="btn-primary">
              グラフを開く
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="8" x2="12" y2="8" />
                <polyline points="9 5 12 8 9 11" />
              </svg>
            </Link>
            <ExperimentActions id={detail.id} />
          </div>
        </header>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-white mb-4">カラム定義</h2>
          <div className="overflow-auto rounded-lg border border-white/[0.06]">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-xs text-white/40 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 text-left">名前</th>
                  <th className="px-4 py-2.5 text-left">型</th>
                  <th className="px-4 py-2.5 text-left">単位</th>
                </tr>
              </thead>
              <tbody>
                {detail.columns.map((col) => (
                  <tr key={col.id} className="border-t border-white/[0.04]">
                    <td className="px-4 py-2.5 font-mono text-white/70">{col.name}</td>
                    <td className="px-4 py-2.5 text-white/50">{col.type}</td>
                    <td className="px-4 py-2.5 text-white/30">{col.unit ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-white mb-4">統計サマリ</h2>
          <StatsTable stats={statsRes.stats} />
        </section>

        <IntegrityChecker
          experimentId={detail.id}
          registeredHash={detail.sourceHash}
          sourceFormat={detail.sourceFormat}
        />

        <NotesPanel experimentId={detail.id} initialNotes={userNotesRes.items} />

        {notesRes.items.length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-semibold text-white mb-4">AI アドバイスノート</h2>
            <ul className="space-y-3">
              {notesRes.items.map((note) => (
                <li
                  key={note.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="text-xs text-white/30">
                    {new Date(note.createdAt).toLocaleString("ja-JP")}
                  </div>
                  <div className="mt-1 font-medium text-white/80">{note.title}</div>
                  <div className="mt-2 text-sm text-white/60">
                    <Markdown>{note.body}</Markdown>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-white">
              データ（先頭 {rowsRes.items.length} 行）
            </h2>
            <span className="text-xs text-white/25">セル単位の編集・行削除に対応</span>
          </div>
          <EditableRowsTable
            experimentId={detail.id}
            columns={detail.columns}
            initialRows={rowsRes.items}
          />
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
