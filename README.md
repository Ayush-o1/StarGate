# Stargate — Visual Workflow Automation Platform

A full-stack, monorepo web application that lets users build and run **visual HTTP-based automation workflows** using a drag-and-drop canvas. Workflows execute asynchronously via a background worker queue, support conditional branching, data passing between steps, webhook triggers, cron scheduling, and per-node execution tracking.

---

## Quick Overview

| Area | What was built |
|---|---|
| **Backend** | REST API with Express + TypeScript |
| **Worker** | Async job processor with BullMQ + Redis |
| **Frontend** | React + Vite SPA with a drag-and-drop canvas (ReactFlow) |
| **Database** | PostgreSQL with Prisma ORM |
| **Auth** | JWT access + refresh token rotation |
| **Execution** | DAG-based topological node execution with conditional branching |
| **Triggers** | Manual, Webhook (HTTP endpoint), Schedule (cron) |
| **Security** | SSRF protection, rate limiting, Helmet headers |
| **Monorepo** | Turborepo + pnpm workspaces |

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Why This Project](#why-this-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Folder Structure](#folder-structure)
- [Environment Variables](#environment-variables)
- [Setup and Local Development](#setup-and-local-development)
- [Running with Docker](#running-with-docker)
- [API Reference Summary](#api-reference-summary)
- [How It Works — Key Flows](#how-it-works--key-flows)
- [Known Limitations](#known-limitations)
- [Future Scope](#future-scope)

---

## Problem Statement

Connecting multiple web services together requires writing custom glue code for every integration. For example: "After an HTTP API call succeeds, call another API with the response data, but only if a certain condition is true."

Stargate lets you model these steps visually as a graph of nodes and edges, then executes them in the correct dependency order without you having to write the orchestration code yourself.

---

---

## Key Features

### Visual Workflow Builder
- Drag-and-drop canvas built with ReactFlow
- Two node types: **HTTP Request** and **IF Condition**
- Click edges to configure conditions
- Node positions persist to the database on drag stop

### Execution Engine
- Workflows execute as background jobs via BullMQ + Redis
- Nodes run in topological sort order (respects dependencies)
- IF nodes branch execution; downstream nodes on the false branch are skipped
- Each node's input, output, error, and duration are saved to the database
- Execution timeout: 5 minutes per workflow run
- Automatic retry: 3 attempts with exponential backoff on failure

### Variable Passing Between Nodes
- Reference a previous node's output using `{{nodeId.field}}` syntax
- Example: URL `https://api.example.com/users/{{step1.body.userId}}`
- Resolved using lodash `get()` at runtime

### Trigger System
- **Manual**: Click "Run" in the UI
- **Webhook**: Auto-generated URL path; send a POST request to trigger the workflow
- **Schedule**: Cron expression (e.g., `*/5 * * * *`); schedules load on API startup

### Authentication
- Email + password registration with bcrypt hashing
- JWT access token (15 min) + refresh token (7 days)
- Refresh token stored hashed in the database; rotated on each refresh
- Silent token refresh in the frontend API client

### Workspace & RBAC
- Users belong to workspaces as `OWNER` or `MEMBER`
- Only `OWNER` can delete a workspace or workflow
- All workflow/node/edge operations check workspace membership

### Observability
- `/api/v1/system/health` — checks API, worker, Redis, and database status
- `/api/v1/system/metrics` — execution stats, queue depths, per-node-type breakdown, error categorization

### Workflow Import / Export
- Export any workflow to JSON (includes nodes, edges, triggers)
- Import into any workspace; IDs are remapped so no conflicts occur
- Done atomically inside a Prisma database transaction

### Security
- **SSRF protection**: Before making any outbound HTTP call, the worker resolves the target hostname via DNS and checks against private IP CIDR ranges (RFC 1918, loopback, link-local)
- **Rate limiting**: Auth routes limited to 20 requests per 15-minute window
- **Helmet**: Sets standard HTTP security headers

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Node.js 18+ | LTS, native `fetch` API |
| Language | TypeScript | Type safety across all apps |
| API Framework | Express 4 | Minimal, well-understood |
| Database | PostgreSQL 15 | Relational, supports JSON columns |
| ORM | Prisma | Type-safe queries, schema-as-code |
| Queue | BullMQ | Redis-backed job queue with retries |
| Redis | ioredis | BullMQ connection |
| Auth | jsonwebtoken + bcrypt | Industry standard JWT flow |
| Validation | Zod | Runtime schema validation |
| Scheduling | node-cron | In-process cron job scheduler |
| Expression eval | jexl | Safe expression evaluation for IF nodes and edge conditions |
| Frontend | React 18 + Vite | Fast SPA with HMR |
| State | Zustand | Lightweight client state |
| Canvas | ReactFlow | DAG visualization and interaction |
| Styling | Tailwind CSS | Utility-first styling |
| Monorepo | Turborepo + pnpm | Shared packages, parallel builds |
| Containers | Docker + Docker Compose | Local dev environment |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│         React + Vite SPA  (apps/web)                        │
│  Zustand stores ──► apiFetch ──► REST API                   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────────┐
│                  Express API  (apps/api)                    │
│  Auth ─ Workspaces ─ Workflows ─ Nodes ─ Edges              │
│  Triggers ─ Executions ─ System ─ Webhooks                  │
│                         │                                   │
│          Enqueues job ──►  BullMQ Queue (Redis)             │
└────────────────────────┬────────────────────────────────────┘
                         │
           ┌─────────────▼──────────────┐
           │   Worker  (apps/worker)    │
           │  Picks up job from queue   │
           │  Runs topological sort     │
           │  Executes nodes in order   │
           │  Saves results to DB       │
           └─────────────┬──────────────┘
                         │
           ┌─────────────▼──────────────┐
           │     PostgreSQL Database    │
           │   (packages/database)      │
           └────────────────────────────┘
```

**Three separate processes** talk to one shared database and one Redis instance:

1. **API** — handles all HTTP requests, validates input, writes execution records, enqueues jobs
2. **Worker** — reads jobs from Redis queue, performs the actual node execution, updates execution status
3. **Web** — React SPA, talks only to the API

---

## Folder Structure

```
stargate/
├── apps/
│   ├── api/                    # Express REST API
│   │   └── src/
│   │       ├── index.ts        # Entry point, mounts all routers, starts scheduler
│   │       ├── controllers/    # Route handler functions
│   │       │   ├── auth.controller.ts
│   │       │   ├── workspaces.controller.ts
│   │       │   ├── workflows.controller.ts
│   │       │   ├── nodes.controller.ts
│   │       │   ├── edges.controller.ts
│   │       │   └── users.controller.ts
│   │       ├── routes/         # Router definitions (wires URLs → controllers)
│   │       ├── middleware/
│   │       │   ├── auth.ts         # JWT verification middleware
│   │       │   ├── rateLimiter.ts  # express-rate-limit setup
│   │       │   └── errorHandler.ts # Global error handler
│   │       ├── lib/
│   │       │   └── queue.ts        # BullMQ Queue instance + Redis connection
│   │       └── modules/
│   │           ├── executions/     # Run workflow, list executions, node details
│   │           ├── triggers/       # Webhook routes, cron scheduler, trigger CRUD
│   │           ├── workflows/      # Workflow validator (DAG + config checks)
│   │           └── system/         # Health check + metrics endpoints
│   │
│   ├── worker/                 # BullMQ background worker
│   │   └── src/
│   │       ├── index.ts            # Entry point
│   │       ├── worker.ts           # BullMQ Worker setup, job lifecycle
│   │       ├── execution.processor.ts  # Core: topological sort + node runner
│   │       └── utils/
│   │           ├── resolver.ts     # {{variable}} template resolver
│   │           └── ssrf.ts         # SSRF IP/CIDR block guard
│   │
│   └── web/                    # React frontend
│       └── src/
│           ├── main.tsx            # React entry point
│           ├── App.tsx             # Router + command palette + toaster
│           ├── pages/
│           │   ├── Login.tsx
│           │   ├── Register.tsx
│           │   ├── Dashboard.tsx   # Workspace + workflow list
│           │   └── WorkflowDetail.tsx  # Canvas + executions + triggers panel
│           ├── components/         # Reusable UI components
│           ├── store/              # Zustand stores (auth, workspace, workflow, etc.)
│           └── lib/
│               └── api.ts          # Fetch wrapper with JWT + auto-refresh
│
├── packages/
│   ├── database/               # Shared Prisma client + schema
│   │   └── prisma/
│   │       └── schema.prisma   # Single source of truth for the DB schema
│   ├── shared/                 # Shared TypeScript types + Zod schemas
│   │   └── src/index.ts        # DTOs, response interfaces, payload types
│   └── config/                 # Shared ESLint + tsconfig
│
├── docker-compose.yml          # Local dev: postgres, redis, api, worker, web
├── .env.example                # Environment variable template
├── turbo.json                  # Turborepo pipeline config
└── pnpm-workspace.yaml         # Workspace package list
```

---

## Environment Variables

Copy `.env.example` to `.env` before starting:

```env
# API
PORT=3000
NODE_ENV=development

# PostgreSQL
DATABASE_URL="postgresql://stargate:password@localhost:5433/stargate_dev?schema=public"

# Frontend base URL (used by Vite)
VITE_API_URL=http://localhost:3000

# JWT secrets (use long random strings in production)
JWT_ACCESS_SECRET="your-secret-here"
JWT_REFRESH_SECRET="your-other-secret-here"

# Redis (defaults work for docker-compose)
REDIS_HOST=localhost
REDIS_PORT=6379

# Worker SSRF bypass (development only, never production)
ALLOW_LOCAL_REQUESTS=false
```

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | API, Worker | Prisma database connection |
| `JWT_ACCESS_SECRET` | API | Signs 15-minute access tokens |
| `JWT_REFRESH_SECRET` | API | Signs 7-day refresh tokens |
| `REDIS_HOST` / `REDIS_PORT` | API, Worker | BullMQ queue connection |
| `VITE_API_URL` | Web | Points frontend to the API |
| `ALLOW_LOCAL_REQUESTS` | Worker | Disables SSRF guard for local testing |

---

## Setup and Local Development

### Prerequisites

- Node.js 18+
- pnpm 9+ (`npm install -g pnpm`)
- Docker and Docker Compose

### Step 1 — Install dependencies

```bash
pnpm install
```

### Step 2 — Start infrastructure (Postgres + Redis)

```bash
docker compose up postgres redis -d
```

### Step 3 — Set up environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local docker-compose)
```

### Step 4 — Run database migrations

```bash
cd packages/database
pnpm exec prisma migrate dev
```

### Step 5 — Start all apps in development mode

```bash
# From repo root — Turborepo starts api, worker, and web in parallel
pnpm dev
```

Individual apps:
```bash
# API only
cd apps/api && pnpm dev

# Worker only
cd apps/worker && pnpm dev

# Web only
cd apps/web && pnpm dev
```

**Default ports:**
- API: `http://localhost:3000`
- Web: `http://localhost:5173`
- Postgres: `localhost:5433`
- Redis: `localhost:6379`

---

## Running with Docker

Runs all five services (postgres, redis, api, worker, web) together:

```bash
# Build and start everything
docker compose up --build

# Verify all containers are up
docker compose ps

# Check the health endpoint
curl http://localhost:3000/health
```

Expected healthy response:
```json
{"api":"healthy","worker":"healthy","redis":"healthy","database":"healthy"}
```

Web UI is at `http://localhost:5173`.

---

## API Reference Summary

All API routes are prefixed with `/api/v1`. Protected routes require `Authorization: Bearer <accessToken>`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account, returns tokens |
| POST | `/auth/login` | No | Login, returns tokens |
| POST | `/auth/refresh` | No | Exchange refresh token for new tokens |
| POST | `/auth/logout` | No | Revoke refresh token |

### Workspaces

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/workspaces` | Yes | List workspaces for current user |
| POST | `/workspaces` | Yes | Create workspace (creator becomes OWNER) |
| GET | `/workspaces/:id` | Yes | Get single workspace |
| PUT | `/workspaces/:id` | Yes (OWNER) | Update workspace |
| DELETE | `/workspaces/:id` | Yes (OWNER) | Delete workspace |

### Workflows

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/workflows/workspace/:workspaceId` | Yes | List workflows in workspace |
| POST | `/workflows/workspace/:workspaceId` | Yes | Create workflow |
| GET | `/workflows/:id` | Yes | Get workflow with nodes and edges |
| PUT | `/workflows/:id` | Yes | Update workflow (name, status, isActive) |
| DELETE | `/workflows/:id` | Yes (OWNER) | Delete workflow |
| GET | `/workflows/:id/graph` | Yes | Get nodes and edges separately |
| GET | `/workflows/:id/export` | Yes | Export full workflow as JSON |
| POST | `/workflows/workspace/:workspaceId/import` | Yes | Import workflow JSON |

### Nodes

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/nodes/workflow/:workflowId` | Yes | Create node |
| GET | `/nodes/workflow/:workflowId` | Yes | List nodes |
| PUT | `/nodes/:id` | Yes | Update node config |
| PUT | `/nodes/:id/position` | Yes | Update node position (drag) |
| DELETE | `/nodes/:id` | Yes | Delete node |

### Edges

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/edges/workflow/:workflowId` | Yes | Create edge (connect two nodes) |
| GET | `/edges/workflow/:workflowId` | Yes | List edges |
| PATCH | `/edges/:id` | Yes | Update edge condition |
| DELETE | `/edges/:id` | Yes | Delete edge |

### Executions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/workflows/:id/run` | Yes | Manually trigger execution |
| GET | `/workflows/:id/executions` | Yes | List executions for workflow |
| GET | `/executions/:id` | Yes | Get execution details |
| GET | `/executions/:id/nodes` | Yes | Get per-node execution results |

### Triggers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/workflows/:workflowId/triggers` | Yes | Create trigger (MANUAL/WEBHOOK/SCHEDULE) |
| GET | `/workflows/:workflowId/triggers` | Yes | List triggers |
| DELETE | `/triggers/:id` | Yes | Delete trigger |
| POST | `/triggers/:id/enable` | Yes | Enable trigger |
| POST | `/triggers/:id/disable` | Yes | Disable trigger |
| POST | `/webhooks/:token` | No | Public webhook endpoint (fires a workflow) |

### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Service health check |
| GET | `/api/v1/system/health` | No | Same, from system module |
| GET | `/api/v1/system/metrics` | No | Execution stats + queue metrics |

---

## How It Works — Key Flows

### 1. Workflow Execution Flow

```
User clicks "Run"
  → POST /api/v1/workflows/:id/run
  → API validates workflow (cycle check, node config, expression syntax)
  → API creates WorkflowExecution record (status: QUEUED)
  → API enqueues job to BullMQ (Redis queue named "workflow-execution")
  → Worker picks up job
  → Worker sets status: RUNNING
  → Worker fetches nodes + edges from DB
  → Worker runs topological sort (Kahn's algorithm)
  → For each node in order:
      - Create NodeExecution (PENDING)
      - Check if any incoming edge passed (edge condition evaluation)
      - If no incoming edges pass → mark SKIPPED
      - If should execute → run node
      - Update NodeExecution (SUCCESS / FAILED)
      - Evaluate outgoing edge conditions
  → Update WorkflowExecution (SUCCESS / FAILED)
```

### 2. Authentication Flow

```
Register / Login
  → Password hashed with bcrypt (salt rounds: 10)
  → Access token signed (15 min expiry)
  → Refresh token signed (7 day expiry)
  → Refresh token stored hashed in DB (RefreshToken table)
  → Both tokens returned to client

Token Refresh (automatic in frontend)
  → apiFetch gets 401/403
  → Reads refreshToken from localStorage
  → POST /auth/refresh with refreshToken
  → API verifies JWT signature
  → API bcrypt-compares token against stored hashes
  → Old token revoked, new tokens issued (rotation)
  → Original request retried with new access token

Logout
  → POST /auth/logout with refreshToken
  → Token found and marked revoked: true in DB
```

### 3. Webhook Trigger Flow

```
External system POSTs to /api/v1/webhooks/:token
  → API looks up WorkflowTrigger by webhookPath = token
  → Checks trigger.enabled and workflow.isActive
  → Creates TriggerExecution record
  → Calls executeWorkflow() → enqueues job
  → Returns { success: true }
```

### 4. Variable Resolution

Each node's output is stored in an `executionContext` map keyed by `nodeId`. When a downstream node runs, its config is processed through `VariableResolver.resolveObject()` which replaces `{{nodeId.path.to.value}}` using lodash `get()`.

Example:
- Node A (`abc123`) fetches `https://api.com/user/1` and gets `{ body: { id: 42 } }`
- Node B config URL: `https://api.com/posts/{{abc123.body.id}}`
- Resolved at runtime to: `https://api.com/posts/42`

---

## Known Limitations

- **No real-time push**: The frontend polls executions every 3 seconds. There is no WebSocket or SSE connection.
- **Single-instance scheduler**: The `node-cron` scheduler runs in-process inside the API. If multiple API instances run, the cron would fire multiple times. This is a known limitation for a development-scale project.
- **No authentication on webhook payloads**: The webhook URL token is a secret path, not a cryptographic signature. Webhook payload content is not validated.
- **Variable references are string-only**: `{{node.field}}` resolves to a string. Complex nested object injection into JSON bodies relies on the node config being set up correctly.
- **No pagination**: Execution and workflow list endpoints return all records.
- **SSRF guard fails open on DNS error**: If DNS resolution fails, the request is allowed through rather than blocked. This is intentional to avoid breaking legitimate requests on transient DNS failures.
- **No user-level isolation beyond workspace membership**: Any workspace member can run, view, or modify all workflows in that workspace regardless of who created them.

---

## Future Scope

- WebSocket / SSE for live execution status updates (replace polling)
- More node types: email (SMTP), database query, delay/wait, webhook outbound
- Workflow versioning: save a snapshot before each edit
- Pagination on all list endpoints
- Persistent cron scheduler (store cron state in Redis or DB instead of in-process)
- Role granularity: `VIEWER`, `EDITOR`, `ADMIN` roles beyond `OWNER`/`MEMBER`
- Workflow templates: pre-built starting points
- Audit log: track who ran what and when

---

## Detailed Documentation

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, module breakdown |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Full API endpoint documentation |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema explanation, table relationships, ER overview |
| [docs/SETUP.md](docs/SETUP.md) | Detailed setup, troubleshooting, Docker guide |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Contribution guide, coding standards, PR process |

---

## License

MIT — see [LICENSE](LICENSE).
