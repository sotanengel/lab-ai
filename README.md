# Lab AI — Researcher Experiment Analysis Platform

研究実験データを取込・整理・可視化し、MCP サーバー経由で生成 AI の分析アドバイスを受けられる、オフラインファーストな統合ブラウザアプリケーション。

> **Status:** Phase 1（基盤構築）スキャフォールディング完了。

## Quick start

```bash
cp .env.example .env
# 必要に応じて ANTHROPIC_API_KEY を設定
docker compose up --build
```

- Frontend: http://localhost:3000
- API:      http://localhost:8787
- MCP:      stdio (docker compose 内で `mcp` サービスとして起動)

## Architecture

| レイヤー        | コンポーネント                | 技術                               |
|-----------------|-------------------------------|------------------------------------|
| Frontend        | `apps/web`                    | Next.js 15 (App Router) + Tailwind |
| Backend API     | `apps/api`                    | Hono + Zod                         |
| MCP Server      | `packages/mcp-server`         | `@modelcontextprotocol/sdk`        |
| DB              | `packages/db`                 | Drizzle ORM + better-sqlite3       |
| Shared types    | `packages/shared`             | Zod スキーマ + 推論型              |

## Monorepo layout

```
apps/
  api/         # Hono REST API
  web/         # Next.js 15 frontend
packages/
  shared/      # Zod schemas + shared types
  db/          # Drizzle schema + migrations + SQLite client
  mcp-server/  # MCP server (stdio)
docker/        # Dockerfiles per service
.github/
  workflows/   # CI, release, dependency review
```

## Development

最初に `pnpm install` を実行して `pnpm-lock.yaml` を生成する必要があります（Takumi Guard レジストリ経由でロックされます）。

```bash
pnpm install                  # generates pnpm-lock.yaml via Takumi Guard
pnpm run db:migrate           # apply SQLite migrations
pnpm --filter @lab-ai/api dev # start API at :8787
pnpm --filter @lab-ai/web dev # start Next.js at :3000
```

### Useful scripts

| Script                | Description                              |
|-----------------------|------------------------------------------|
| `pnpm run lint`       | Biome lint + format check                |
| `pnpm run typecheck`  | TypeScript `--noEmit` across workspace   |
| `pnpm run test`       | Vitest unit tests across workspace       |
| `pnpm run build`      | Build all packages and apps              |
| `pnpm run db:generate`| Generate Drizzle migrations from schema  |
| `pnpm run db:migrate` | Apply migrations to `$DATABASE_URL`      |

## Supply-chain security — Takumi Guard

All npm installs are routed through [Takumi Guard](https://flatt.tech/takumi/features/guard) (GMO Flatt Security) as a registry proxy. See `.npmrc` and `.github/workflows/ci.yml` for the setup.

- **Local:** `.npmrc` pins `registry=https://npm.flatt.tech/`
- **CI:** `flatt-security/setup-takumi-guard-npm@v1` runs in every workflow (full-protection mode via `vars.TAKUMI_BOT_ID`)

## Phase-by-phase roadmap

| Phase | Theme                          | Status       |
|-------|--------------------------------|--------------|
| 1     | 基盤構築                       | **Scaffold** |
| 2     | データ取込・管理 UI            | Pending      |
| 3     | グラフ可視化                   | Pending      |
| 4     | MCP サーバー & AI 連携         | Pending      |
| 5     | 品質向上・リリース             | Pending      |

## License

MIT. See `LICENSE`.
