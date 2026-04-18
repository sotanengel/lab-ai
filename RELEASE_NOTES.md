# Release notes

## v1.0.0 (unreleased)

First public release of **Lab AI — Researcher Experiment Analysis Platform**.

### Highlights

- **Zero-install launch** — `docker compose up --build` boots web, API, and MCP services with SQLite persistence.
- **Data ingestion** — drag-and-drop CSV / TSV / JSON / TXT with auto column typing, preview, and metadata editing.
- **Interactive charts** — line, scatter, bar, and histogram with multi-series overlay and PNG/SVG export.
- **AI advice (Claude)** — streaming chat side panel with selectable context documents and "save as note" flow. Falls back gracefully when `ANTHROPIC_API_KEY` is unset.
- **MCP server** — exposes `get_experiment_list / _data / _columns`, `search_context_documents`, `get_context_document`, `save_advice_note` over stdio for external agents.
- **Offline-first** — Service Worker caches the app shell; API-only routes stay online-only.
- **Supply-chain defense** — Takumi Guard routes all npm installs through `npm.flatt.tech` in CI and local `.npmrc`.

### Known limitations

- Box plot UI not yet implemented (statistical function exists).
- Dashboard tile layout (F-18 Could) not yet implemented.
- PDF parsing for context documents extracts text client-side (basic); advanced OCR is out of scope.
- Concurrent multi-user writes to the same SQLite file are not recommended — see roadmap item for PostgreSQL.

### Roadmap

- PostgreSQL backend option
- Box plot UI
- Dashboard tile composer
- FTS5-backed full-text search UI
- Playwright tests expanded to full golden path
