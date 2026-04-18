# Lab AI — API Reference

Base URL: `http://localhost:8787` (default)

All endpoints accept and return `application/json` unless noted. Error responses follow:

```jsonc
{
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | AI_NOT_CONFIGURED | INTERNAL_ERROR",
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
| GET    | `/api/experiments/:id`                  | Fetch experiment detail (columns, tags)     |
| PATCH  | `/api/experiments/:id`                  | Update name/description/tags/archived flag  |
| DELETE | `/api/experiments/:id`                  | Archive (logical delete)                    |
| GET    | `/api/experiments/:id/rows`             | Paginated row data (`?limit=&offset=`)      |
| GET    | `/api/experiments/:id/stats`            | Column statistics (count, min/max, mean, …) |
| GET    | `/api/experiments/:id/export`           | Download CSV / JSON (`?format=csv\|json`)   |

### Create experiment schema

```jsonc
{
  "name": "string",
  "description": "string | null",
  "tags": ["string"],
  "sourceFormat": "csv | tsv | json | txt",
  "columns": [
    { "name": "time", "type": "number", "unit": "s", "position": 0 }
  ],
  "rows": [{ "time": 0.1 }, { "time": 0.2 }]
}
```

## Context documents

| Method | Path                                | Description                    |
|--------|-------------------------------------|--------------------------------|
| GET    | `/api/context-documents`            | List / search (`?q=`)          |
| POST   | `/api/context-documents`            | Create document                |
| GET    | `/api/context-documents/:id`        | Fetch full content             |
| DELETE | `/api/context-documents/:id`        | Delete                         |

## Advice notes

| Method | Path                                 | Description                          |
|--------|--------------------------------------|--------------------------------------|
| GET    | `/api/advice-notes`                  | List (`?experimentId=`)              |
| POST   | `/api/advice-notes`                  | Persist an advice note               |

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
