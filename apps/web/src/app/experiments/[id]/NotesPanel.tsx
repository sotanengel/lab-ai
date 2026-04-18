"use client";

import { Markdown } from "@/components/Markdown";
import { createExperimentNote, deleteExperimentNote, updateExperimentNote } from "@/lib/api-client";
import type { ExperimentNote } from "@lab-ai/shared";
import { useState, useTransition } from "react";

interface Props {
  experimentId: string;
  initialNotes: ExperimentNote[];
}

export function NotesPanel({ experimentId, initialNotes }: Props) {
  const [notes, setNotes] = useState<ExperimentNote[]>(initialNotes);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError("タイトルと本文は必須です。");
      return;
    }
    startTransition(async () => {
      try {
        const created = await createExperimentNote({
          experimentId,
          title: title.trim(),
          body,
        });
        setNotes((prev) => [created, ...prev]);
        setTitle("");
        setBody("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存に失敗しました");
      }
    });
  };

  const startEdit = (note: ExperimentNote) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    setError(null);
    if (!editTitle.trim() || !editBody.trim()) {
      setError("タイトルと本文は必須です。");
      return;
    }
    startTransition(async () => {
      try {
        const updated = await updateExperimentNote(editingId, {
          title: editTitle.trim(),
          body: editBody,
        });
        setNotes((prev) => prev.map((n) => (n.id === editingId ? updated : n)));
        cancelEdit();
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm("このメモを削除しますか？")) return;
    startTransition(async () => {
      try {
        await deleteExperimentNote(id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "削除に失敗しました");
      }
    });
  };

  return (
    <section className="rounded-md border border-white/10 bg-white/5 p-5 space-y-3">
      <header>
        <h2 className="text-lg font-semibold">観察メモ</h2>
        <p className="text-xs opacity-70 mt-1">
          実験条件・気付き・次の TODO などを自由に記録できます。Markdown 対応。
        </p>
      </header>

      <div className="rounded-md bg-black/30 p-3 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル"
          className="w-full rounded-md bg-white/10 px-3 py-1.5 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Markdown で記入。例: 室温が 2°C 低かった / 計測開始時刻を 10 秒遅らせた"
          className="min-h-[100px] w-full rounded-md bg-white/10 px-3 py-2 font-mono text-xs"
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] opacity-60">⌘/Ctrl+Enter で登録</p>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {isPending ? "保存中..." : "メモを追加"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {notes.length === 0 ? (
        <p className="text-xs opacity-60">まだメモがありません。</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border border-white/10 bg-white/5 p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-md bg-white/10 px-3 py-1.5 text-sm"
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="min-h-[100px] w-full rounded-md bg-white/10 px-3 py-2 font-mono text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md border border-white/20 px-3 py-1 text-xs"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={isPending}
                      className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs text-white disabled:opacity-50"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs opacity-70">
                        {new Date(note.createdAt).toLocaleString("ja-JP")}
                        {note.updatedAt !== note.createdAt && (
                          <span className="ml-2 opacity-60">
                            (更新 {new Date(note.updatedAt).toLocaleString("ja-JP")})
                          </span>
                        )}
                      </div>
                      <div className="mt-1 font-medium">{note.title}</div>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => startEdit(note)}
                        className="rounded-md border border-white/20 px-2 py-1"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(note.id)}
                        className="rounded-md border border-red-500/40 px-2 py-1 text-red-200 hover:bg-red-500/10"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm opacity-90">
                    <Markdown>{note.body}</Markdown>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
