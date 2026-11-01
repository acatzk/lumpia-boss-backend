# [LBS-06] - [BE] Create Admin Auth API Functionality

> **Task ID:** `LBS-06`  
> **Branch:** `LBS-06-create-admin-auth-api-functionality`  
> **Module:** Private Authentication & Access Control  
> **Target Release:** Milestone 1 (Foundation & Security)  
> **Status:** Completed

---

## 1. Executive Summary & Security Objectives

Task **`[LBS-06]`** implements the private, production-grade administrator authentication API for the **Lumpia Boss Backend** (HONC Stack: Hono, Drizzle ORM, Neon Postgres, Cloudflare Workers).

Because Lumpia Boss operates a commercial food manufacturing facility where recipes (pork-to-TVP 80:20), direct material landed costs (₱/pc), sales volumes, and partner equity percentages are trade secrets, the authentication layer enforces defense-in-depth protection:

1. **Brute-Force & Bot Mitigation**: Google reCAPTCHA verification on login submissions.
2. **Abuse Prevention**: Sliding window rate limiting middleware at the edge with IP tracking (`cf-connecting-ip`, `x-forwarded-for`).
3. **Robust Token Lifecycle**: 15-minute JWT access tokens paired with cryptographically secure, rotating refresh tokens stored as SHA-256 hashes in Neon Postgres.
4. **Replay Threat Detection**: Automatic revocation of all active sessions if a previously revoked refresh token is reused.
5. **Anti-Enumeration Safeguards**: Constant-time password verification and generic `401 Unauthorized` responses that conceal account existence.

---

## 2. Architecture & Implementations

```text
POST /api/auth/login
       │
       ▼
┌─────────────────────────┐
│   loginRateLimiter      │  ──► Exceeded? 429 Too Many Requests (Retry-After)
└──────────┬──────────────┘
           │ Passed (< 5 reqs / 15m)
           ▼
┌─────────────────────────┐
│   zodValidator (Body)   │  ──► Invalid? 400 Bad Request
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│   verifyRecaptcha       │  ──► Bot / Failed? 400 Bad Request
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│   authService.login     │  ──► Bcrypt salted hash verify (12 rounds)
└──────────┬──────────────┘
           │ Success
           ▼
┌─────────────────────────┐
│  Token Pair & Cookies   │  ──► Sets HTTP-only SameSite=Lax cookie & returns JSON
└─────────────────────────┘
```

### A. Database Models (`src/db/schema.ts`)

1. **`users` Table:**
   - `id`: UUID primary key (`defaultRandom()`)
   - `email`: Text, unique, indexed, case-insensitive normalized
   - `passwordHash`: Text (Bcrypt 12 rounds)
   - `name`: Text
   - `role`: PostgreSQL Enum (`SUPER_ADMIN`, `MANAGING_PARTNER`, `OPERATOR`, `SHAREHOLDER_VIEWER`)
   - `isActive`: Boolean, defaults to `true`
   - `lastLoginAt`: Timestamp with time zone
   - `createdAt` / `updatedAt`: Timestamps with time zone

2. **`refreshTokens` Table:**
   - `id`: UUID primary key
   - `userId`: Foreign key references `users(id)` with `onDelete: cascade`
   - `tokenHash`: SHA-256 hash of plaintext token (protects plain tokens against DB dump leaks)
   - `expiresAt`: Timestamp with time zone (7 days standard, 30 days if `rememberMe`)
   - `revokedAt`: Timestamp with time zone (marks token rotation / logout)
   - `userAgent` / `ipAddress`: Audit trail metadata
   - `createdAt`: Timestamp with time zone

---

### B. Core Security Utilities & Middlewares

1. **Password Utility (`src/utils/password.ts`)**:
   - `hashPassword(password)`: Bcrypt hashing with 12 salt rounds.
   - `comparePassword(password, hash)`: Safe comparison preventing timing leaks.

2. **reCAPTCHA Verification (`src/utils/recaptcha.ts`)**:
   - Verifies submitted `recaptchaToken` with Google Siteverify API (`https://www.google.com/recaptcha/api/siteverify`).
   - Supports automated test tokens (`mock-recaptcha-token-for-dev-and-testing`) and development bypass flags.
   - Enforces v3 bot score threshold (`score >= 0.5`).

3. **Rate Limiting Middleware (`src/middlewares/rateLimiter.ts`)**:
   - Edge sliding window rate limiter tracking client IP.
   - `loginRateLimiter`: Maximum 5 attempts per 15-minute window.
   - `refreshRateLimiter`: Maximum 30 requests per 15-minute window.
   - Attaches `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` headers.
   - Returns standardized `429 Too Many Requests` response.

4. **Token Service & Rotation (`src/services/tokenService.ts`)**:
   - `generateAccessToken(user, secret)`: Generates signed HMAC-SHA256 JWT valid for 15 minutes.
   - `createRefreshToken(c, userId, rememberMe, reqInfo)`: Generates 48-byte cryptographically secure random token, hashes with SHA-256, and stores in Postgres.
   - `rotateRefreshToken(c, oldToken, reqInfo)`: Validates old token, marks as revoked, issues a fresh token pair.
   - **Replay Attack Defense**: If a revoked token is presented, all active sessions for that user are immediately revoked as an automated intrusion countermeasure.

5. **Authentication Middleware (`src/middlewares/authMiddleware.ts`)**:
   - `authMiddleware`: Extracts Bearer token from `Authorization` header or `lbs_access_token` cookie, validates JWT, verifies user active state in DB, and sets `c.set('user', safeUser)`.
   - `requireRoles(...roles)`: RBAC gate verifying authorized roles.

---

### C. API Endpoints (`src/routes/authRoutes.ts`)

| Verb   | Path                      | Middleware                           | Description                                                   |
| :----- | :------------------------ | :----------------------------------- | :------------------------------------------------------------ |
| `POST` | `/v1/api/auth/login`      | `loginRateLimiter`, `zodValidator`   | Authenticates email, password, and reCAPTCHA; issues tokens   |
| `POST` | `/v1/api/auth/refresh`    | `refreshRateLimiter`, `zodValidator` | Rotates refresh token and issues new access token             |
| `POST` | `/v1/api/auth/logout`     | `zodValidator`                       | Revokes refresh token in database, clears HTTP-only cookies   |
| `GET`  | `/v1/api/auth/me`         | `authMiddleware`                     | Returns profile of currently authenticated user               |
| `POST` | `/v1/api/auth/seed-admin` | `zodValidator`                       | Provisions initial administrator (secured by secret/dev mode) |
| `GET`  | `/api-docs`               | `basicAuth`                          | Branded interactive API documentation portal                  |
| `GET`  | `/api-docs/swagger`       | `basicAuth`                          | Interactive Swagger UI OpenAPI explorer                       |
| `GET`  | `/openapi.json`           | None                                 | Raw OpenAPI 3.1 JSON specification                            |

---

### D. Protected Swagger UI & Documentation (`src/routes/docsRoutes.ts`)

Referencing the pattern from `filipino-reels-backend`:

- Interactive Swagger UI (`@hono/swagger-ui`) mounted at `/api-docs/swagger` and `/swagger`.
- Protected via HTTP Basic Authentication (`basicAuth`):
  - `SWAGGER_USERNAME`: Configurable via environment variables (default `admin`).
  - `SWAGGER_PASSWORD`: Cryptographically secure secret credential.
- Unauthenticated requests receive `401 Unauthorized` prompting browser credentials dialog.
- Interactive HTML portal at `/api-docs` styled in Lumpia Boss gold/amber theme with card lighting effects.

---

## 3. Verification & Test Suite

Automated Vitest test suite (`tests/auth.spec.ts` and `tests/index.spec.ts`):

```bash
bun x vitest run
```

```text
 RUN  v3.2.7 C:/Users/acatzk/Videos/Personal Projects/lumpia-boss-backend

 ✓ tests/index.spec.ts (7 tests) 47ms
 ✓ tests/auth.spec.ts (12 tests) 4644ms
   ✓ Admin Authentication & Security API > accepts requests mounted under the /v1/api prefix 565ms
   ✓ Admin Authentication & Security API > authenticates valid credentials, sets HTTP-only cookies, and returns token pair 408ms
   ✓ Admin Authentication & Security API > allows access to /api/auth/me with valid Bearer token 467ms
   ✓ Admin Authentication & Security API > rotates refresh token and invalidates previous token to prevent replay attacks 762ms
   ✓ Admin Authentication & Security API > logs out and revokes refresh token session 581ms
   ✓ Admin Authentication & Security API > rate limiting middleware blocks repeated requests from abusive IP with 429 1452ms

 Test Files  2 passed (2)
      Tests  19 passed (19)
   Duration  7.05s
```

### Static Analysis & Verification

| Check                      | Command                |               Result                |
| :------------------------- | :--------------------- | :---------------------------------: |
| **Biome Linter**           | `bun run lint`         |  Pass (33 files checked, 0 errors)  |
| **Prettier Formatting**    | `bun run format:check` |       Pass (All files match)        |
| **TypeScript Typecheck**   | `bun x tsc --noEmit`   |           Pass (0 errors)           |
| **Neon Develop Sync**      | `bun run db:push:dev`  |    Pass (`[✓] Changes applied`)     |
| **Neon Production Sync**   | `bun run db:push:prod` |    Pass (`[✓] Changes applied`)     |
| **Admin Database Seeding** | `bun run db:seed:dev`  | Pass (`admin@lumpiaboss.ph` seeded) |
