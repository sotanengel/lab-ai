"use client";

import {
  createContextDocument,
  deleteContextDocument,
  fetchContextDocuments,
} from "@/lib/api-client";
import type { ContextDocument, ContextDocumentKind } from "@lab-ai/shared";
import { useState, useTransition } from "react";

interface Props {
  initialDocuments: ContextDocument[];
}

const KIND_LABELS: Record<ContextDocumentKind, string> = {
  pdf: "PDF / 論文",
  text: "テキスト",
  url: "URL",
};

export function ContextLibrary({ initialDocuments }: Props) {
  const [documents, setDocuments] = useState<ContextDocument[]>(initialDocuments);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ContextDocumentKind>("text");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setContent(text);
    if (!title) setTitle(file.name);
  };

  const submit = () => {
    setError(null);
    if (!title.trim() || !content.trim()) {
      setError("タイトルと本文は必須です。");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createContextDocument({
          title: title.trim(),
          kind,
          sourceUrl: sourceUrl.trim() || null,
          content,
        });
        setDocuments((prev) => [created, ...prev]);
        setTitle("");
        setContent("");
        setSourceUrl("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "登録に失敗しました");
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm("この文書を削除しますか？")) return;
    startTransition(async () => {
      try {
        await deleteContextDocument(id);
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      }
    });
  };

  const search = () => {
    startTransition(async () => {
      try {
        const res = await fetchContextDocuments(query || undefined);
        setDocuments(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "検索に失敗しました");
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="rounded-md border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトル・本文を検索"
            className="flex-1 rounded-md bg-white/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={search}
            disabled={isPending}
            className="rounded-md bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
          >
            検索
          </button>
        </div>
        {documents.length === 0 ? (
          <p className="text-sm opacity-70">
            登録済みの文書がありません。右の登録フォームから追加してください。
          </p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="rounded-md border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{doc.title}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {KIND_LABELS[doc.kind]}
                      {doc.sourceUrl && (
                        <>
                          {" · "}
                          <a
                            href={doc.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--accent)] underline"
                          >
                            出典リンク
                          </a>
                        </>
                      )}
                      {" · "}
                      {new Date(doc.createdAt).toLocaleDateString("ja-JP")}
                    </div>
                    <p className="mt-2 text-xs opacity-80 whitespace-pre-wrap line-clamp-3">
                      {doc.content.slice(0, 200)}
                      {doc.content.length > 200 ? "..." : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(doc.id)}
                    className="rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="rounded-md border border-white/10 bg-white/5 p-5 h-fit">
        <h2 className="text-lg font-semibold mb-3">新規登録</h2>
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="opacity-80">タイトル *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md bg-white/10 px-3 py-2"
              placeholder="例: 2025 Thermal Conductivity Review"
            />
          </label>
          <label className="block">
            <span className="opacity-80">種別</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ContextDocumentKind)}
              className="mt-1 w-full rounded-md bg-white/10 px-3 py-2"
            >
              <option value="text">テキスト</option>
              <option value="pdf">PDF / 論文</option>
              <option value="url">URL</option>
            </select>
          </label>
          <label className="block">
            <span className="opacity-80">出典 URL（任意）</span>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="mt-1 w-full rounded-md bg-white/10 px-3 py-2"
              placeholder="https://arxiv.org/abs/..."
            />
          </label>
          <label className="block">
            <span className="opacity-80">本文 *</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 min-h-[160px] w-full rounded-md bg-white/10 px-3 py-2 font-mono text-xs"
              placeholder="論文の抄録・抜粋・メモなど"
            />
          </label>
          <label className="block">
            <span className="opacity-80">またはテキストファイルから読み込み</span>
            <input
              type="file"
              accept=".txt,.md,.csv,.log,text/plain,text/markdown"
              onChange={onFile}
              className="mt-1 w-full text-xs"
            />
          </label>
          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="w-full rounded-md bg-[var(--accent)] px-3 py-2 font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "保存中..." : "登録"}
          </button>
        </div>
      </aside>
    </div>
  );
}
