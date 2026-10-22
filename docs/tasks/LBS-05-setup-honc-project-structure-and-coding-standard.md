# LBS-05: Setup HONC Project Structure & Coding Standard

This document records the architectural foundation, environment configuration, coding standards, and scaffolding implemented for **Lumpia Boss Backend** under ticket **`[LBS-05]`**, referencing patterns from `filipino-reels-backend`.

---

## 🎯 Goal

1. **Establish the HONC Stack Foundation**: Configure Hono, Drizzle ORM, Neon Postgres, and Cloudflare Workers runtime into a robust, layered architecture.
2. **Environment Separation**: Isolate the Neon `develop` and `production` database branches with dedicated CLI scripts, environment variables, and deployment pipelines.
3. **Resilient Database Client**: Implement cold-start retries and connection sanitization for edge execution against Neon Postgres.
4. **Enforce Strict Coding Standards**: Standardize TypeScript rules (`type` only, arrow functions, zero `any`), strict import ordering (ascending line length), and synchronized Prettier/Biome configurations.
5. **Clean Boilerplate**: Remove placeholder user tables and APIs to provide a clean slate for upcoming Lumpia Boss domain models.

---

## 🏗️ Architecture & Implementations

### 1. Environment Separation (Develop & Production)

Configured dual-environment credentials and tooling:

- **Neon Develop Branch:** Configured in `.dev.vars` (for local `wrangler dev`) and `.env.development` (for local Drizzle CLI).
- **Neon Production Branch:** Configured in `.prod.vars` and `.env.production`.
- **Git Security:** Updated `.gitignore` to prevent credential exposure.
- **Drizzle Environment Switching:**
  - `drizzle.config.ts`: Dynamically selects `.env.development` or `.env.production` based on `ENVIRONMENT=production`.
  - Dedicated configurations: `src/config/drizzle-dev.config.ts` and `src/config/drizzle-prod.config.ts`.
- **Bun Package Scripts**: Added targeted scripts for develop and production (`db:push:dev`, `db:push:prod`, `db:generate:dev`, `db:generate:prod`, `db:studio:dev`, `db:studio:prod`).

---

### 2. Resilient Database Client (`src/db/client.ts`)

- **Neon Cold-Start Auto-Retry**: Automatically intercepts `502`, `503`, `504`, and `530` status codes during Neon scale-to-zero wake-up periods and retries with exponential backoff.
- **Channel Binding Stripping**: Sanitizes `channel_binding=require` parameters that are incompatible with Neon serverless HTTP proxy connections.
- **Client Cache**: Caches Drizzle client instances across edge worker invocations to minimize connection overhead.

---

### 3. Layered Pattern: Controller-Route-Service-Utils

Structured `src/` into decoupled concerns:

```text
src/
 ├── config/            # Third-party configurations (cors.ts, drizzle configs)
 ├── constants/         # System constants (messages.ts)
 ├── controllers/       # HTTP controllers (systemController.ts)
 ├── db/                # Database client & schema (client.ts, schema.ts)
 ├── middlewares/       # Cross-cutting middlewares (dbProvider.ts, errorHandler.ts, validator.ts)
 ├── routes/            # Hono routers (systemRoutes.ts, index.ts)
 ├── services/          # Business logic services
 ├── types/             # TypeScript types (index.ts)
 ├── utils/             # Reusable helpers (response.ts, error.ts, messages.ts)
 └── index.ts           # Application entry point
```

#### Centralized HTTP Response Utilities (`src/utils/response.ts`)

- `successJson(c, data, status)`
- `messageJson(c, message, status)`
- `cachedJson(c, data, options)` (edge caching with `stale-while-revalidate`)
- `errorJson(c, message, status, extra)`
- `notFoundJson(c, message)`
- `unauthorizedJson(c, message)`
- `forbiddenJson(c, message)`
- `serverErrorJson(c, message, extra)`
- `tooManyRequestsJson(c, message, retryAfter)`

---

### 4. Coding Standards & Tooling

1. **Types Only**: Strictly use `type` instead of `interface`.
2. **Arrow Functions**: All functions, services, and controllers use arrow function syntax.
3. **Zero `any`**: Explicit typing or `unknown` with runtime type narrowing.
4. **Strict Import Ordering**:
   - Package imports (sorted ascending by character length)
   - [blank line]
   - Absolute imports using `~/...` (sorted ascending by character length)
   - [blank line]
   - Relative imports (sorted ascending by character length)
5. **Formatting & Linting Alignment**:
   - Prettier configuration: `.prettierrc` (single quotes, no semicolons, 2 spaces, print width 100, no trailing commas).
   - Biome configuration: `biome.json` aligned identically with Prettier rules.
   - VS Code settings: `.vscode/settings.json` configured for format on save and organize imports.
6. **Path Aliases**: Added `~/*` mapping to `./src/*` in `tsconfig.json`.

---

### 5. CI/CD Workflows (`.github/workflows/`)

- `actions.yml`: Prebuild pull request checks (Bun install, Biome lint, Prettier check, TypeScript typecheck).
- `deploy-dev.yml`: Automated schema push to Neon develop branch and Cloudflare Worker deploy on `develop` branch push.
- `deploy-prod.yml`: Automated schema push to Neon production branch and Cloudflare Worker deploy on `production` branch push.

---

### 6. Clean Scaffold State

- Dropped template `users` table from both `develop` and `production` database branches.
- Removed sample user controllers, routes, and services.
- Preserved system endpoints (`/`, `/health`, `/ping`, `/robots.txt`) and OpenAPI documentation container (`/openapi.json`, `/fp`).

---

## 🧪 Verification & Acceptance

| Check                    | Command                | Status                                    |
| :----------------------- | :--------------------- | :---------------------------------------- |
| **Develop DB Sync**      | `bun run db:push:dev`  | Passed (`[✓] Changes applied`)            |
| **Production DB Sync**   | `bun run db:push:prod` | Passed (`[✓] Changes applied`)            |
| **Linter Check**         | `bun run lint`         | Passed (24 files checked, 0 errors)       |
| **Prettier Formatting**  | `bun run format:check` | Passed (all files matched)                |
| **TypeScript Typecheck** | `bun x tsc --noEmit`   | Passed (0 errors)                         |
| **Dev Server Execution** | `bun run dev`          | Passed (`Ready on http://127.0.0.1:8787`) |
