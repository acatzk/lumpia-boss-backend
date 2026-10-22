# HONC Stack – Folder Structure & Architecture Guide

## Overview

This document details the folder structure, layering conventions, environment handling, and architectural patterns of the **Lumpia Boss Backend** built on the **HONC stack** (Hono, ORM via Drizzle, Neon Postgres, Cloudflare Workers).

---

## 🏗️ Technology Stack Layers

| Layer                   | Technology                     | Usage & Role                                                                              |
| :---------------------- | :----------------------------- | :---------------------------------------------------------------------------------------- |
| **Framework**           | **Hono** (`v4.7.0`)            | Ultra-fast web framework running on Cloudflare Workers edge runtime.                      |
| **Runtime**             | **Cloudflare Workers**         | Edge serverless execution environment managed via Wrangler (`v4.4.0`).                    |
| **ORM**                 | **Drizzle ORM** (`v0.43.1`)    | Type-safe SQL query builder with `snake_case` database casing and Drizzle Kit migrations. |
| **Database**            | **Neon PostgreSQL**            | Serverless PostgreSQL cloud database with isolated `develop` and `production` branches.   |
| **Driver**              | **`@neondatabase/serverless`** | Edge-compatible HTTP driver for Neon Postgres with cold-start resilient retries.          |
| **API Docs & Explorer** | **Hono OpenAPI & Fiberplane**  | Type-safe OpenAPI v3 schema generation and interactive API playground (`/fp`).            |
| **Validation**          | **Zod & Drizzle-Zod**          | Runtime request body, query, and path parameter validation with OpenAPI integration.      |
| **Code Style**          | **Prettier & Biome**           | Automated formatting (`.prettierrc`) and high-performance linting (`biome.json`).         |
| **Package Manager**     | **Bun**                        | Ultra-fast package installation, script runner, and local CLI execution.                  |

---

## 📁 Root Directory Layout

```text
├── src/                        # Primary source code directory
├── docs/                       # Architectural documentation & coding standards
│   ├── architecture/           # System architecture & HONC stack specifications
│   ├── standards/              # Coding standards, style guides & conventions
│   └── tasks/                  # Task implementation records and milestone docs
├── .github/                    # CI/CD Workflows
│   └── workflows/              # actions.yml, deploy-dev.yml, deploy-prod.yml
├── .vscode/                    # Editor workspace settings (settings.json)
├── wrangler.toml               # Cloudflare Workers configuration (bindings, environments)
├── .dev.vars                   # Local environment secrets for wrangler dev (gitignored)
├── .dev.vars.example           # Example template for local develop environment
├── .prod.vars                  # Production environment reference secrets (gitignored)
├── .prod.vars.example          # Example template for production environment
├── .env.development            # Local environment secrets for drizzle-kit dev CLI (gitignored)
├── .env.production             # Production environment secrets for drizzle-kit prod CLI (gitignored)
├── drizzle.config.ts           # Root Drizzle Kit configuration (supports ENVIRONMENT=production)
├── .prettierrc                 # Prettier code formatting rules
├── .prettierignore             # Prettier ignore patterns
├── biome.json                  # Biome linting and formatting configuration
├── package.json                # Project dependencies, devDependencies, and npm/bun scripts
├── bun.lock                    # Bun lockfile
└── tsconfig.json               # TypeScript compiler configuration with ~/* path aliases
```

---

## 📂 `src/` Directory Breakdown

```text
src/
 ├── config/                    # Configuration tokens & third-party configs
 │   ├── cors.ts                # CORS middleware configuration
 │   ├── drizzle-dev.config.ts  # Drizzle Kit config for Neon develop branch
 │   └── drizzle-prod.config.ts # Drizzle Kit config for Neon production branch
 ├── constants/                 # Shared system constants & messages
 │   └── messages.ts            # Standardized success and error messages
 ├── controllers/               # HTTP Request Controllers (context, req/res handling)
 │   └── systemController.ts    # Health check, ping, and robots.txt handlers
 ├── db/                        # Database Abstraction Layer
 │   ├── client.ts              # Resilient createDb() factory with cold-start retry & caching
 │   ├── schema.ts              # Drizzle table schemas (domain models added per feature)
 │   └── drizzle/               # Auto-generated SQL migration files
 ├── middlewares/               # Cross-Cutting Middlewares
 │   ├── dbProvider.ts          # Attaches active Neon Db instance to c.set('db', db)
 │   ├── errorHandler.ts        # Centralized HTTP & unhandled error handler
 │   └── validator.ts           # Standardized OpenAPI Zod validator wrapper
 ├── routes/                    # Hono Router Definitions & Route Mounting
 │   ├── systemRoutes.ts        # /health, /ping, /robots.txt
 │   └── index.ts               # Central router mounting sub-routers
 ├── services/                  # Business Logic & Database Queries (added per feature)
 ├── types/                     # Shared TypeScript Types (Zero 'any', 'type' only)
 │   └── index.ts               # Bindings, AppContext, AppVariables, ApiResponse types
 ├── utils/                     # Helper Utilities
 │   ├── response.ts            # Standardized & cached JSON response helpers
 │   ├── error.ts               # Shared error handling response helper
 │   └── messages.ts            # Re-exported message constants
 └── index.ts                   # Application Entry Point & Bindings Export
```

---

## ⚡ Database Client Pattern (`createDb`)

Because Cloudflare Workers execute in a stateless edge environment without module-level `process.env`, database clients are initialized per request via `c.env`:

```typescript
// src/db/client.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon, neonConfig } from '@neondatabase/serverless'

type EnvWithDb = {
  DATABASE_URL?: string
}

export type Db = ReturnType<typeof drizzle>

const dbCache = new Map<string, Db>()

neonConfig.fetchFunction = fetchWithRetry

export const getConnectionString = (target: string | EnvWithDb): string => {
  let raw = typeof target === 'string' ? target : target.DATABASE_URL || ''
  if (!raw) return ''

  // Strip channel_binding (only applicable to raw TCP sockets, causes issues over Neon HTTP proxy)
  raw = raw.replace(/([?&])channel_binding=[^&]*(&|$)/g, '$1')
  raw = raw.replace(/[?&]$/, '')

  return raw
}

export const createDb = (target: string | EnvWithDb): Db => {
  const databaseUrl = getConnectionString(target)
  let db = dbCache.get(databaseUrl)
  if (!db) {
    const sql = neon(databaseUrl)
    db = drizzle(sql, { casing: 'snake_case' })
    dbCache.set(databaseUrl, db)
  }
  return db
}
```

### Key Resiliency Features

1. **Cold-Start Auto-Retry**: Neon compute branches scale to zero when idle. `fetchWithRetry` intercepts `502`, `503`, `504`, and `530` status codes and retries transparently with exponential backoff while the database wakes up.
2. **Channel Binding Sanitization**: Neon serverless HTTP proxies reject raw TCP `channel_binding=require` query parameters. `getConnectionString` automatically sanitizes them.
3. **Connection Pooling Cache**: Re-uses Drizzle client instances across edge worker invocations when connecting to the same branch.

---

## 🔐 Environment & Secret Flow

```text
Local Development:
  wrangler dev   ──> Reads .dev.vars & wrangler.toml ──> c.env.DATABASE_URL (Neon develop branch)
  drizzle-kit    ──> Reads .env.development          ──> process.env.DATABASE_URL (Neon develop branch)

Production Deployment:
  Cloudflare Workers ──> Wrangler Secrets & Bindings ──> c.env.DATABASE_URL (Neon production branch)
  drizzle-kit        ──> Reads .env.production       ──> process.env.DATABASE_URL (Neon production branch)
```

### Neon Database Connection Strings

Database credentials are encrypted and stored in gitignored `.dev.vars`, `.prod.vars`, `.env.development`, and `.env.production` files:

- **Develop Branch:**
  `postgresql://neondb_owner:********@ep-sweet-term-aoptnwiz.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- **Production Branch:**
  `postgresql://neondb_owner:********@ep-lively-sky-aocw54mx.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

---

## 📜 Available Bun Package Scripts

| Command                    | Action                                                        |
| :------------------------- | :------------------------------------------------------------ |
| `bun run dev`              | Start local development server via Wrangler (`wrangler dev`). |
| `bun run deploy`           | Deploy Worker to production environment.                      |
| `bun run deploy:prod`      | Deploy Worker with production environment bindings.           |
| `bun run db:push:dev`      | Apply pending schema changes to **Neon develop branch**.      |
| `bun run db:push:prod`     | Apply pending schema changes to **Neon production branch**.   |
| `bun run db:generate:dev`  | Generate migration SQL files for develop database.            |
| `bun run db:generate:prod` | Generate migration SQL files for production database.         |
| `bun run db:migrate:dev`   | Run migrations against develop database.                      |
| `bun run db:migrate:prod`  | Run migrations against production database.                   |
| `bun run db:seed:dev`      | Seed initial data into develop database.                      |
| `bun run db:seed:prod`     | Seed initial data into production database.                   |
| `bun run db:studio:dev`    | Launch Drizzle Studio pointing to develop branch.             |
| `bun run db:studio:prod`   | Launch Drizzle Studio pointing to production branch.          |
| `bun run format`           | Automatically format all project files using Prettier.        |
| `bun run format:check`     | Check Prettier code style alignment across the project.       |
| `bun run lint`             | Execute Biome check and auto-fix across `src/`.               |
| `bun test`                 | Execute Vitest test suite.                                    |
