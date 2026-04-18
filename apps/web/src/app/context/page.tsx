import { fetchContextDocuments } from "@/lib/api-client";
import { ContextLibrary } from "./ContextLibrary";

export const dynamic = "force-dynamic";

export default async function ContextPage() {
  let initialDocuments: Awaited<ReturnType<typeof fetchContextDocuments>>["items"] = [];
  let errorMessage: string | null = null;
  try {
    const res = await fetchContextDocuments();
    initialDocuments = res.items;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto w-full relative z-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          コンテキスト文書ライブラリ
        </h1>
        <p className="text-sm text-white/40 mt-1.5">
          論文・メモ・URL を登録し、AI アドバイス問い合わせ時に選択して注入します。
        </p>
      </header>

      {errorMessage ? (
        <div className="error-card flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-300">データの取得に失敗しました</h3>
            <p className="text-sm text-red-300/60 mt-1">{errorMessage}</p>
          </div>
        </div>
      ) : (
        <ContextLibrary initialDocuments={initialDocuments} />
      )}
    </div>
  );
}
