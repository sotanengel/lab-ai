import type { ExperimentMeta } from "@lab-ai/shared";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";

interface ListExperimentsResponse {
  items: ExperimentMeta[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchExperiments(): Promise<ListExperimentsResponse> {
  const res = await fetch(`${BASE_URL}/api/experiments`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch experiments: ${res.status}`);
  }
  return (await res.json()) as ListExperimentsResponse;
}

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("API is not reachable");
  return (await res.json()) as { status: string };
}
