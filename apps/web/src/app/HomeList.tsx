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
      <div className="card flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5">
          <svg
            aria-hidden="true"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/30"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-sm text-white/50 mb-1">まだ実験セットがありません。</p>
        <p className="text-xs text-white/30 mb-5">
          CSVやJSONファイルを取り込んで分析を始めましょう。
        </p>
        <Link href="/experiments/new" className="btn-primary text-sm">
          最初の実験を取り込む
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs text-white/40 hover:text-white/60 transition-colors">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="rounded border-white/20 bg-white/5 text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0"
          />
          {selected.size > 0 ? `${selected.size} 件選択中` : "すべて選択"}
        </label>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={archiveSelected}
            disabled={isPending}
            className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/15 hover:border-red-500/30 disabled:opacity-50 transition-all"
          >
            {isPending ? "処理中..." : `アーカイブ (${selected.size})`}
          </button>
        )}
      </div>

      {/* Experiment cards */}
      <ul className="space-y-2">
        {items.map((exp) => (
          <li
            key={exp.id}
            className={`group rounded-xl border px-5 py-4 transition-all cursor-default ${
              selected.has(exp.id)
                ? "border-[var(--accent)]/30 bg-[var(--accent)]/[0.06]"
                : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1]"
            }`}
          >
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selected.has(exp.id)}
                onChange={() => toggle(exp.id)}
                aria-label={`${exp.name} を選択`}
                className="flex-shrink-0 rounded border-white/20 bg-white/5 text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-white/90 truncate">{exp.name}</div>
                <div className="text-xs text-white/35 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <svg
                      aria-hidden="true"
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      opacity="0.5"
                    >
                      <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h8v2H2v-2z" />
                    </svg>
                    {exp.rowCount.toLocaleString()} 行
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg
                      aria-hidden="true"
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      opacity="0.5"
                    >
                      <path d="M4 1h8l3 3v11H1V1h3zm1 1v3h6V2H5z" />
                    </svg>
                    {exp.sourceFormat.toUpperCase()}
                  </span>
                  <span>{new Date(exp.createdAt).toLocaleDateString("ja-JP")}</span>
                  {exp.tags.length > 0 && (
                    <span className="flex gap-1.5 flex-wrap">
                      {exp.tags.map((tag) => (
                        <span key={tag} className="badge">
                          {tag}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/experiments/${exp.id}`} className="btn-secondary text-xs py-1 px-3">
                  詳細
                </Link>
                <Link
                  href={`/experiments/${exp.id}/charts`}
                  className="btn-primary text-xs py-1 px-3"
                >
                  グラフ
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
