# AGENT.MD — goukon-kanri

Auto-generated project guidelines for coding agents. Last updated: 2026-03-14

## Active Technologies

- Next.js 16.x (App Router) + React 19.x
- TypeScript 5.x (strict: true)
- Prisma 6.x + PostgreSQL 15+ (dev: Docker Compose, prod: Supabase)
- Tailwind CSS 4.x + shadcn/ui + TanStack Table 8.x
- Vitest (unit/integration) + Playwright (E2E)

Note: Some design docs mention Next.js 15.x, but the repository currently depends on `next@16.1.6` (see `package.json`).

## Project Structure

```text
goukon-kanri/
├── prisma/
│   └── schema.prisma          # Prisma schema
├── src/
│   ├── app/                   # Next.js App Router routes (Server Components by default)
│   ├── actions/               # Server Actions ("use server") for mutations
│   ├── queries/               # Data fetching helpers for Server Components
│   ├── lib/                   # Framework-agnostic business logic/utilities
│   ├── types/                 # Shared types (ActionResult, summaries, etc.)
│   └── components/            # UI components (includes shadcn/ui)
├── tests/
│   ├── unit/                  # Vitest unit tests
│   ├── integration/           # Vitest integration tests (DB: 5433)
│   └── e2e/                   # Playwright tests
└── specs/001-goukon-web-app/   # Spec/plan/tasks and design docs
```

## Commands

```bash
# App
npm run dev
npm run build
npm run start
npm run lint

# Tests
npm run test:run
npm run test:e2e

# Local DB (dev)
npm run db:up
npm run db:migrate
npm run db:studio
npm run db:reset
npm run db:down

# Test DB (integration tests)
npm run db:test:up
npm run db:test:migrate
```

## Code Style

- Default to Server Components; add `"use client"` only when needed for interactivity.
- Fetch data in Server Components via `src/queries/*`.
- Mutate data via Server Actions in `src/actions/*` (avoid API Routes).
- After mutations, invalidate caches with `revalidatePath()` (and/or `revalidateTag()` when using cache tags).
- Use Zod schemas + inferred types; avoid `any`.
- Prefer Prisma-generated types over duplicating domain types.
- Use `ActionResult<T>` discriminated union for Server Action returns.

## Recent Changes

- `001-goukon-web-app`: created/maintained spec/plan/tasks and design docs (2026-02-27 to 2026-03-13).

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

