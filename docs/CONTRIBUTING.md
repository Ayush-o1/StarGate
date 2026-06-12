# Contributing to Stargate

Thank you for your interest in contributing to Stargate! This document provides guidelines to help you get started effectively.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Reporting Issues](#reporting-issues)
- [Areas for Contribution](#areas-for-contribution)

---

## Code of Conduct

This project follows a simple standard: be respectful, constructive, and collaborative. Contributions that are dismissive, hostile, or otherwise unprofessional will not be accepted.

---

## Getting Started

### Prerequisites
- **Node.js** 18+
- **pnpm** 9.0.0+
- **Docker & Docker Compose** (for local infrastructure)

### Local Setup
```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/stargate.git
cd stargate

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your local values (generate strong JWT secrets)

# 4. Start infrastructure
docker compose up postgres redis -d

# 5. Run database migrations
pnpm --filter @stargate/database prisma migrate dev

# 6. Start all services in development mode
pnpm --filter @stargate/api dev     # Terminal 1
pnpm --filter @stargate/worker dev  # Terminal 2
pnpm --filter @stargate/web dev     # Terminal 3
```

### Verify Setup
```bash
curl http://localhost:3000/health
# Should return: {"api":"healthy","database":"healthy","redis":"healthy","worker":"healthy"}
```

---

## Project Structure

```
stargate/
├── apps/
│   ├── api/      # Express.js API Gateway
│   ├── web/      # React 18 Frontend
│   └── worker/   # BullMQ Execution Worker
├── packages/
│   ├── database/ # Prisma schema and migrations
│   ├── shared/   # Shared TypeScript types and Zod schemas
│   └── config/   # Shared ESLint and TypeScript configurations
└── docs/         # All technical documentation
```

Each `apps/*` package is a standalone service. Each `packages/*` is a shared library imported by the apps.

---

## Development Workflow

### Branching Strategy
- `main` — Production-ready code
- `feature/<description>` — New features (e.g., `feature/retry-policies`)
- `fix/<description>` — Bug fixes (e.g., `fix/ssrf-ipv6-blocking`)
- `docs/<description>` — Documentation updates (e.g., `docs/contributing-guide`)

### Making Changes

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes...

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Ensure the build passes
pnpm build
```

### Working with the Database

```bash
# Open Prisma Studio (visual DB browser)
pnpm --filter @stargate/database prisma studio

# Create a new migration after schema changes
pnpm --filter @stargate/database prisma migrate dev --name "describe-your-change"

# Reset the database (destroys all data)
pnpm --filter @stargate/database prisma migrate reset
```

### Shared Package Changes
If you modify `packages/database` or `packages/shared`, rebuild them before running the apps:

```bash
pnpm --filter @stargate/database build
pnpm --filter @stargate/shared build
```

---

## Coding Standards

### TypeScript
- Strict TypeScript is enabled (`strict: true`) — all code must be fully typed
- Avoid `any` unless absolutely necessary; if used, add a comment explaining why
- Use Zod schemas for all request payload validation in the API

### File Naming
- TypeScript files: `camelCase.ts` or `camelCase.tsx` for React components
- Component files: `PascalCase.tsx` (e.g., `WorkflowCard.tsx`)
- Documentation: `UPPER_SNAKE_CASE.md` (e.g., `CONTRIBUTING.md`)

### Code Style
- **Formatting:** Prettier is configured — run `pnpm format` before committing
- **Linting:** ESLint with project-specific rules — run `pnpm lint`
- **Imports:** Group imports: Node built-ins → external packages → internal packages (`@stargate/*`) → relative imports

### API Conventions
- All routes follow REST conventions (`GET`, `POST`, `PUT`, `DELETE`)
- All routes are versioned under `/api/v1/`
- All endpoints require authentication unless explicitly public (e.g., `/auth/*`, `/webhooks/*`)
- Response bodies follow `{ data: ... }` or `{ error: ... }` patterns
- HTTP status codes must be semantically correct (201 for creation, 202 for async dispatch, 403 for auth failures)

### Worker Conventions
- Never add synchronous I/O to the execution processor
- All external calls must have timeout guards via `AbortController`
- All external HTTP calls must go through `validateSSRF()` first
- Errors must be caught per-node and persisted — never let unhandled exceptions crash the worker

---

## Submitting Pull Requests

### Before Submitting
- [ ] Run `pnpm typecheck` — zero TypeScript errors
- [ ] Run `pnpm lint` — zero lint errors
- [ ] Run `pnpm build` — build succeeds for all packages
- [ ] Update relevant documentation in `docs/` if you changed behavior
- [ ] Test your changes manually with `docker compose up -d --build`

### PR Description Template
```markdown
## What this PR does
<!-- Brief description of the change -->

## Why
<!-- Problem being solved or feature being added -->

## Testing
<!-- How you tested this change -->

## Checklist
- [ ] TypeScript passes
- [ ] Linting passes
- [ ] Build succeeds
- [ ] Documentation updated (if applicable)
```

---

## Reporting Issues

When filing a bug report, include:
1. **Environment** — OS, Node.js version, Docker version
2. **Steps to reproduce** — Exact sequence of actions
3. **Expected behavior** — What should have happened
4. **Actual behavior** — What did happen, including any error messages or stack traces
5. **Screenshots** — If the issue is UI-related

---

## Areas for Contribution

The following areas are actively open for contributions:

### High Impact
- **Per-tenant Worker Queues** — Isolate workflow executions per workspace to prevent noisy-neighbor issues
- **Webhook HMAC Verification** — Add signature validation to webhook ingestion endpoints
- **IPv6 SSRF Protection** — Extend the SSRF validator to block IPv6 loopback and private ranges

### Medium Impact
- **Node Plugin Architecture** — Design a dynamic `integrations/` system for community-contributed node types
- **Workflow Versioning** — Immutable graph snapshots to prevent edits to in-flight workflows
- **Data Retention Policies** — Scheduled cleanup job for old execution records

### Developer Experience
- **Execution Streaming** — Replace polling with Server-Sent Events for real-time execution updates
- **Canvas Performance** — Optimize Zustand store subscriptions to reduce re-renders on large graphs
- **API Documentation** — Expand `docs/api.md` with request/response examples for all endpoints

### Documentation
- Tutorials for common workflow patterns
- Video walkthrough of the workflow builder
- Additional interview talking points for engineers using this project

---

## Questions?

If you have questions about the architecture or want to discuss a contribution before starting, open a GitHub Discussion or file an issue with the `question` label.
