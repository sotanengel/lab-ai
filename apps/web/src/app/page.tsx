import { fetchExperiments } from "@/lib/api-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let experiments: Awaited<ReturnType<typeof fetchExperiments>> | null = null;
  let errorMessage: string | null = null;
  try {
    experiments = await fetchExperiments();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto w-full">
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">実験セット一覧</h1>
          <p className="text-sm opacity-80 mt-1">
            取込済みの実験を管理し、可視化・AI アドバイスへ進みます。
          </p>
        </div>
        <Link
          href="/experiments/new"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          + 新規取込
        </Link>
      </header>

      {errorMessage ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          API への接続に失敗しました: {errorMessage}
        </p>
      ) : experiments && experiments.items.length > 0 ? (
        <ul className="space-y-2">
          {experiments.items.map((exp) => (
            <li
              key={exp.id}
              className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{exp.name}</div>
                <div className="text-xs opacity-70 mt-1 flex flex-wrap gap-2">
                  <span>{exp.rowCount.toLocaleString()} 行</span>
                  <span>·</span>
                  <span>{exp.sourceFormat.toUpperCase()}</span>
                  <span>·</span>
                  <span>{new Date(exp.createdAt).toLocaleString("ja-JP")}</span>
                  {exp.tags.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex gap-1 flex-wrap">
                        {exp.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Link
                  href={`/experiments/${exp.id}`}
                  className="text-[var(--accent)] underline whitespace-nowrap"
                >
                  詳細
                </Link>
                <Link
                  href={`/experiments/${exp.id}/charts`}
                  className="text-[var(--accent)] underline whitespace-nowrap"
                >
                  グラフ
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md border border-dashed border-white/15 p-8 text-center opacity-80">
          <p>まだ実験セットがありません。</p>
          <Link
            href="/experiments/new"
            className="mt-4 inline-block text-[var(--accent)] underline"
          >
            最初の実験を取り込む →
          </Link>
        </div>
      )}
    </div>
  );
}
