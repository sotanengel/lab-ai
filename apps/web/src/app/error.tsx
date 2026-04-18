"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("unhandled error", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 relative z-10">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mb-6">
          <svg
            aria-hidden="true"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">予期しないエラーが発生しました</h2>
        <p className="text-sm text-white/40 mb-1">
          {error.message || "詳細はサーバーログを確認してください。"}
        </p>
        {error.digest && (
          <p className="text-xs text-white/20 font-mono mb-6">digest: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <button type="button" onClick={() => reset()} className="btn-primary">
            再試行
          </button>
          <a href="/" className="btn-secondary">
            ホームへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
