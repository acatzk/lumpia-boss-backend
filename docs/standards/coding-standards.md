# Lumpia Boss Backend – Coding Standards & Style Guide

This document establishes the mandatory architectural rules, coding standards, and TypeScript conventions for the **Lumpia Boss Backend** codebase.

---

## ⚡ Core Rules & Conventions

### 1. Types Over Interfaces

Always declare data models, request types, and context bindings using `type`. Never use `interface`.

```typescript
// ✅ CORRECT
export type AppContext = Context<{ Bindings: Bindings; Variables: AppVariables }>
export type SystemHealthStatus = {
  service: string
  status: 'healthy' | 'degraded'
  timestamp: string
}

// ❌ INCORRECT
export interface SystemHealthStatus {
  service: string
  status: string
}
```

---

### 2. Arrow Functions Everywhere

Always use arrow functions for components, handlers, utilities, and services. Only Next.js `page.tsx` default exports are exempted.

```typescript
// ✅ CORRECT
export const systemController = {
  healthCheck: async (c: AppContext) => {
    return successJson(c, { status: 'healthy' })
  }
}

// ❌ INCORRECT
export function healthCheck(c: AppContext) { ... }
```

---

### 3. Zero `any` Policy

Never use `any`. Always provide explicit TypeScript types, generics, or `unknown` with runtime type narrowing.

```typescript
// ✅ CORRECT
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  throw new HTTPException(500, { message })
}

// ❌ INCORRECT
catch (error: any) {
  return c.json({ error: error.message }, 500)
}
```

---

### 4. Strict Import Ordering (Ascending Line Length)

Organize all imports into distinct groups separated by a blank line. Within each group, lines **must be sorted by character length in ascending order** (shortest line first).

1. **Package Imports** (sorted shortest to longest)
   _(blank line)_
2. **Absolute Imports** using `~/...` (sorted shortest to longest)
   _(blank line)_
3. **Relative/Normal Imports** (sorted shortest to longest)

```typescript
// ✅ CORRECT
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'

import { AppContext } from '~/types'
import { createDb } from '~/db/client'
import { successJson, serverErrorJson } from '~/utils/response'
```

---

### 5. Always Use Bun

Always use `bun` as the package manager and CLI runner.

- **Install packages**: `bun add <package>` or `bun add -d <package>`
- **Run scripts**: `bun run <script>`
- **Execute tools**: `bun x <tool>`

---

## 🏛️ Architectural Layering: Controller-Route-Service-Utils

The codebase strictly separates concerns into 4 layers:

```text
HTTP Request
     │
     ▼
┌─────────────┐
│   Routes    │  -> Defines URL paths, OpenAPI metadata, request validators (Zod)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controllers │  -> Extracts params/body, delegates to services, returns standardized JSON
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Services   │  -> Business logic, calculations, and Drizzle ORM database queries
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Utils    │  -> Shared helpers (response formatting, database client, error helpers)
└─────────────┘
```

### Layer Responsibilities

| Layer                                | Responsibility                | What It SHOULD Do                                                                   | What It Should NEVER Do                                    |
| :----------------------------------- | :---------------------------- | :---------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| **Routes** (`src/routes/`)           | Endpoint registration         | Mount HTTP verbs, attach `describeRoute`, attach `zodValidator`                     | Never query the database or contain business logic         |
| **Controllers** (`src/controllers/`) | Request/Response coordination | Validate params, invoke services, return `successJson`, `notFoundJson`, `errorJson` | Never write raw SQL or complex business formulas           |
| **Services** (`src/services/`)       | Business logic & DB queries   | Execute Drizzle queries using `createDb(c.env)`, transform data, calculate margins  | Never interact directly with HTTP request/response headers |
| **Utils** (`src/utils/`)             | Reusable helpers              | Standardize HTTP responses, handle Neon client retries, string sanitation           | Never import routes or controllers                         |

---

## 📦 Standardized HTTP Response Utilities (`src/utils/response.ts`)

Always use the response helpers instead of ad-hoc `c.json(...)` calls:

| Helper                                                          | Status    | Description                                                                      |
| :-------------------------------------------------------------- | :-------- | :------------------------------------------------------------------------------- |
| `successJson(c, data, status = 200)`                            | 200 / 201 | Returns data payload                                                             |
| `messageJson(c, message, status = 200)`                         | 200       | Returns `{ message: string }`                                                    |
| `cachedJson(c, data, options?)`                                 | 200       | Attaches `Cache-Control: stale-while-revalidate` headers for edge caching        |
| `errorJson(c, message, status = 400, extra?)`                   | 400       | Returns `{ error: string, ...extra }`                                            |
| `notFoundJson(c, message = 'Resource not found')`               | 404       | Returns `{ message: string }`                                                    |
| `unauthorizedJson(c, message = 'Unauthorized')`                 | 401       | Returns `{ error: string }`                                                      |
| `forbiddenJson(c, message = 'Forbidden')`                       | 403       | Returns `{ error: string, code: 'FORBIDDEN' }`                                   |
| `serverErrorJson(c, message = 'Internal server error', extra?)` | 500       | Returns `{ message: string, ...extra }`                                          |
| `tooManyRequestsJson(c, message, retryAfter?)`                  | 429       | Returns `{ error: string, code: 'TOO_MANY_REQUESTS' }` with `Retry-After` header |

### Response Helper Example

```typescript
import { AppContext } from '~/types'
import { notFoundJson, successJson } from '~/utils/response'

export const itemController = {
  getItemById: async (c: AppContext) => {
    const { id } = c.req.valid('param' as never)
    const item = await itemService.getById(c, id)

    if (!item) {
      return notFoundJson(c, `Item with ID ${id} not found`)
    }

    return successJson(c, item)
  }
}
```

---

## 🎨 Prettier & Biome Formatting Rules

All code in this project follows:

- **No semicolons**: `semi: false`
- **Single quotes**: `singleQuote: true`
- **2 spaces indentation**: `tabWidth: 2`
- **Print width**: `printWidth: 100`
- **Trailing comma**: `trailingComma: "none"`

Run formatting and linting:

```bash
# Format code
bun run format

# Verify formatting
bun run format:check

# Run linter
bun run lint

# TypeScript verification
bun x tsc --noEmit
```
