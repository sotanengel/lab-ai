# Lab AI — Researcher Experiment Analysis Platform

研究実験データを取込・整理・可視化し、生成 AI の分析アドバイスを受けられるオフラインファーストな統合ブラウザアプリケーション。

> **Status:** v1.0 機能群（Phase 1–5）+ 後続改善（整合性チェック、AI 取込アシスト、複数実験比較、ダッシュボード、箱ひげ図、XLSX エクスポート、PDF/URL コンテキスト取込、行編集、コマンドパレット）まで実装済み。

## Quick start

```bash
cp .env.example .env
# 必要に応じて ANTHROPIC_API_KEY を設定（AI 機能はこれが無いと無効化されます）
docker compose up --build
```

- Frontend: http://localhost:3000
- API:      http://localhost:8787
- MCP:      stdio（docker compose 内で `mcp` サービスとして起動）

## 機能一覧

### データ取込・管理
- CSV / TSV / JSON / TXT のドラッグ＆ドロップ取込 + プレビュー
- カラム型の自動推定（インライン編集可）
- **AI による取込設定の自動化** — ファイル先頭を Claude に見せてフォーマット・ヘッダ・カラム型を一括生成
- SHA-256 ハッシュ・ファイル名・サイズ・登録日を自動保存
- セル単位の **行編集 / 行削除**
- CSV / JSON / **XLSX** エクスポート（XLSX は data + meta 2 シート）
- **整合性チェック** — 手元のファイルと登録時の SHA-256 + 統計量を比較

### 可視化
- 折れ線 / 散布図 / 棒 / ヒストグラム / **箱ひげ図**
- 複数 Y 軸系列の重ね描き、カテゴリ列での棒グラフ分割
- **値範囲 / カテゴリフィルタ**（スタック可能）
- **複数実験比較** — 共通カラムを抽出して重ね描き
- **ダッシュボード** — タイル配置の複数チャート（レイアウトは localStorage）
- PNG / SVG エクスポート

### AI・コンテキスト
- Claude Opus 4.7 による **ストリーミング分析チャット**（仮説 / 推奨実験 / 注意点 の構造化 Markdown）
- **rehype-sanitize** で XSS 対策済み Markdown レンダラ
- コンテキスト文書: テキスト / **PDF（unpdf）** / **URL フェッチ**
- AI 応答を「ノートとして保存」で実験に紐付け
- 手動の **観察メモ**（独立した編集可能なメモ欄）
- MCP サーバー（stdio）経由で外部エージェントからも実験データ・コンテキストを取得可

### 品質・体験
- PWA — オフラインでもシェルが動作
- **⌘K コマンドパレット** — 実験・ページにワンショットジャンプ
- アクセシビリティ — skip link、focus ring、aria-live、semantic landmarks
- Playwright E2E スモーク（ホーム・ナビ・取込ページ）
- Vitest ユニットテスト（型・パーサ・統計・整合性・ハッシュ・フィルタ）

### セキュリティ
- **Takumi Guard**（GMO Flatt Security）で npm サプライチェーン保護（ローカル `.npmrc` + CI）
- pre-commit（Biome）+ pre-push（lint + typecheck）フック
- CI: dependency-review、Docker build smoke、multi-stage image build
- API: Zod バリデーション、secure headers、XSS 対策済み Markdown

## Architecture

| レイヤー        | コンポーネント                | 技術                               |
|-----------------|-------------------------------|------------------------------------|
| Frontend        | `apps/web`                    | Next.js 15 (App Router) + Tailwind v4 + Recharts + react-markdown |
| Backend API     | `apps/api`                    | Hono + Zod + Anthropic SDK + exceljs + unpdf |
| MCP Server      | `packages/mcp-server`         | `@modelcontextprotocol/sdk` |
| DB              | `packages/db`                 | Drizzle ORM + better-sqlite3 |
| Shared types    | `packages/shared`             | Zod スキーマ + 推論型 |

## Monorepo layout

```
apps/
  api/         # Hono REST API
  web/         # Next.js 15 frontend
packages/
  shared/      # Zod schemas + shared types
  db/          # Drizzle schema + migrations + SQLite client
  mcp-server/  # MCP server (stdio)
docker/        # per-service Dockerfiles
docs/api.md    # REST API reference
e2e/           # Playwright smoke tests
.github/
  workflows/   # CI, release, dependency-review
```

## Development

`pnpm install` が `pnpm-lock.yaml` を生成し Husky フックをセットアップします（Takumi Guard 経由）。

```bash
pnpm install                  # generates pnpm-lock.yaml + husky hooks
pnpm run db:migrate           # apply SQLite migrations
pnpm --filter @lab-ai/api dev # start API at :8787
pnpm --filter @lab-ai/web dev # start Next.js at :3000
```

### Scripts

| Script                | Description                              |
|-----------------------|------------------------------------------|
| `pnpm run lint`       | Biome lint + format check                |
| `pnpm run typecheck`  | TypeScript `--noEmit` across workspace   |
| `pnpm run test`       | Vitest unit tests across workspace       |
| `pnpm run build`      | Build all packages and apps              |
| `pnpm run db:generate`| Generate Drizzle migrations from schema  |
| `pnpm run db:migrate` | Apply migrations to `$DATABASE_URL`      |
| `pnpm run e2e`        | Playwright smoke tests                   |

## Pre-commit hooks

`pnpm install` sets up Husky.

```bash
git commit -m "..."         # lint-staged → Biome on staged files
git push                    # full lint + typecheck
```

## Supply-chain security — Takumi Guard

All npm installs are routed through [Takumi Guard](https://flatt.tech/takumi/features/guard) (GMO Flatt Security) as a registry proxy.

- **Local:** `.npmrc` pins `registry=https://npm.flatt.tech/`
- **CI:** `flatt-security/setup-takumi-guard-npm@v1` runs conditionally when `vars.TAKUMI_BOT_ID` is set

## API reference

See [`docs/api.md`](docs/api.md) for the full REST surface.

## License

MIT. See `LICENSE`.
