import { ContextLibrary } from "./ContextLibrary";
import { fetchContextDocuments } from "@/lib/api-client";

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
    <div className="px-6 py-10 max-w-5xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">コンテキスト文書ライブラリ</h1>
        <p className="text-sm opacity-80 mt-1">
          論文・メモ・URL を登録し、AI アドバイス問い合わせ時に選択して注入します。
        </p>
      </header>

      {errorMessage ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : (
        <ContextLibrary initialDocuments={initialDocuments} />
      )}
    </div>
  );
}
