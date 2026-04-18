# Release notes

## v1.1.0 (unreleased)

Follow-up improvements on top of v1.0.

### New features
- **AI 取込アシスト**: Claude が先頭 32KB を読んでフォーマット・ヘッダ・カラム型・単位を提案。ワンクリック反映
- **整合性チェック**: 登録時の SHA-256 + 統計量と手元ファイルを比較
- **観察メモ**: 実験ごとの自由記述メモ（Markdown 対応、編集・削除可）
- **ダッシュボード（F-18）**: 複数チャートのタイル表示。レイアウトは `localStorage`
- **複数実験比較（F-16）**: 共通カラムを抽出して同一グラフに重ね描き、URL で共有可
- **箱ひげ図（F-15）**: SVG 自前描画で min/max・Q1–Q3・中央値・外れ値をプロット
- **XLSX エクスポート（F-06）**: `data` + `meta` 2 シート、数値/真偽/日時を型付きセル
- **AI 回答の Markdown レンダリング**: react-markdown + rehype-sanitize で XSS 対策
- **コンテキスト文書の PDF/URL 取込（F-22 完成）**: `unpdf` で PDF テキスト抽出、URL は HTML/PDF/テキストを自動判別
- **行編集（F-05）**: セル単位の編集・行単位の削除（rowCount 自動再集計）
- **値範囲 / カテゴリフィルタ（F-10）**: チャートサイドバーからスタック可能なフィルタ
- **コマンドパレット**: `⌘K` / `Ctrl+K` で実験・ページをファジー検索してジャンプ

### 基盤
- `experiments` に `source_filename` / `source_hash` / `source_size` / `registered_at` を追加（migration 0001）
- `experiment_notes` テーブル追加（migration 0002）
- `@anthropic-ai/sdk`, `exceljs`, `unpdf`, `react-markdown`, `rehype-sanitize`, `remark-gfm` を導入
- Takumi Guard 経由の install を CI とローカルで有効化

### CI / 開発体験
- pre-commit（Biome）+ pre-push（lint + typecheck）フック
- CI ワークフローを堅牢化（Takumi Guard 条件化、`--no-frozen-lockfile`、dependency-review はソフトフェール）
- Docker マルチステージを簡素化 + 非 root 実行、Next.js 15 / Tailwind v4 の PostCSS プラグイン切替
- Playwright スモーク

## v1.0.0

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

- Concurrent multi-user writes to the same SQLite file are not recommended — see roadmap item for PostgreSQL.

### Roadmap

- PostgreSQL backend option
- FTS5-backed full-text search UI across experiments, notes, and docs
- OCR for scanned PDF contexts
- User-authored MCP tools
