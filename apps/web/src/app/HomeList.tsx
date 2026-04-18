"use client";

import { useToast } from "@/components/ToastProvider";
import { bulkArchiveExperiments } from "@/lib/api-client";
import type { ExperimentMeta } from "@lab-ai/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

interface Props {
  initialItems: ExperimentMeta[];
}

export function HomeList({ initialItems }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<ExperimentMeta[]>(initialItems);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allSelected = useMemo(
    () => items.length > 0 && items.every((i) => selected.has(i.id)),
    [items, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((i) => i.id));
    });
  };

  const archiveSelected = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} 件の実験をアーカイブしますか？`)) return;
    startTransition(async () => {
      try {
        const res = await bulkArchiveExperiments(ids);
        setItems((prev) => prev.filter((i) => !selected.has(i.id)));
        setSelected(new Set());
        toast.show({
          kind: "success",
          message: "アーカイブ完了",
          detail: `${res.archived} 件を一覧から外しました`,
        });
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

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/15 p-8 text-center opacity-80">
        <p>まだ実験セットがありません。</p>
        <Link href="/experiments/new" className="mt-4 inline-block text-[var(--accent)] underline">
          最初の実験を取り込む →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs opacity-80">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          {selected.size > 0 ? `${selected.size} 件選択中` : "すべて選択"}
        </label>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={archiveSelected}
            disabled={isPending}
            className="rounded-md border border-red-500/40 px-3 py-1 text-red-200 hover:bg-red-500/10 disabled:opacity-50"
          >
            {isPending ? "処理中..." : `選択をアーカイブ (${selected.size})`}
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((exp) => (
          <li
            key={exp.id}
            className={`flex items-center justify-between gap-4 rounded-md border px-4 py-3 ${
              selected.has(exp.id)
                ? "border-[var(--accent)]/50 bg-[var(--accent)]/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(exp.id)}
              onChange={() => toggle(exp.id)}
              aria-label={`${exp.name} を選択`}
            />
            <div className="min-w-0 flex-1">
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
    </div>
  );
}
