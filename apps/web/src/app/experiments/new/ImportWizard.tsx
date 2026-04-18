"use client";

import {
  type PreviewResponse,
  createExperiment,
  fetchImportSuggestStatus,
  previewImport,
  sha256HexOfString,
  suggestImport,
} from "@/lib/api-client";
import type { ColumnType, ImportSuggestionResponse, SourceFormat } from "@lab-ai/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileHash, setFileHash] = useState<string | null>(null);
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
  const [aiConfigured, setAiConfigured] = useState<boolean>(false);
  const [aiBusy, setAiBusy] = useState<boolean>(false);
  const [aiSuggestion, setAiSuggestion] = useState<ImportSuggestionResponse | null>(null);

  useEffect(() => {
    fetchImportSuggestStatus()
      .then((r) => setAiConfigured(r.configured))
      .catch(() => setAiConfigured(false));
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const contents = await file.text();
      const detected = detectFormatFromFilename(file.name);
      const hash = await sha256HexOfString(contents);
      setFilename(file.name);
      setFileSize(file.size);
      setFileHash(hash);
      setFormat(detected);
      setText(contents);
      setAiSuggestion(null);
      if (!name) {
        setName(file.name.replace(/\.[^.]+$/, ""));
      }
    },
    [name],
  );

  const runAiSuggest = useCallback(async () => {
    if (!text.trim()) {
      setErrorMessage("先にファイルを選択するかテキストを貼り付けてください。");
      return;
    }
    setAiBusy(true);
    setErrorMessage(null);
    try {
      const sample = text.slice(0, 30_000);
      const suggestion = await suggestImport(filename ? { sample, filename } : { sample });
      setAiSuggestion(suggestion);
      setFormat(suggestion.sourceFormat);
      if (suggestion.proposedName && !name) setName(suggestion.proposedName);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "AI 解析に失敗しました");
    } finally {
      setAiBusy(false);
    }
  }, [text, filename, name]);

  const applyAiSuggestion = useCallback(() => {
    if (!aiSuggestion) return;
    setColumns(
      aiSuggestion.columns.map((col, idx) => ({
        name: col.name,
        type: col.type,
        unit: col.unit ?? "",
        position: idx,
      })),
    );
  }, [aiSuggestion]);

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
      const textForHash = text || "";
      const hash = fileHash ?? (await sha256HexOfString(textForHash));
      const created = await createExperiment({
        name: name.trim(),
        description: description.trim() || null,
        tags,
        sourceFormat: format,
        source: {
          filename: filename || null,
          hash,
          size: fileSize || new TextEncoder().encode(textForHash).length,
        },
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
  }, [
    preview,
    canSubmit,
    tagsInput,
    name,
    description,
    format,
    columns,
    router,
    fileHash,
    fileSize,
    filename,
    text,
  ]);

  const stepNumber = (n: number, label: string) => (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--accent)]/15 text-[var(--accent-light)] text-xs font-bold border border-[var(--accent)]/20">
        {n}
      </span>
      <h2 className="text-base font-semibold text-white">{label}</h2>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Step 1: File Selection */}
      <section className="card p-6">
        {stepNumber(1, "ファイル選択")}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? "border-[var(--accent)] bg-[var(--accent)]/[0.06]"
              : "border-white/[0.08] hover:border-white/[0.15]"
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/30"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-sm text-white/50 mb-3">ここにファイルをドラッグ&ドロップ</p>
          <label className="btn-secondary text-sm cursor-pointer">
            ファイルを選択
            <input
              type="file"
              accept=".csv,.tsv,.json,.txt,text/csv,text/tab-separated-values,application/json,text/plain"
              className="hidden"
              onChange={onFileInput}
            />
          </label>
          {filename && (
            <div className="mt-4 inline-flex flex-col items-center gap-1 rounded-lg bg-white/[0.04] border border-white/[0.06] px-4 py-3">
              <p className="text-sm text-white/70 font-medium">{filename}</p>
              {fileSize > 0 && (
                <p className="text-xs text-white/30">{fileSize.toLocaleString()} バイト</p>
              )}
              {fileHash && (
                <p className="font-mono text-[10px] text-white/20 break-all max-w-xs">
                  SHA-256: {fileHash}
                </p>
              )}
            </div>
          )}
        </div>

        {aiConfigured && (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white/70">AI による取込設定の自動検出</p>
                <p className="text-xs text-white/30 mt-0.5">
                  フォーマット・ヘッダ・カラム型をファイル冒頭から推論します
                </p>
              </div>
              <button
                type="button"
                onClick={runAiSuggest}
                disabled={aiBusy || !text.trim()}
                className="btn-secondary text-sm disabled:opacity-40"
              >
                {aiBusy ? "解析中..." : "AI に任せる"}
              </button>
            </div>
            {aiSuggestion && (
              <div className="mt-3 rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-xs space-y-2">
                <p className="text-white/60">
                  <strong className="text-white/80">フォーマット:</strong>{" "}
                  {aiSuggestion.sourceFormat}
                  <span className="text-white/30 ml-2">
                    ヘッダ: {aiSuggestion.hasHeader ? "あり" : "なし"}
                  </span>
                </p>
                {aiSuggestion.proposedName && (
                  <p className="text-white/60">
                    <strong className="text-white/80">提案名:</strong> {aiSuggestion.proposedName}
                  </p>
                )}
                <p className="text-white/80 font-medium">カラム候補:</p>
                <ul className="list-disc list-inside text-white/50 space-y-0.5">
                  {aiSuggestion.columns.map((col) => (
                    <li key={col.name}>
                      <span className="text-white/70">{col.name}</span> ({col.type}
                      {col.unit ? `, ${col.unit}` : ""})
                      {col.description ? (
                        <span className="text-white/30"> — {col.description}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {aiSuggestion.notes && <p className="text-white/30">メモ: {aiSuggestion.notes}</p>}
                <div className="pt-1">
                  <button type="button" onClick={applyAiSuggestion} className="btn-primary text-xs">
                    カラム設定に反映
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <label className="text-sm text-white/50">フォーマット</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as SourceFormat)}
            className="rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-sm text-white/80 focus:border-[var(--accent)]/50"
          >
            <option value="csv">CSV</option>
            <option value="tsv">TSV</option>
            <option value="json">JSON</option>
            <option value="txt">TXT (auto)</option>
          </select>
        </div>

        <details className="mt-4 group">
          <summary className="cursor-pointer text-sm text-white/40 hover:text-white/60 transition-colors">
            または直接貼り付け
          </summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-3 h-40 w-full rounded-lg bg-black/30 border border-white/[0.06] p-3 font-mono text-xs text-white/70 placeholder-white/20 focus:border-[var(--accent)]/50"
            placeholder="time,value\n1,10.5\n2,11.2"
          />
        </details>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={runPreview}
            disabled={!text.trim()}
            className="btn-primary disabled:opacity-40"
          >
            プレビュー
          </button>
        </div>
      </section>

      {/* Step 2: Column Config */}
      {preview && (
        <section className="card p-6">
          {stepNumber(2, "カラム確認")}
          <p className="text-xs text-white/30 mb-4 -mt-2">
            全 {preview.totalRows.toLocaleString()} 行 · 先頭 {preview.rows.length} 行をプレビュー
          </p>
          <div className="overflow-auto rounded-lg border border-white/[0.06]">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.03]">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className="whitespace-nowrap px-3 py-3 text-left align-bottom">
                      <input
                        value={col.name}
                        onChange={(e) => {
                          setColumns((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c)),
                          );
                        }}
                        className="w-full rounded-md bg-white/[0.06] border border-white/[0.08] px-2 py-1 text-xs text-white/80"
                      />
                      <div className="mt-1.5 flex gap-1.5">
                        <select
                          value={col.type}
                          onChange={(e) => {
                            const next = e.target.value as ColumnType;
                            setColumns((prev) =>
                              prev.map((c, i) => (i === idx ? { ...c, type: next } : c)),
                            );
                          }}
                          className="rounded-md bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/60"
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
                          className="w-16 rounded-md bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/60 placeholder-white/20"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t border-white/[0.04]">
                    {columns.map((col, j) => (
                      <td key={j} className="whitespace-nowrap px-3 py-2 text-white/50">
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

      {/* Step 3: Metadata */}
      {preview && (
        <section className="card p-6">
          {stepNumber(3, "メタデータ")}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-white/50 text-xs font-medium">実験名 *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:border-[var(--accent)]/50"
                placeholder="例: 2026-04-18 熱伝導測定"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-white/50 text-xs font-medium">タグ（カンマ区切り）</span>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:border-[var(--accent)]/50"
                placeholder="例: trial,thermal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="text-white/50 text-xs font-medium">説明</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:border-[var(--accent)]/50"
                placeholder="実験条件・目的など"
              />
            </label>
          </div>
        </section>
      )}

      {errorMessage && (
        <div className="error-card flex items-start gap-3">
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-red-300">{errorMessage}</p>
        </div>
      )}

      {preview && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="btn-primary disabled:opacity-40"
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
