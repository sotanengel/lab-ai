import type { ColumnType } from "@lab-ai/shared";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function inferColumnType(samples: readonly unknown[]): ColumnType {
  const nonEmpty = samples.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonEmpty.length === 0) return "string";

  let allBoolean = true;
  let allInteger = true;
  let allNumber = true;
  let allDate = true;
  const distinct = new Set<string>();

  for (const value of nonEmpty) {
    const str = String(value).trim();
    distinct.add(str);

    if (str !== "true" && str !== "false" && str !== "0" && str !== "1") {
      allBoolean = false;
    }

    const num = Number(str);
    if (!Number.isFinite(num)) {
      allInteger = false;
      allNumber = false;
    } else if (!Number.isInteger(num)) {
      allInteger = false;
    }

    if (!ISO_DATE_RE.test(str)) {
      allDate = false;
    }
  }

  if (allDate) return "datetime";
  if (allBoolean && distinct.size <= 2) return "boolean";
  if (allInteger) return "integer";
  if (allNumber) return "number";
  if (distinct.size <= Math.max(10, Math.floor(nonEmpty.length * 0.3))) return "category";
  return "string";
}
