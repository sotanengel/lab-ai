"use client";

import { Markdown } from "@/components/Markdown";
import {
  type ChatStreamMessage,
  clearAdviceHistory,
  createAdviceNote,
  fetchAdviceHistory,
  fetchAdviceStatus,
  fetchContextDocuments,
  streamAdviceChat,
} from "@/lib/api-client";
import type { ContextDocument, ExperimentMeta } from "@lab-ai/shared";
import { useEffect, useRef, useState } from "react";

interface Props {
  experiment: Pick<ExperimentMeta, "id" | "name">;
}

interface StoredMessage extends ChatStreamMessage {
  id: string;
  streaming?: boolean;
  savedNoteId?: string;
}

export function AdviceChat({ experiment }: Props) {
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [contextDocs, setContextDocs] = useState<ContextDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [status, docs, history] = await Promise.all([
          fetchAdviceStatus(),
          fetchContextDocuments(),
          fetchAdviceHistory(experiment.id).catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setAiConfigured(status.configured);
        setContextDocs(docs.items);
        setMessages(
          history.items.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          })),
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "初期化に失敗しました");
      }
    })();
    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
  }, [experiment.id]);

  const clearHistory = async () => {
    if (messages.length === 0) return;
    if (!confirm("チャット履歴をすべて削除しますか？")) return;
    try {
      await clearAdviceHistory(experiment.id);
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "履歴の削除に失敗しました");
    }
  };

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    setError(null);
    setBusy(true);
    const userMessage: StoredMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const assistantId = `a-${Date.now()}`;
    const placeholder: StoredMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };
    setMessages((prev) => [...prev, userMessage, placeholder]);
    setInput("");

    const requestMessages: ChatStreamMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: userMessage.role, content: userMessage.content },
    ];

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      await streamAdviceChat(
        {
          experimentId: experiment.id,
          contextDocumentIds: [...selectedDocIds],
          messages: requestMessages,
        },
        {
          onDelta: (delta) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
            );
          },
          onDone: (result) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: result.text, streaming: false } : m,
              ),
            );
          },
          onError: (message) => {
            setError(message);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
            );
          },
        },
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "送信に失敗しました");
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
        );
      }
    } finally {
      setBusy(false);
      controllerRef.current = null;
    }
  };

  const saveAsNote = async (message: StoredMessage) => {
    if (!message.content.trim()) return;
    try {
      const note = await createAdviceNote({
        experimentId: experiment.id,
        title: `Advice @ ${new Date().toLocaleString("ja-JP")}`,
        body: message.content,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, savedNoteId: note.id } : m)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "ノート保存に失敗しました");
    }
  };

  if (aiConfigured === false) {
    return (
      <div className="rounded-md border border-white/10 bg-white/5 p-4 text-sm opacity-80">
        AI アドバイス機能は無効です。`ANTHROPIC_API_KEY` を環境変数に設定するとご利用いただけます。
      </div>
    );
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-4 flex flex-col gap-3 min-h-[520px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">AI アドバイス</h2>
          <p className="text-xs opacity-70 mt-0.5">
            実験「{experiment.name}」の統計・サンプル行が自動的に注入されます。
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
            title="このチャットの履歴をすべて削除"
          >
            履歴クリア
          </button>
        )}
      </header>

      <details className="rounded-md bg-black/30 p-3 text-sm">
        <summary className="cursor-pointer opacity-85">
          コンテキスト文書を選択 ({selectedDocIds.size} / {contextDocs.length})
        </summary>
        <div className="mt-2 max-h-40 overflow-auto space-y-1">
          {contextDocs.length === 0 ? (
            <p className="text-xs opacity-70">
              登録済み文書がありません。「コンテキスト」ページから追加できます。
            </p>
          ) : (
            contextDocs.map((doc) => (
              <label key={doc.id} className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedDocIds.has(doc.id)}
                  onChange={() => toggleDoc(doc.id)}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="font-medium">{doc.title}</span>
                  <span className="opacity-60"> ({doc.kind})</span>
                </span>
              </label>
            ))
          )}
        </div>
      </details>

      <div className="flex-1 overflow-auto space-y-3 text-sm max-h-[460px] pr-1">
        {messages.length === 0 ? (
          <p className="opacity-60 text-xs italic">
            「データから何が言えそう？」のように質問してみてください。
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-md px-3 py-2 ${
                m.role === "user" ? "bg-[var(--accent)]/20" : "bg-white/10"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">
                {m.role === "user" ? "あなた" : "AI"}
              </div>
              {m.role === "assistant" && m.content ? (
                <Markdown>{m.content}</Markdown>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {m.content || (m.streaming ? "考え中..." : "")}
                </pre>
              )}
              {m.role === "assistant" && !m.streaming && m.content && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => saveAsNote(m)}
                    disabled={Boolean(m.savedNoteId)}
                    className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
                  >
                    {m.savedNoteId ? "ノート保存済み" : "ノートとして保存"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="例: この時系列データから読み取れる傾向は？"
          className="min-h-[72px] flex-1 rounded-md bg-black/30 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !input.trim()}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "送信中..." : "送信"}
        </button>
      </div>
      <p className="text-[10px] opacity-60">
        ⌘/Ctrl + Enter で送信。AI 機能は Anthropic Claude API を使用します。
      </p>
    </div>
  );
}
