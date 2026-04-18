import { fetchExperiments } from "@/lib/api-client";
import Link from "next/link";
import { HomeList } from "./HomeList";

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
    <div className="px-6 py-10 max-w-6xl mx-auto w-full relative z-10">
      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">実験セット一覧</h1>
          <p className="text-sm text-white/40 mt-1.5">
            取込済みの実験を管理し、可視化・AI アドバイスへ進みます。
          </p>
        </div>
        <Link href="/experiments/new" className="btn-primary">
          <svg
            aria-hidden="true"
            role="presentation"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="8" y1="3" x2="8" y2="13" />
            <line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          新規取込
        </Link>
      </header>

      {errorMessage ? (
        <div className="error-card flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-300">API への接続に失敗しました</h3>
            <p className="text-sm text-red-300/60 mt-1">{errorMessage}</p>
            <p className="text-xs text-white/30 mt-3">
              バックエンドサーバーが起動しているか確認してください。
            </p>
          </div>
        </div>
      ) : (
        <HomeList initialItems={experiments?.items ?? []} />
      )}
    </div>
  );
}
