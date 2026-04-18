"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveExperiment, exportExperimentUrl } from "@/lib/api-client";

export function ExperimentActions({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onArchive = () => {
    if (!confirm("この実験セットをアーカイブしますか？")) return;
    setError(null);
    startTransition(async () => {
      try {
        await archiveExperiment(id);
        router.push("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2 text-sm">
      <div className="flex gap-2">
        <a
          href={exportExperimentUrl(id, "csv")}
          className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/15"
          download
        >
          CSV
        </a>
        <a
          href={exportExperimentUrl(id, "json")}
          className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/15"
          download
        >
          JSON
        </a>
      </div>
      <button
        type="button"
        onClick={onArchive}
        disabled={isPending}
        className="rounded-md border border-red-500/40 px-3 py-1.5 text-red-200 hover:bg-red-500/10 disabled:opacity-50"
      >
        {isPending ? "処理中..." : "アーカイブ"}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
