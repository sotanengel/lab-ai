import { fetchExperiments } from "@/lib/api-client";
import Link from "next/link";
import { CompareWorkbench } from "./CompareWorkbench";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

export default async function CompareExperimentsPage({ searchParams }: PageProps) {
  const { ids } = await searchParams;
  const selected = ids ? ids.split(",").filter(Boolean) : [];
  let available: Awaited<ReturnType<typeof fetchExperiments>>["items"] = [];
  let errorMessage: string | null = null;
  try {
    const res = await fetchExperiments({ limit: 200 });
    available = res.items;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto w-full space-y-8 relative z-10">
      <header>
        <div className="text-xs text-white/30 mb-2">
          <Link href="/" className="hover:text-white/60 transition-colors">
            実験一覧
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white/50">比較</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">実験セット比較</h1>
        <p className="text-sm text-white/40 mt-1.5">
          共通のカラムを持つ複数の実験セットを選択して、同じグラフに重ね描きします。
        </p>
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
            <h3 className="text-sm font-medium text-red-300">データの取得に失敗しました</h3>
            <p className="text-sm text-red-300/60 mt-1">{errorMessage}</p>
          </div>
        </div>
      ) : (
        <CompareWorkbench available={available} initialSelected={selected} />
      )}
    </div>
  );
}
