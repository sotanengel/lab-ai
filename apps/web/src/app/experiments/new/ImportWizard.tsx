"use client";

import { type PreviewResponse, createExperiment, previewImport } from "@/lib/api-client";
import type { ColumnType, SourceFormat } from "@lab-ai/shared";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

const COLUMN_TYPES: readonly ColumnType[] = [
  "number",
  "integer",
  "datetime",
  "category",
  "string",
  "boolean",
];

function detectFormatFromFilename(name: string): SourceFormat {
  const lower = name.toLowerCase();
  if (lower.endsWith(".tsv")) return "tsv";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".txt")) return "txt";
  return "csv";
}

interface DraftColumn {
  name: string;
  type: ColumnType;
  unit: string;
  position: number;
}

export function ImportWizard() {
  const router = useRouter();
  const [filename, setFilename] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [format, setFormat] = useState<SourceFormat>("csv");
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [columns, setColumns] = useState<DraftColumn[]>([]);
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const contents = await file.text();
      const detected = detectFormatFromFilename(file.name);
      setFilename(file.name);
      setFormat(detected);
      setText(contents);
      if (!name) {
        setName(file.name.replace(/\.[^.]+$/, ""));
      }
    },
    [name],
  );

  const onDrop = useCallback(
    async (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      setIsDragging(false);
      const file = ev.dataTransfer.files?.[0];
      if (file) await handleFile(file);
    },
    [handleFile],
  );

  const onFileInput = useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const file = ev.target.files?.[0];
      if (file) await handleFile(file);
    },
    [handleFile],
  );

  const runPreview = useCallback(async () => {
    setErrorMessage(null);
    setPreview(null);
    if (!text.trim()) {
      setErrorMessage("ファイルを選択するかテキストを貼り付けてください。");
      return;
    }
    try {
      const result = await previewImport({ sourceFormat: format, text });
      setPreview(result);
      setColumns(
        result.columns.map((col, idx) => ({
          name: col.name,
          type: col.type,
          unit: col.unit ?? "",
          position: col.position ?? idx,
        })),
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "プレビューに失敗しました");
    }
  }, [format, text]);

  const canSubmit = useMemo(
    () => preview !== null && columns.length > 0 && name.trim().length > 0,
    [preview, columns.length, name],
  );

  const submit = useCallback(async () => {
    if (!preview || !canSubmit) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const created = await createExperiment({
        name: name.trim(),
        description: description.trim() || null,
        tags,
        sourceFormat: format,
        columns: columns.map((col, idx) => ({
          name: col.name,
          type: col.type,
          unit: col.unit.trim() || null,
          position: idx,
        })),
        rows: preview.rows,
      });
      router.push(`/experiments/${created.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "登録に失敗しました");
      setSubmitting(false);
    }
  }, [preview, canSubmit, tagsInput, name, description, format, columns, router]);

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold mb-3">1. ファイル選択</h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`rounded-md border-2 border-dashed p-6 text-center transition ${
            isDragging ? "border-[var(--accent)] bg-white/10" : "border-white/20"
          }`}
        >
          <p className="text-sm opacity-80">
            ここにファイルをドラッグ&ドロップ、または以下から選択してください
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">
            ファイルを選択
            <input
              type="file"
              accept=".csv,.tsv,.json,.txt,text/csv,text/tab-separated-values,application/json,text/plain"
              className="hidden"
              onChange={onFileInput}
            />
          </label>
          {filename && <p className="mt-3 text-xs opacity-80">選択中: {filename}</p>}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <label className="text-sm opacity-80">フォーマット</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as SourceFormat)}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm"
          >
            <option value="csv">CSV</option>
            <option value="tsv">TSV</option>
            <option value="json">JSON</option>
            <option value="txt">TXT (auto)</option>
          </select>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm opacity-80">または直接貼り付け</summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-2 h-40 w-full rounded-md bg-black/40 p-3 font-mono text-xs"
            placeholder="time,value\n1,10.5\n2,11.2"
          />
        </details>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={runPreview}
            disabled={!text.trim()}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            プレビュー
          </button>
        </div>
      </section>

      {preview && (
        <section className="rounded-md border border-white/10 bg-white/5 p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">2. カラム確認</h2>
            <p className="text-xs opacity-70">
              全 {preview.totalRows.toLocaleString()} 行 · 先頭 {preview.rows.length} 行をプレビュー
            </p>
          </div>
          <div className="overflow-auto rounded-md border border-white/10">
            <table className="w-full text-xs">
              <thead className="bg-white/5">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className="whitespace-nowrap px-3 py-2 text-left align-bottom">
                      <input
                        value={col.name}
                        onChange={(e) => {
                          setColumns((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c)),
                          );
                        }}
                        className="w-full rounded-sm bg-white/10 px-2 py-1 text-xs"
                      />
                      <div className="mt-1 flex gap-1">
                        <select
                          value={col.type}
                          onChange={(e) => {
                            const next = e.target.value as ColumnType;
                            setColumns((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, type: next } : c)),
                            );
                          }}
                          className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px]"
                        >
                          {COLUMN_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <input
                          value={col.unit}
                          onChange={(e) => {
                            setColumns((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, unit: e.target.value } : c)),
                            );
                          }}
                          placeholder="単位"
                          className="w-16 rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px]"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t border-white/5">
                    {columns.map((col, j) => (
                      <td key={j} className="whitespace-nowrap px-3 py-1.5 opacity-80">
                        {formatCellValue(row[col.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {preview && (
        <section className="rounded-md border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-3">3. メタデータ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="opacity-80">実験名 *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-md bg-white/10 px-3 py-2 text-sm"
                placeholder="例: 2026-04-18 熱伝導測定"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="opacity-80">タグ（カンマ区切り）</span>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="rounded-md bg-white/10 px-3 py-2 text-sm"
                placeholder="例: trial,thermal"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="opacity-80">説明</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] rounded-md bg-white/10 px-3 py-2 text-sm"
                placeholder="実験条件・目的など"
              />
            </label>
          </div>
        </section>
      )}

      {errorMessage && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      )}

      {preview && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="rounded-md bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "登録中..." : "実験を登録"}
          </button>
        </div>
      )}
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
