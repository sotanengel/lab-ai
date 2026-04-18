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
      ) : (
        <HomeList initialItems={experiments?.items ?? []} />
      )}
    </div>
  );
}
