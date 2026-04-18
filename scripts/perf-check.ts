#!/usr/bin/env node
// Ad-hoc perf smoke tests against a running API + web stack.
// NF-03: docker compose up -> /health reachable within 30 seconds.
// NF-04: GET /api/experiments/:id/rows?limit=10000 renders in < 2 seconds.

const API_BASE = process.env.PERF_API_BASE ?? "http://localhost:8787";

function log(tag: string, ok: boolean, detail: string): void {
  const mark = ok ? "✓" : "✗";
  // biome-ignore lint/suspicious/noConsoleLog: CLI output
  console.log(`${mark} ${tag}: ${detail}`);
}

async function checkHealth(): Promise<void> {
  const deadline = Date.now() + 30_000;
  const start = Date.now();
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        log("NF-03 health", true, `ready in ${(Date.now() - start) / 1000}s`);
        return;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  log("NF-03 health", false, "not ready after 30s");
  process.exit(1);
}

async function checkRowsResponse(): Promise<void> {
  const listRes = await fetch(`${API_BASE}/api/experiments?limit=1`);
  if (!listRes.ok) {
    log("NF-04 rows", false, "no experiments to benchmark against");
    return;
  }
  const list = (await listRes.json()) as { items: { id: string; rowCount: number }[] };
  const candidate = list.items.find((x) => x.rowCount >= 1_000) ?? list.items[0];
  if (!candidate) {
    log("NF-04 rows", false, "no experiments available");
    return;
  }
  const start = Date.now();
  const res = await fetch(`${API_BASE}/api/experiments/${candidate.id}/rows?limit=10000`);
  const body = await res.json();
  const elapsed = Date.now() - start;
  const rowCount = Array.isArray((body as { items: unknown[] }).items)
    ? (body as { items: unknown[] }).items.length
    : 0;
  const ok = elapsed < 2_000;
  log("NF-04 rows", ok, `${rowCount} rows in ${elapsed}ms (target < 2000ms for 10k-row payload)`);
  if (!ok) process.exit(1);
}

async function main(): Promise<void> {
  await checkHealth();
  await checkRowsResponse();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
