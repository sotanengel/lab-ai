"use client";

import {
  createContextDocument,
  createContextDocumentFromPdf,
  createContextDocumentFromUrl,
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

type IngestMode = "text" | "pdf" | "url";

const MODE_LABELS: Record<IngestMode, string> = {
  text: "テキスト",
  pdf: "PDF",
  url: "URL",
};

export function ContextLibrary({ initialDocuments }: Props) {
  const [documents, setDocuments] = useState<ContextDocument[]>(initialDocuments);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<IngestMode>("text");

  // Text form state
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ContextDocumentKind>("text");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");

  // PDF form state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");

  // URL form state
  const [urlValue, setUrlValue] = useState("");
  const [urlTitle, setUrlTitle] = useState("");

  const pushNewDoc = (doc: ContextDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const submitText = () => {
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
        pushNewDoc(created);
        setTitle("");
        setContent("");
        setSourceUrl("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "登録に失敗しました");
      }
    });
  };

  const submitPdf = () => {
    setError(null);
    if (!pdfFile) {
      setError("PDF ファイルを選択してください。");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createContextDocumentFromPdf(pdfFile, pdfTitle.trim() || undefined);
        pushNewDoc(created);
        setPdfFile(null);
        setPdfTitle("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "PDF の取込に失敗しました");
      }
    });
  };

  const submitUrl = () => {
    setError(null);
    if (!urlValue.trim()) {
      setError("URL を入力してください。");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createContextDocumentFromUrl(
          urlValue.trim(),
          urlTitle.trim() || undefined,
        );
        pushNewDoc(created);
        setUrlValue("");
        setUrlTitle("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "URL の取込に失敗しました");
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
        <div className="flex gap-1 mb-3">
          {(Object.keys(MODE_LABELS) as IngestMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-md px-3 py-1 text-xs ${
                mode === m ? "bg-[var(--accent)] text-white" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {mode === "text" && (
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
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const text = await file.text();
                    setContent(text);
                    if (!title) setTitle(file.name);
                  }
                }}
                className="mt-1 w-full text-xs"
              />
            </label>
            <button
              type="button"
              onClick={submitText}
              disabled={isPending}
              className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "保存中..." : "登録"}
            </button>
          </div>
        )}

        {mode === "pdf" && (
          <div className="space-y-3 text-sm">
            <p className="text-xs opacity-70">
              PDF からテキストを抽出して登録します（25MB まで）。スキャン PDF
              は文字化けすることがあります。
            </p>
            <label className="block">
              <span className="opacity-80">タイトル（任意）</span>
              <input
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                className="mt-1 w-full rounded-md bg-white/10 px-3 py-2"
                placeholder="未入力ならファイル名から自動生成"
              />
            </label>
            <label className="block">
              <span className="opacity-80">PDF ファイル *</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-xs"
              />
              {pdfFile && (
                <p className="mt-1 text-[10px] opacity-70">
                  {pdfFile.name} — {(pdfFile.size / 1024).toFixed(1)} KB
                </p>
              )}
            </label>
            <button
              type="button"
              onClick={submitPdf}
              disabled={isPending || !pdfFile}
              className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "解析中..." : "PDF を取り込む"}
            </button>
          </div>
        )}

        {mode === "url" && (
          <div className="space-y-3 text-sm">
            <p className="text-xs opacity-70">
              URL にアクセスして本文テキストを取得します（HTML / PDF / プレーンテキスト対応）。
            </p>
            <label className="block">
              <span className="opacity-80">URL *</span>
              <input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                className="mt-1 w-full rounded-md bg-white/10 px-3 py-2"
                placeholder="https://..."
              />
            </label>
            <label className="block">
              <span className="opacity-80">タイトル（任意）</span>
              <input
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                className="mt-1 w-full rounded-md bg-white/10 px-3 py-2"
                placeholder="未入力ならページタイトルから自動生成"
              />
            </label>
            <button
              type="button"
              onClick={submitUrl}
              disabled={isPending || !urlValue.trim()}
              className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "取得中..." : "URL を取り込む"}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
            {error}
          </p>
        )}
      </aside>
    </div>
  );
}
