# Lab AI — API Reference

Base URL: `http://localhost:8787` (default)

All endpoints accept and return `application/json` unless noted. Error responses:

```jsonc
{
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | AI_NOT_CONFIGURED | AI_SUGGEST_FAILED | FILE_TOO_LARGE | PDF_PARSE_FAILED | URL_FETCH_FAILED | INTERNAL_ERROR",
    "message": "human-readable description",
    "details": { /* optional — validation detail */ }
  }
}
```

## Health

| Method | Path     | Description                 |
|--------|----------|-----------------------------|
| GET    | `/health`| Liveness probe (`{status}`) |

## Experiments

| Method | Path                                    | Description                                 |
|--------|-----------------------------------------|---------------------------------------------|
| GET    | `/api/experiments`                      | List experiments (`?limit=&offset=&includeArchived=`) |
| POST   | `/api/experiments/preview`              | Parse raw text & preview columns/rows       |
| POST   | `/api/experiments`                      | Create a new experiment                     |
| GET    | `/api/experiments/:id`                  | Fetch experiment detail (columns, tags, source info) |
| PATCH  | `/api/experiments/:id`                  | Update name/description/tags/archived flag  |
| DELETE | `/api/experiments/:id`                  | Archive (logical delete)                    |
| GET    | `/api/experiments/:id/rows`             | Paginated row data (`?limit=&offset=`)      |
| GET    | `/api/experiments/:id/rows-full`        | Same pagination, each row carries `{id, rowIndex, data}` |
| PATCH  | `/api/experiments/:id/rows/:rowId`      | Replace a row's data (`{data}`)             |
| DELETE | `/api/experiments/:id/rows/:rowId`      | Remove a single row (rowCount is recalculated) |
| GET    | `/api/experiments/:id/stats`            | Column statistics (count, min/max, mean, …) |
| GET    | `/api/experiments/:id/export`           | Download CSV / JSON / **XLSX** (`?format=csv\|json\|xlsx`) |
| POST   | `/api/experiments/:id/verify`           | Integrity check vs a local file (`{sourceFormat, text}`) |
| GET    | `/api/experiments/suggest-import/status`| `{configured}` — AI import suggestion availability |
| POST   | `/api/experiments/suggest-import`       | Claude-driven import settings (`{sample, filename?}`) |

### Create experiment request

```jsonc
{
  "name": "string",
  "description": "string | null",
  "tags": ["string"],
  "sourceFormat": "csv | tsv | json | txt",
  "source": {
    "filename": "string | null",
    "hash": "hex sha-256 (64 chars) | null",
    "size": "number | null"
  },
  "columns": [
    { "name": "time", "type": "number", "unit": "s", "position": 0 }
  ],
  "rows": [{ "time": 0.1 }, { "time": 0.2 }]
}
```

### Integrity check response

```jsonc
{
  "experimentId": "exp_abc",
  "hashMatches": true,
  "registeredHash": "…",
  "uploadedHash": "…",
  "rowCountMatches": true,
  "registeredRowCount": 100,
  "uploadedRowCount": 100,
  "columnSetMatches": true,
  "missingColumns": [],
  "extraColumns": [],
  "stats": [
    {
      "column": "temperature",
      "expected": { /* ExperimentStats */ },
      "actual":   { /* ExperimentStats */ },
      "matches": true,
      "notes": []
    }
  ],
  "overallMatches": true
}
```

## Experiment notes (user memos)

| Method | Path                              | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | `/api/experiment-notes`           | List (`?experimentId=`)        |
| POST   | `/api/experiment-notes`           | Create note                    |
| PATCH  | `/api/experiment-notes/:id`       | Edit title/body                |
| DELETE | `/api/experiment-notes/:id`       | Delete note                    |

## Context documents

| Method | Path                                | Description                    |
|--------|-------------------------------------|--------------------------------|
| GET    | `/api/context-documents`            | List / search (`?q=`)          |
| POST   | `/api/context-documents`            | Create document (plain text)   |
| POST   | `/api/context-documents/from-pdf`   | `multipart/form-data` with `file` — extract text via `unpdf` |
| POST   | `/api/context-documents/from-url`   | `{url, title?}` — fetch URL, strip HTML / extract PDF |
| GET    | `/api/context-documents/:id`        | Fetch full content             |
| DELETE | `/api/context-documents/:id`        | Delete                         |

## Advice notes (AI-generated)

| Method | Path                                 | Description                          |
|--------|--------------------------------------|--------------------------------------|
| GET    | `/api/advice-notes`                  | List (`?experimentId=`)              |
| POST   | `/api/advice-notes`                  | Persist an advice note from AI chat  |

## AI Advice (streaming)

| Method | Path                    | Description                                                         |
|--------|-------------------------|---------------------------------------------------------------------|
| GET    | `/api/advice/status`    | Returns `{configured: boolean}`                                     |
| POST   | `/api/advice/chat`      | SSE stream (`event: delta` / `event: done` / `event: error`)        |

`chat` request body:

```jsonc
{
  "experimentId": "exp_abc",
  "contextDocumentIds": ["doc_123"],
  "messages": [{ "role": "user", "content": "..." }]
}
```

The server injects the experiment's columns, statistical summary, sample rows, and each referenced context document (truncated to 4k chars) into the system prompt with prompt caching enabled.

## MCP tools

Exposed by the `packages/mcp-server` stdio server. All tools read from / write to the REST API above.

| Tool | Description |
|---|---|
| `get_experiment_list` | List experiment sets (id, name, rowCount, createdAt) |
| `get_experiment_data` | Stats + first N rows (`{experimentId, limit}`) |
| `get_experiment_columns` | Column definitions with units |
| `search_context_documents` | Full-text search the context library |
| `get_context_document` | Full content of a single document |
| `save_advice_note` | Persist an AI advice back to an experiment |
