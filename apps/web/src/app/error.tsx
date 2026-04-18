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
    // Forward to browser console so devtools surfaces it; server logs pick
    // up the same stack from Next's runtime.
    console.error("unhandled error", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md rounded-md border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
        <h2 className="text-lg font-semibold">予期しないエラーが発生しました</h2>
        <p className="mt-2 opacity-80">
          {error.message || "詳細はサーバーログを確認してください。"}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs opacity-60 font-mono">digest: {error.digest}</p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          >
            再試行
          </button>
          <a
            href="/"
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            ホームへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
