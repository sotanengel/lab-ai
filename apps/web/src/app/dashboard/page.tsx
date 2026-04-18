import { fetchExperiments } from "@/lib/api-client";
import Link from "next/link";
import { DashboardTiles } from "./DashboardTiles";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let items: Awaited<ReturnType<typeof fetchExperiments>>["items"] = [];
  let errorMessage: string | null = null;
  try {
    const res = await fetchExperiments({ limit: 200 });
    items = res.items;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto w-full space-y-6">
      <header>
        <div className="text-xs opacity-70">
          <Link href="/" className="underline">
            実験一覧
          </Link>
          {" / "}ダッシュボード
        </div>
        <h1 className="mt-1 text-3xl font-bold">ダッシュボード</h1>
        <p className="text-sm opacity-80 mt-1">
          複数のチャートをタイル配置で同時表示します。各タイルで実験・カラム・チャート種を選択できます。
        </p>
      </header>
      {errorMessage ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : (
        <DashboardTiles experiments={items} />
      )}
    </div>
  );
}
