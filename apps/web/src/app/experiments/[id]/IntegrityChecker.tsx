"use client";

import { sha256HexOfString, verifyExperimentFile } from "@/lib/api-client";
import type { IntegrityCheckResponse, SourceFormat } from "@lab-ai/shared";
import { useState } from "react";

interface Props {
  experimentId: string;
  registeredHash: string | null | undefined;
  sourceFormat: SourceFormat;
}

function detectFormat(name: string): SourceFormat {
  const lower = name.toLowerCase();
  if (lower.endsWith(".tsv")) return "tsv";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".txt")) return "txt";
  return "csv";
}

export function IntegrityChecker({ experimentId, registeredHash, sourceFormat }: Props) {
  const [filename, setFilename] = useState<string>("");
  const [localHash, setLocalHash] = useState<string | null>(null);
  const [result, setResult] = useState<IntegrityCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const hash = await sha256HexOfString(text);
      setFilename(file.name);
      setLocalHash(hash);
      const res = await verifyExperimentFile(experimentId, {
        sourceFormat: detectFormat(file.name) ?? sourceFormat,
        text,
        filename: file.name,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "検証に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-md border border-white/10 bg-white/5 p-5 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">整合性チェック</h2>
        <p className="text-xs opacity-70 mt-1">
          手元のファイルが登録時と一致しているかを SHA-256 と統計量で比較します。
        </p>
      </div>
      <div className="text-xs opacity-70 font-mono break-all">
        登録時ハッシュ: {registeredHash ?? "（未保存）"}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15">
        {busy ? "検証中..." : "ファイルを選んで検証"}
        <input
          type="file"
          className="hidden"
          accept=".csv,.tsv,.json,.txt,text/csv,text/tab-separated-values,application/json,text/plain"
          onChange={onFile}
          disabled={busy}
        />
      </label>
      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </p>
      )}
      {result && (
        <div className="rounded-md bg-black/30 p-3 text-xs space-y-2">
          <p>
            対象: <span className="font-mono">{filename}</span>
          </p>
          <p className="font-mono break-all">検証ハッシュ: {localHash}</p>
          <p
            className={
              result.overallMatches
                ? "text-emerald-300 font-semibold"
                : "text-amber-300 font-semibold"
            }
          >
            総合判定: {result.overallMatches ? "一致 ✓" : "差分あり ⚠"}
          </p>
          <ul className="list-disc list-inside space-y-0.5 opacity-90">
            <li>ハッシュ一致: {result.hashMatches ? "○" : "×"}</li>
            <li>
              行数:{" "}
              {result.rowCountMatches
                ? "○"
                : `× (${result.registeredRowCount} → ${result.uploadedRowCount})`}
            </li>
            <li>
              カラム集合: {result.columnSetMatches ? "○" : "×"}
              {result.missingColumns.length > 0 && (
                <span> / 不足: {result.missingColumns.join(", ")}</span>
              )}
              {result.extraColumns.length > 0 && (
                <span> / 余剰: {result.extraColumns.join(", ")}</span>
              )}
            </li>
          </ul>
          {result.stats.some((s) => !s.matches) && (
            <div>
              <p className="font-semibold">差分のあるカラム:</p>
              <ul className="list-disc list-inside">
                {result.stats
                  .filter((s) => !s.matches)
                  .map((s) => (
                    <li key={s.column}>
                      <span className="font-mono">{s.column}</span>:
                      <ul className="list-[circle] list-inside ml-4 opacity-80">
                        {s.notes.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
