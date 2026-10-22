# Lumpia Boss Backend – Documentation Index

Welcome to the **Lumpia Boss Backend** documentation. This service is built with the **HONC stack** (Hono, Drizzle ORM, Neon Postgres, Cloudflare Workers) and serves the API for Lumpia Boss Business Studio and Mobile clients.

---

## 📚 Documentation Structure

### 🏛️ Architecture

- **[HONC Stack Architecture & Folder Structure](file:///c:/Users/acatzk/Videos/Personal%20Projects/lumpia-boss-backend/docs/architecture/honc-stack-structure.md)**
  - Technology stack layers
  - Root and `src/` directory layouts
  - Neon database branching & client resilience (`createDb`)
  - Environment separation (`develop` vs `production`)
  - Bun script reference guide

### 📏 Standards

- **[Coding Standards & Style Guide](file:///c:/Users/acatzk/Videos/Personal%20Projects/lumpia-boss-backend/docs/standards/coding-standards.md)**
  - TypeScript rules (`type` over `interface`, arrow functions, zero `any`)
  - Strict import ordering rules (ascending line length order)
  - Controller-Route-Service-Utils architectural pattern
  - Centralized HTTP response & error handling reference
  - Prettier and Biome configuration

### 📋 Tasks & Milestones

- **[LBS-05: Setup HONC Project Structure & Coding Standard](file:///c:/Users/acatzk/Videos/Personal%20Projects/lumpia-boss-backend/docs/tasks/LBS-05-setup-honc-project-structure-and-coding-standard.md)**
  - Task objective and foundation deliverables
  - Environment separation configuration
  - Resilient database client and cold-start retries
  - CI/CD workflows and workspace setup
  - Verification results and acceptance status

---

## 🚀 Quick Start Guide

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Files

- Ensure `.dev.vars` contains the Neon `develop` connection string.
- Ensure `.env.development` contains the Neon `develop` connection string for CLI tools.

### 3. Run Database Migrations

```bash
# Push schema to develop database
bun run db:push:dev

# Or to production database
bun run db:push:prod
```

### 4. Start Local Development Server

```bash
bun run dev
```

### 5. Format & Lint

```bash
# Format code
bun run format

# Run linter
bun run lint

# TypeScript typecheck
bun x tsc --noEmit
```
