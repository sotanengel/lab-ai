import Link from "next/link";
import { fetchExperiments } from "@/lib/api-client";

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
    <main className="px-8 py-12 max-w-5xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold">Lab AI</h1>
        <p className="text-sm opacity-80 mt-2">
          研究実験結果を取込・可視化し、AI からアドバイスを受け取るプラットフォーム
        </p>
      </header>

      <section className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold mb-4">実験セット一覧</h2>
        {errorMessage ? (
          <p className="text-sm text-red-300">
            API への接続に失敗しました: {errorMessage}
          </p>
        ) : experiments && experiments.items.length > 0 ? (
          <ul className="space-y-2">
            {experiments.items.map((exp) => (
              <li
                key={exp.id}
                className="flex items-center justify-between rounded-md bg-white/5 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{exp.name}</div>
                  <div className="text-xs opacity-70">
                    {exp.rowCount} 行 · {new Date(exp.createdAt).toLocaleString("ja-JP")}
                  </div>
                </div>
                <Link
                  href={`/experiments/${exp.id}`}
                  className="text-sm text-[var(--accent)] underline"
                >
                  詳細
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">
            まだ実験セットがありません。CSV / TSV / JSON ファイルから取り込みを開始してください。
          </p>
        )}
      </section>

      <section className="mt-10 rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold mb-4">Phase 1 スコープ</h2>
        <ul className="list-disc list-inside space-y-1 text-sm opacity-85">
          <li>Monorepo（pnpm workspace）とコンテナ起動（docker compose up）</li>
          <li>SQLite + Drizzle ORM による実験データ永続化</li>
          <li>Hono + Zod による型安全 REST API</li>
          <li>Takumi Guard（CI + ローカル .npmrc）によるサプライチェーン保護</li>
        </ul>
      </section>
    </main>
  );
}
