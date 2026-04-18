import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartsWorkbench } from "./ChartsWorkbench";
import {
  ApiError,
  fetchExperiment,
  fetchExperimentRows,
} from "@/lib/api-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExperimentChartsPage({ params }: PageProps) {
  const { id } = await params;
  try {
    const [detail, rowsRes] = await Promise.all([
      fetchExperiment(id),
      fetchExperimentRows(id, { limit: 10_000, offset: 0 }),
    ]);

    return (
      <div className="px-6 py-8 max-w-6xl mx-auto w-full space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs opacity-70">
              <Link href="/" className="underline">
                実験一覧
              </Link>
              {" / "}
              <Link href={`/experiments/${detail.id}`} className="underline">
                {detail.name}
              </Link>
              {" / "}グラフ
            </div>
            <h1 className="mt-1 text-2xl font-bold">{detail.name} — 可視化</h1>
          </div>
          <Link
            href={`/experiments/${detail.id}`}
            className="text-sm opacity-80 underline"
          >
            ← 詳細に戻る
          </Link>
        </header>

        <ChartsWorkbench detail={detail} rows={rowsRes.items} />
      </div>
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}
