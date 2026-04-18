import type {
  AdviceNote,
  ContextDocument,
  ExperimentDetail,
  ExperimentMeta,
  ExperimentRow,
  ExperimentStats,
} from "@lab-ai/shared";

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8787";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API request failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

export async function listExperiments(): Promise<{ items: ExperimentMeta[] }> {
  return request<{ items: ExperimentMeta[] }>("/api/experiments?limit=200");
}

export async function getExperiment(id: string): Promise<ExperimentDetail> {
  return request<ExperimentDetail>(`/api/experiments/${id}`);
}

export async function getExperimentRows(
  id: string,
  limit: number,
): Promise<{ items: ExperimentRow[] }> {
  return request<{ items: ExperimentRow[] }>(`/api/experiments/${id}/rows?limit=${limit}&offset=0`);
}

export async function getExperimentStats(id: string): Promise<{ stats: ExperimentStats[] }> {
  return request<{ stats: ExperimentStats[] }>(`/api/experiments/${id}/stats`);
}

export async function searchContextDocuments(query: string): Promise<{ items: ContextDocument[] }> {
  const params = new URLSearchParams({ q: query, limit: "20" });
  return request<{ items: ContextDocument[] }>(`/api/context-documents?${params.toString()}`);
}

export async function getContextDocument(id: string): Promise<ContextDocument> {
  return request<ContextDocument>(`/api/context-documents/${id}`);
}

export async function saveAdviceNote(input: {
  experimentId: string;
  title: string;
  body: string;
}): Promise<AdviceNote> {
  return request<AdviceNote>("/api/advice-notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
