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
    <div className="px-6 py-10 max-w-6xl mx-auto w-full space-y-6">
      <header>
        <div className="text-xs opacity-70">
          <Link href="/" className="underline">
            実験一覧
          </Link>
          {" / "}比較
        </div>
        <h1 className="mt-1 text-3xl font-bold">実験セット比較</h1>
        <p className="text-sm opacity-80 mt-1">
          共通のカラムを持つ複数の実験セットを選択して、同じグラフに重ね描きします。
        </p>
      </header>
      {errorMessage ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : (
        <CompareWorkbench available={available} initialSelected={selected} />
      )}
    </div>
  );
}
