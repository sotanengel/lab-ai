import type {
  AdviceNote,
  ColumnDefinition,
  ContextDocument,
  CreateAdviceNoteRequest,
  CreateContextDocumentRequest,
  CreateExperimentNoteRequest,
  CreateExperimentRequest,
  ExperimentDetail,
  ExperimentMeta,
  ExperimentNote,
  ExperimentRow,
  ExperimentStats,
  ImportSuggestionResponse,
  IntegrityCheckResponse,
  SourceFormat,
  UpdateExperimentNoteRequest,
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

export function exportExperimentUrl(id: string, format: "csv" | "json" | "xlsx"): string {
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

export async function fetchExperimentNotes(
  experimentId?: string,
): Promise<{ items: ExperimentNote[] }> {
  const qs = experimentId ? `?experimentId=${encodeURIComponent(experimentId)}` : "";
  return request<{ items: ExperimentNote[] }>(`/api/experiment-notes${qs}`);
}

export async function createExperimentNote(
  input: CreateExperimentNoteRequest,
): Promise<ExperimentNote> {
  return request<ExperimentNote>("/api/experiment-notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateExperimentNote(
  id: string,
  input: UpdateExperimentNoteRequest,
): Promise<ExperimentNote> {
  return request<ExperimentNote>(`/api/experiment-notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteExperimentNote(id: string): Promise<void> {
  await request<void>(`/api/experiment-notes/${id}`, { method: "DELETE" });
}

export interface VerifyFileInput {
  sourceFormat: SourceFormat;
  text: string;
  filename?: string;
}

export async function verifyExperimentFile(
  id: string,
  input: VerifyFileInput,
): Promise<IntegrityCheckResponse> {
  return request<IntegrityCheckResponse>(`/api/experiments/${id}/verify`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchImportSuggestStatus(): Promise<{ configured: boolean }> {
  return request<{ configured: boolean }>("/api/experiments/suggest-import/status");
}

export async function suggestImport(input: {
  sample: string;
  filename?: string;
}): Promise<ImportSuggestionResponse> {
  return request<ImportSuggestionResponse>("/api/experiments/suggest-import", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function sha256HexOfString(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function fetchAdviceStatus(): Promise<{ configured: boolean }> {
  return request<{ configured: boolean }>("/api/advice/status");
}

export interface ChatStreamMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamAdviceHandlers {
  onDelta?: (text: string) => void;
  onDone?: (result: { text: string; usage: { inputTokens: number; outputTokens: number } }) => void;
  onError?: (message: string) => void;
}

export async function streamAdviceChat(
  input: {
    experimentId: string;
    contextDocumentIds: string[];
    messages: ChatStreamMessage[];
  },
  handlers: StreamAdviceHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${resolveBaseUrl()}/api/advice/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal: signal ?? null,
  });
  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new ApiError(body || `Stream failed ${response.status}`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      handleSseFrame(frame, handlers);
      boundary = buffer.indexOf("\n\n");
    }
  }
}

function handleSseFrame(frame: string, handlers: StreamAdviceHandlers): void {
  const lines = frame.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return;
  const data = dataLines.join("\n");
  try {
    const parsed = JSON.parse(data) as unknown;
    if (event === "delta" && typeof (parsed as { text?: unknown }).text === "string") {
      handlers.onDelta?.((parsed as { text: string }).text);
    } else if (event === "done") {
      handlers.onDone?.(parsed as Parameters<NonNullable<StreamAdviceHandlers["onDone"]>>[0]);
    } else if (event === "error") {
      const message = (parsed as { message?: string }).message ?? "stream error";
      handlers.onError?.(message);
    }
  } catch (err) {
    handlers.onError?.(err instanceof Error ? err.message : "Invalid stream frame");
  }
}
