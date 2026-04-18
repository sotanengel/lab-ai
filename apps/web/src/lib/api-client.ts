import type {
  AdviceNote,
  ColumnDefinition,
  ContextDocument,
  CreateAdviceNoteRequest,
  CreateContextDocumentRequest,
  CreateExperimentRequest,
  ExperimentDetail,
  ExperimentMeta,
  ExperimentRow,
  ExperimentStats,
  SourceFormat,
} from "@lab-ai/shared";

const FALLBACK_BASE_URL = "http://localhost:8787";

function resolveBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_BASE_URL;
  }
  const fromWindow = (window as unknown as { __API_BASE_URL__?: string }).__API_BASE_URL__;
  return fromWindow ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? FALLBACK_BASE_URL;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${resolveBaseUrl()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(body || `API error ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface ListExperimentsResponse {
  items: ExperimentMeta[];
  total: number;
  limit: number;
  offset: number;
}

export async function fetchExperiments(options?: {
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ListExperimentsResponse> {
  const params = new URLSearchParams();
  if (options?.includeArchived) params.set("includeArchived", "true");
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  if (options?.offset !== undefined) params.set("offset", String(options.offset));
  const qs = params.toString();
  return request<ListExperimentsResponse>(`/api/experiments${qs ? `?${qs}` : ""}`);
}

export async function fetchExperiment(id: string): Promise<ExperimentDetail> {
  return request<ExperimentDetail>(`/api/experiments/${id}`);
}

export interface ListRowsResponse {
  items: ExperimentRow[];
  limit: number;
  offset: number;
}

export async function fetchExperimentRows(
  id: string,
  options?: { limit?: number; offset?: number },
): Promise<ListRowsResponse> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  if (options?.offset !== undefined) params.set("offset", String(options.offset));
  const qs = params.toString();
  return request<ListRowsResponse>(`/api/experiments/${id}/rows${qs ? `?${qs}` : ""}`);
}

export async function fetchExperimentStats(id: string): Promise<{ stats: ExperimentStats[] }> {
  return request<{ stats: ExperimentStats[] }>(`/api/experiments/${id}/stats`);
}

export interface PreviewResponse {
  columns: Omit<ColumnDefinition, "id">[];
  rows: ExperimentRow[];
  totalRows: number;
}

export async function previewImport(input: {
  sourceFormat: SourceFormat;
  text: string;
  maxRows?: number;
}): Promise<PreviewResponse> {
  return request<PreviewResponse>("/api/experiments/preview", {
    method: "POST",
    body: JSON.stringify({ maxRows: 50, ...input }),
  });
}

export async function createExperiment(input: CreateExperimentRequest): Promise<ExperimentDetail> {
  return request<ExperimentDetail>("/api/experiments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateExperiment(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    tags?: string[];
    archived?: boolean;
  },
): Promise<ExperimentDetail> {
  return request<ExperimentDetail>(`/api/experiments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function archiveExperiment(id: string): Promise<void> {
  await request<void>(`/api/experiments/${id}`, { method: "DELETE" });
}

export function exportExperimentUrl(id: string, format: "csv" | "json"): string {
  return `${resolveBaseUrl()}/api/experiments/${id}/export?format=${format}`;
}

export interface ListContextDocumentsResponse {
  items: ContextDocument[];
  limit: number;
  offset: number;
}

export async function fetchContextDocuments(query?: string): Promise<ListContextDocumentsResponse> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("limit", "50");
  return request<ListContextDocumentsResponse>(`/api/context-documents?${params.toString()}`);
}

export async function createContextDocument(
  input: CreateContextDocumentRequest,
): Promise<ContextDocument> {
  return request<ContextDocument>("/api/context-documents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteContextDocument(id: string): Promise<void> {
  await request<void>(`/api/context-documents/${id}`, { method: "DELETE" });
}

export async function createAdviceNote(input: CreateAdviceNoteRequest): Promise<AdviceNote> {
  return request<AdviceNote>("/api/advice-notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchAdviceNotes(experimentId?: string): Promise<{ items: AdviceNote[] }> {
  const qs = experimentId ? `?experimentId=${encodeURIComponent(experimentId)}` : "";
  return request<{ items: AdviceNote[] }>(`/api/advice-notes${qs}`);
}

export async function fetchHealth(): Promise<{ status: string }> {
  return request<{ status: string }>("/health");
}
