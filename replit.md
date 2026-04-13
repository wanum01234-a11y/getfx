# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- **Trading Dashboard** (`artifacts/trading-dashboard-app`, preview `/`): React + Vite frontend-only premium trading dashboard with dashboard analytics, open trades, closed trades, Recharts performance visualization, Framer Motion transitions, mock trading data, a dedicated WhatsApp template settings page, reusable variables, and WhatsApp share links for open and closed trades.
- **API Server** (`artifacts/api-server`, preview `/api`): Express API server with health route.
- **Canvas** (`artifacts/mockup-sandbox`, preview `/__mockup`): Component preview/design sandbox.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/trading-dashboard run dev` — run Trading Dashboard locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
