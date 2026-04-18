"use client";

import { useEffect, useState } from "react";

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "⌘/Ctrl + K", label: "コマンドパレットを開く" },
  { keys: "?", label: "このヘルプを表示" },
  { keys: "Esc", label: "開いているダイアログを閉じる" },
  { keys: "⌘/Ctrl + Enter", label: "AI チャットで送信" },
  { keys: "↑ / ↓", label: "コマンドパレットの候補を移動" },
  { keys: "Enter", label: "コマンドパレットの選択項目に移動" },
];

export function KeyboardHelpDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const isTyping =
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox";
        if (isTyping) return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="閉じる"
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <div
        className="relative w-full max-w-md rounded-lg border border-white/10 bg-[#0f172a] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="キーボードショートカット"
      >
        <h2 className="mb-3 text-lg font-semibold">キーボードショートカット</h2>
        <dl className="space-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-4">
              <dt className="opacity-80">{s.label}</dt>
              <dd>
                <kbd className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-xs">
                  {s.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
