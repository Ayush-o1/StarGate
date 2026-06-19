# Architecture — Stargate

This document explains the actual system architecture, module responsibilities, and data flow. All information is derived directly from the source code.

---

## System Overview

Stargate is a **three-process monorepo application** sharing one PostgreSQL database and one Redis instance.

```
┌───────────────────────────────────────────────────────────────────┐
│                      Browser (React SPA)                          │
│  • ReactFlow canvas    • Zustand state stores                     │
│  • Polling (3s) for execution updates                             │
└──────────────────────────────┬────────────────────────────────────┘
                               │ REST / HTTP
┌──────────────────────────────▼────────────────────────────────────┐
│                    API Server (Express)                           │
│  apps/api/src/index.ts — port 3000                                │
│                                                                   │
│  Routes: /auth  /workspaces  /workflows  /nodes  /edges           │
│          /executions  /triggers  /webhooks  /system               │
│                                                                   │
│  On execution request:                                            │
│  1. Validate workflow graph (WorkflowValidator)                   │
│  2. Create WorkflowExecution (status: QUEUED)                     │
│  3. Add job to BullMQ queue → Redis                               │
└──────────┬────────────────────────────────┬───────────────────────┘
           │ SQL (Prisma)                   │ BullMQ enqueue
           │                               ▼
┌──────────▼──────────┐      ┌─────────────────────────┐
│   PostgreSQL DB     │◄─────│   Redis (queue store)   │
│   (10 tables)       │      └─────────────┬───────────┘
└──────────▲──────────┘                    │ BullMQ dequeue
           │ SQL (Prisma)                  │
┌──────────┴──────────────────────────────▼───────────────────────┐
│                    Worker Process (BullMQ)                       │
│  apps/worker/src/worker.ts                                       │
│                                                                  │
│  1. Picks up job from "workflow-execution" queue                 │
│  2. Fetches workflow nodes + edges from DB                       │
│  3. Runs topological sort (Kahn's algorithm)                     │
│  4. For each node in order:                                      │
│     a. Check if it should execute (incoming edge conditions)     │
│     b. Run the node (HTTP call or IF expression eval)            │
│     c. Store output → resolve variables for downstream nodes     │
│     d. Save result to NodeExecution table                        │
│  5. Update WorkflowExecution status (SUCCESS/FAILED)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why Three Separate Processes?

| Process | Responsibility | Why separate? |
|---|---|---|
| **API** | Accept requests, validate, persist, enqueue | Must stay responsive — can't block on slow HTTP calls |
| **Worker** | Execute workflows (outbound HTTP, expression eval) | Runs in background; can be retried automatically via BullMQ |
| **Web** | UI only; talks exclusively to the API | Separate deployment unit; served as static files via nginx |

The API does **not** run workflow logic directly. It queues the job and returns immediately. This keeps the API fast regardless of how long the workflow takes.

---

## Module Breakdown

### API — `apps/api/src/`

#### `index.ts` — Entry Point
- Creates Express app
- Applies global middleware: `helmet`, `cors`, `express.json`, `morgan`
- Mounts all routers at `/api/v1/*`
- Calls `schedulerService.loadSchedules()` on startup to register all active cron triggers

#### `controllers/` — Request Handlers
Each file handles one resource type. Controllers always:
1. Read `req.user.userId` (set by auth middleware)
2. Check workspace membership / role before operating
3. Call `prisma` directly for database operations
4. Call `next(error)` on any thrown error (global handler catches it)

| Controller | Resource | Key operations |
|---|---|---|
| `auth.controller.ts` | Auth | register, login, refresh, logout |
| `workspaces.controller.ts` | Workspace | CRUD; OWNER-only delete/update |
| `workflows.controller.ts` | Workflow | CRUD, export, import (transactional) |
| `nodes.controller.ts` | Node | CRUD, position update |
| `edges.controller.ts` | Edge | CRUD, condition update |
| `users.controller.ts` | User | Get current user |

#### `middleware/`

**`auth.ts`** — JWT verification middleware:
- Extracts `Bearer <token>` from `Authorization` header
- Calls `jwt.verify(token, accessSecret)`
- Attaches `{ userId: string }` to `req.user`
- Returns 401 if token missing, 403 if invalid

**`rateLimiter.ts`** — Auth route protection:
- 20 requests per 15-minute window per IP
- Uses `express-rate-limit`

**`errorHandler.ts`** — Global error handler:
- Final Express middleware (4 arguments)
- Returns structured `{ error: { message } }` JSON

#### `lib/queue.ts`
- Creates a `Queue<ExecuteWorkflowPayload>` named `"workflow-execution"` backed by Redis (ioredis)
- Exported and shared by:
  - `executions.service.ts` (to enqueue jobs)
  - `system.controller.ts` (to query queue metrics)

#### `modules/executions/`

**`executions.service.ts`** — Core `executeWorkflow()` function:
1. Fetches workflow from DB
2. Checks `workflow.isActive` — throws if false
3. Calls `WorkflowValidator.validate()` — fails fast before touching the queue
4. Creates `WorkflowExecution` record (status: `QUEUED`)
5. Enqueues BullMQ job with `attempts: 3`, exponential backoff delay starting at 2000ms, `jobId = execution.id`
6. Returns execution ID

**`executions.controller.ts`** — HTTP handlers: run, list, get, get-node-executions

**`executions.routes.ts`** — Two separate Express routers:
- `workflowExecutionRouter` (mergeParams: true) — mounted at `/api/v1/workflows/:id` for run + list
- `executionDetailRouter` — mounted at `/api/v1/executions` for detail + node results

#### `modules/workflows/workflow.validator.ts`

Validates before enqueueing. Checks:
1. **No cycles** — topological sort; if `sorted.length !== nodes.length`, there's a cycle
2. **Edge validity** — both source and target node IDs must exist in the workflow
3. **Variable reference validity** — `{{nodeId.field}}` patterns: `nodeId` must exist and be topologically upstream of the referencing node
4. **HTTP node** — must have a non-empty `config.url`
5. **IF node** — must have a non-empty `config.expression`; jexl syntax-checks it with `jexl.createExpression()`
6. **Edge conditions** — same jexl syntax check

#### `modules/triggers/`

**`scheduler.service.ts`** — In-process cron scheduler:
- `loadSchedules()` — queries all enabled SCHEDULE triggers on startup, registers cron tasks
- `scheduleTrigger()` — validates cron expression, registers a `node-cron` task
- `addOrUpdateSchedule()` — called when a trigger is created or enabled/disabled
- `unscheduleTrigger()` — stops the cron task for a specific trigger

**`webhooks.routes.ts`** — Public endpoint `POST /api/v1/webhooks/:token`:
- No auth required
- Looks up trigger by `webhookPath = token`
- Checks `trigger.enabled` and `trigger.workflow.isActive`
- Creates a `TriggerExecution` record
- Calls `executeWorkflow()`

**`triggers.controller.ts`** — CRUD + enable/disable; integrates with `schedulerService`

---

### Worker — `apps/worker/src/`

#### `worker.ts` — BullMQ Worker
- Connects to Redis at `REDIS_HOST:REDIS_PORT`
- Registers a job handler on the `"workflow-execution"` queue
- Job handler:
  1. Updates `WorkflowExecution.status = RUNNING`
  2. Fetches workflow with nodes + edges
  3. Wraps `runWorkflowNodes()` in `Promise.race()` against a 5-minute timeout
  4. On success: updates `TriggerExecution.status = SUCCESS` (if trigger-initiated)
  5. On error: updates `TriggerExecution.status = FAILED`, rethrows so BullMQ marks job failed and retries

#### `execution.processor.ts` — Core Execution Logic

**Step 1 — Build graph:**
```
inDegree[nodeId] = number of incoming edges
adj[nodeId]      = list of outgoing edges
```

**Step 2 — Kahn's Topological Sort:**
```
queue = [all nodes with inDegree = 0]
while queue not empty:
  u = dequeue
  sorted.push(u)
  for each edge (u → v):
    inDegree[v] -= 1
    if inDegree[v] == 0: enqueue v

if sorted.length != nodes.length → cycle → throw error
```

**Step 3 — Execute in order:**

For each node in `sorted`:
- Compute `shouldExecute`:
  - `true` if no incoming edges (root node)
  - `true` if ANY incoming edge has `edgeState[edgeId] = true`
  - `false` otherwise → mark SKIPPED, set all outgoing edgeStates = false, continue
- If should execute:
  - **IF node**: `jexl.eval(config.expression, context)` → `{ result: boolean }`
  - **HTTP node**:
    - `VariableResolver.resolveObject(config, executionContext)` — fills in `{{...}}`
    - `validateSSRF(url)` — blocks private IPs
    - `fetch()` with `AbortController` timeout
    - Parse response (JSON if possible, else text)
    - Throw on non-2xx status
  - Store `output` in `executionContext[nodeId]`
  - Evaluate each outgoing edge's `condition` with jexl
  - Set `edgeState[edgeId] = true/false`
  - Save `NodeExecution` (status, output, durationMs)

**Context objects:**
- `context.response` / `context.previousNode` = last executed node's output (used in jexl expressions like `response.status === 200`)
- `executionContext[nodeId]` = keyed store of all outputs (used in `{{nodeId.field}}` resolution)

#### `utils/resolver.ts` — Variable Resolver

```typescript
// Regex: matches {{word.path.here}}
template.replace(/\{\{([\w$.-]+)\}\}/g, (_, path) =>
  get(executionContext, path.trim()) ?? ''
)
```

`get` is lodash's safe deep property access. If the path doesn't exist, returns `''` (not `"undefined"`).

#### `utils/ssrf.ts` — SSRF Guard

Before every outbound HTTP call:
1. Parse URL — throw if malformed
2. Block known hostnames: `localhost`, `internal`, `host.docker.internal`
3. If hostname is raw IPv4 → CIDR check directly
4. If hostname is a domain → DNS resolve → CIDR check each resolved IP

Blocked CIDR ranges:
| Range | Description |
|---|---|
| `127.0.0.0/8` | Loopback |
| `10.0.0.0/8` | Private (Class A) |
| `172.16.0.0/12` | Private (Class B) — note: only 172.16–172.31, not all 172.* |
| `192.168.0.0/16` | Private (Class C) |
| `169.254.0.0/16` | Link-local (AWS metadata, etc.) |
| `0.0.0.0/8` | "This" network |
| `100.64.0.0/10` | Shared address space (RFC 6598) |

---

### Web — `apps/web/src/`

#### `App.tsx` — Router + Shell
- React Router v7
- Unprotected: `/login`, `/register`
- Protected (via `<ProtectedRoute />`): `/`, `/dashboard`, `/workflows/:id`
- Global keyboard shortcut (⌘K / Ctrl+K) opens command palette
- Global `<Toaster />` for notifications

#### Pages

**`Dashboard.tsx`** — Main page after login:
- Workspace switcher + workspace CRUD
- Workflow card grid for active workspace
- KPI strip: execution counts, success rate
- System metrics panel
- Activity feed (recent executions)
- Import workflow (file upload)

**`WorkflowDetail.tsx`** — Canvas page:
- ReactFlow canvas fills the screen
- Toolbar: breadcrumb, active toggle, Add Node dropdown, Export, Run
- Bottom resizable panel: executions list + triggers list
- Execution click → `ExecutionDetailModal` (per-node output)
- Node click → `NodeConfigModal` (HTTP config or IF expression)
- Edge click → `EdgeConfigModal` (condition expression)
- `setInterval(fetchExecutions, 3000)` for live status updates

#### Zustand Stores

| Store | State held | Key actions |
|---|---|---|
| `authStore` | `user`, `tokens` | `setAuth`, `clearAuth` — stores refreshToken in localStorage |
| `workspaceStore` | `workspaces[]`, `activeWorkspaceId` | `fetchWorkspaces`, `createWorkspace` — persists activeWorkspaceId to localStorage |
| `workflowStore` | `workflows[]`, `nodes[]`, `edges[]` | `fetchWorkflowGraph`, `updateNodePosition` |
| `workflowExecutionStore` | `executions[]`, `loading` | `fetchExecutions`, `runWorkflow` |
| `triggerStore` | `triggers[]` | `fetchTriggers`, `createTrigger`, `toggleTrigger`, `deleteTrigger` |

#### `lib/api.ts` — API Client

`apiFetch(endpoint, options)` wraps `fetch`:
1. Reads access token from Zustand `authStore`
2. Sets `Authorization: Bearer <token>` header
3. On 401/403: reads refresh token from `localStorage`, calls `/auth/refresh`, updates store, retries original request once
4. Throws on non-OK responses with parsed error message

---

### Shared Packages

#### `packages/database`
- Single `schema.prisma` — source of truth for the DB
- Exports a singleton `PrismaClient` instance imported by both API and Worker as `@stargate/database`

#### `packages/shared`
- TypeScript interfaces and Zod schemas used across API and Web
- Zod schemas: `RegisterSchema`, `LoginSchema`, `CreateWorkspaceSchema`, `CreateWorkflowSchema`, `CreateNodeSchema`, `CreateEdgeSchema`, `CreateTriggerSchema`
- Response interfaces: `UserProfile`, `WorkflowProfile`, `NodeProfile`, `EdgeProfile`, `WorkflowExecutionProfile`, `NodeExecutionProfile`, `WorkflowTriggerProfile`
- Queue payload: `ExecuteWorkflowPayload` (shared between API queue producer and worker consumer)

#### `packages/config`
- Shared ESLint preset and base tsconfig
- All apps extend from here

---

## Data Flow — Full Execution Trace

```
1. User opens WorkflowDetail (/workflows/:id)
   └── fetchWorkflowGraph() → GET /nodes/workflow/:id + GET /edges/workflow/:id
   └── fetchExecutions() → GET /workflows/:id/executions
   └── polling interval starts (every 3000ms)

2. User adds HTTP node → POST /nodes/workflow/:id → DB insert
   └── fetchWorkflowGraph() re-syncs canvas

3. User drags node → onNodeDragStop
   └── PUT /nodes/:id/position { positionX, positionY }

4. User connects two nodes → onConnect (ReactFlow)
   └── POST /edges/workflow/:id { sourceNodeId, targetNodeId }
   └── fetchWorkflowGraph() re-syncs

5. User clicks Run → POST /workflows/:id/run
   └── WorkflowValidator.validate() — checks graph
   └── WorkflowExecution created (QUEUED)
   └── BullMQ job added to Redis queue
   └── API returns { executionId, status: "QUEUED" }

6. Worker picks up job (BullMQ)
   └── WorkflowExecution.status = RUNNING
   └── Fetch nodes + edges from DB
   └── Topological sort
   └── For each node:
       └── Create NodeExecution (PENDING)
       └── Determine shouldExecute (edge conditions)
       └── Execute node (SSRF check → fetch → parse response)
       └── Update NodeExecution (SUCCESS/FAILED/SKIPPED + output)
   └── Update WorkflowExecution (SUCCESS/FAILED)

7. Frontend poll fires (3s)
   └── GET /workflows/:id/executions → status now SUCCESS
   └── User clicks execution → GET /executions/:id/nodes
   └── Per-node outputs displayed in modal
```

---

## Monorepo Build — Turborepo

`turbo.json` pipeline:
- `build` — depends on `^build` (dependencies built first)
- `dev` — runs all apps in parallel with watch mode
- `lint`, `typecheck` — run in parallel across all packages

pnpm workspaces: packages referenced as `workspace:*` dependencies so they resolve locally without npm publishing.

---

## Docker Compose Services

| Service | Image | Ports | Notes |
|---|---|---|---|
| `postgres` | postgres:15-alpine | 5433 (host) → 5432 | Has health check |
| `redis` | redis:alpine | 6379 | Default, no auth |
| `api` | Custom Dockerfile | 3000 | Depends on postgres + redis |
| `worker` | Custom Dockerfile | — | No exposed port |
| `web` | Custom Dockerfile | 5173 (host) → 80 | nginx serves built SPA |

API and Worker build from the monorepo root context so Turborepo can resolve workspace packages during Docker build.
