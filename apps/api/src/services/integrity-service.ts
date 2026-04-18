import type {
  ColumnStatsDelta,
  ExperimentDetail,
  ExperimentRow,
  ExperimentStats,
  IntegrityCheckResponse,
} from "@lab-ai/shared";
import { computeColumnStats } from "./stats-service.js";

const NUMERIC_EPSILON_RATIO = 0.001;

function approxEqual(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return Math.abs(a - b) / scale <= NUMERIC_EPSILON_RATIO;
}

function diffStats(expected: ExperimentStats, actual: ExperimentStats): ColumnStatsDelta {
  const notes: string[] = [];
  let matches = true;
  if (expected.count !== actual.count) {
    matches = false;
    notes.push(`行数が異なる: 登録 ${expected.count} → 検証 ${actual.count}`);
  }
  const numericFields: (keyof ExperimentStats)[] = ["min", "max", "mean", "median", "stddev"];
  for (const key of numericFields) {
    const e = expected[key] as number | null;
    const a = actual[key] as number | null;
    if (!approxEqual(e, a)) {
      matches = false;
      notes.push(`${String(key)} が異なる: ${formatValue(e)} → ${formatValue(a)}`);
    }
  }
  return { column: expected.column, expected, actual, matches, notes };
}

function formatValue(v: number | null): string {
  if (v === null) return "—";
  return Number.isInteger(v) ? v.toString() : v.toPrecision(6);
}

export interface CompareArgs {
  detail: ExperimentDetail;
  registeredStats: readonly ExperimentStats[];
  registeredHash: string | null;
  uploadedHash: string;
  uploadedColumns: readonly { name: string }[];
  uploadedRows: readonly ExperimentRow[];
}

export function compareIntegrity(args: CompareArgs): IntegrityCheckResponse {
  const registeredColumnNames = args.detail.columns.map((c) => c.name);
  const uploadedColumnNames = args.uploadedColumns.map((c) => c.name);
  const missingColumns = registeredColumnNames.filter((n) => !uploadedColumnNames.includes(n));
  const extraColumns = uploadedColumnNames.filter((n) => !registeredColumnNames.includes(n));

  const uploadedStats = computeColumnStats(args.detail.columns, args.uploadedRows);

  const statsDelta: ColumnStatsDelta[] = args.registeredStats.map((expected) => {
    const actual = uploadedStats.find((s) => s.column === expected.column) ?? null;
    if (actual === null) {
      return {
        column: expected.column,
        expected,
        actual: null,
        matches: false,
        notes: ["検証ファイルに該当カラムが見当たりません"],
      };
    }
    return diffStats(expected, actual);
  });

  const hashMatches = args.registeredHash !== null && args.registeredHash === args.uploadedHash;
  const rowCountMatches = args.detail.rowCount === args.uploadedRows.length;
  const columnSetMatches = missingColumns.length === 0 && extraColumns.length === 0;
  const statsMatch = statsDelta.every((s) => s.matches);

  return {
    experimentId: args.detail.id,
    hashMatches,
    registeredHash: args.registeredHash,
    uploadedHash: args.uploadedHash,
    rowCountMatches,
    registeredRowCount: args.detail.rowCount,
    uploadedRowCount: args.uploadedRows.length,
    columnSetMatches,
    missingColumns,
    extraColumns,
    stats: statsDelta,
    overallMatches: hashMatches && rowCountMatches && columnSetMatches && statsMatch,
  };
}
