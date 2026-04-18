"use client";

import { useToast } from "@/components/ToastProvider";
import { archiveExperiment, duplicateExperiment, exportExperimentUrl } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ExperimentActions({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const onArchive = () => {
    if (!confirm("この実験セットをアーカイブしますか？")) return;
    startTransition(async () => {
      try {
        await archiveExperiment(id);
        toast.show({ kind: "success", message: "アーカイブしました" });
        router.push("/");
        router.refresh();
      } catch (err) {
        toast.show({
          kind: "error",
          message: "アーカイブに失敗しました",
          detail: err instanceof Error ? err.message : "unknown",
        });
      }
    });
  };

  const onDuplicate = () => {
    startTransition(async () => {
      try {
        const copy = await duplicateExperiment(id);
        toast.show({ kind: "success", message: `「${copy.name}」を作成しました` });
        router.push(`/experiments/${copy.id}`);
        router.refresh();
      } catch (err) {
        toast.show({
          kind: "error",
          message: "複製に失敗しました",
          detail: err instanceof Error ? err.message : "unknown",
        });
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
        <a
          href={exportExperimentUrl(id, "xlsx")}
          className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/15"
          download
        >
          XLSX
        </a>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDuplicate}
          disabled={isPending}
          className="rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/5 disabled:opacity-50"
        >
          複製
        </button>
        <button
          type="button"
          onClick={onArchive}
          disabled={isPending}
          className="rounded-md border border-red-500/40 px-3 py-1.5 text-red-200 hover:bg-red-500/10 disabled:opacity-50"
        >
          {isPending ? "処理中..." : "アーカイブ"}
        </button>
      </div>
    </div>
  );
}
