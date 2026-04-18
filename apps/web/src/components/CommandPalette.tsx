"use client";

import { fetchExperiments } from "@/lib/api-client";
import type { ExperimentMeta } from "@lab-ai/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  action?: () => void;
  keywords?: string;
}

const BASE_COMMANDS: CommandItem[] = [
  { id: "nav:home", label: "ホームへ", hint: "実験一覧", href: "/", keywords: "home list" },
  {
    id: "nav:new",
    label: "新規取込",
    hint: "データファイルをアップロード",
    href: "/experiments/new",
    keywords: "import upload",
  },
  {
    id: "nav:compare",
    label: "実験を比較",
    hint: "複数実験を重ね描き",
    href: "/compare",
    keywords: "compare overlay",
  },
  {
    id: "nav:dashboard",
    label: "ダッシュボード",
    hint: "タイル表示",
    href: "/dashboard",
    keywords: "dashboard tiles",
  },
  {
    id: "nav:context",
    label: "コンテキスト文書",
    hint: "PDF / URL / テキスト",
    href: "/context",
    keywords: "context papers",
  },
];

function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  if (h.includes(n)) return 60;
  // Subsequence match
  let hi = 0;
  for (const c of n) {
    const found = h.indexOf(c, hi);
    if (found === -1) return -1;
    hi = found + 1;
  }
  return 20;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [experiments, setExperiments] = useState<ExperimentMeta[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Lazy-load experiments the first time the palette opens
  useEffect(() => {
    if (!open || loaded) return;
    fetchExperiments({ limit: 200 })
      .then((res) => {
        setExperiments(res.items);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, [open, loaded]);

  // Reset cursor + focus input on open
  useEffect(() => {
    if (open) {
      setCursor(0);
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo(() => {
    const experimentItems: CommandItem[] = experiments.map((exp) => ({
      id: `exp:${exp.id}`,
      label: exp.name,
      hint: `${exp.rowCount.toLocaleString()} 行 · ${new Date(exp.registeredAt).toLocaleDateString("ja-JP")}`,
      href: `/experiments/${exp.id}`,
      keywords: [exp.name, exp.description ?? "", exp.tags.join(" ")].join(" "),
    }));
    return [...BASE_COMMANDS, ...experimentItems];
  }, [experiments]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 20);
    const scored = items
      .map((item) => ({
        item,
        score: Math.max(
          fuzzyScore(item.label, query),
          fuzzyScore(item.hint ?? "", query) - 10,
          fuzzyScore(item.keywords ?? "", query) - 10,
        ),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
    return scored.map((s) => s.item);
  }, [items, query]);

  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [cursor, filtered.length]);

  const trigger = useCallback(
    (item: CommandItem) => {
      if (item.action) {
        item.action();
      } else if (item.href) {
        router.push(item.href);
      }
      setOpen(false);
    },
    [router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[cursor];
      if (item) trigger(item);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="コマンドパレットを閉じる"
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        className="relative w-full max-w-xl rounded-lg border border-white/10 bg-[#0f172a] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="border-b border-white/10 px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="実験名 / ページを検索..."
            className="w-full bg-transparent text-sm outline-none placeholder:opacity-50"
          />
        </div>
        <div className="max-h-[50vh] overflow-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-xs opacity-60">該当なし</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-current={i === cursor ? "true" : undefined}
                onMouseEnter={() => setCursor(i)}
                onClick={() => trigger(item)}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                  i === cursor ? "bg-white/10" : ""
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="truncate text-[11px] opacity-60">{item.hint}</span>}
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] opacity-60">
          <span>↑↓ 選択 · Enter 決定 · Esc 閉じる</span>
          <span>⌘/Ctrl + K で開く</span>
        </div>
      </div>
    </div>
  );
}
