# Stargate Feature Documentation

This document catalogs every major feature implemented in Stargate, spanning from initial setup through Phase 12 production hardening.

---

## 1. Authentication & Users
**Purpose:** Secure entry point into the application.
**Components involved:** `apps/api` (Auth Controller), `apps/web` (Auth Store, Login/Register pages).
**API Endpoints:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
**Database entities:** `User`, `RefreshToken`
**Execution Flow:** Passwords are mathematically hashed with bcrypt. JWTs are distributed for short-term access, while refresh tokens are persisted in PostgreSQL. UI states are managed via Zustand `authStore`.

---

## 2. Workspaces & RBAC
**Purpose:** Logical isolation of workflows allowing teams to collaborate securely.
**Components involved:** `WorkspaceController`, `WorkspaceRouter`, Frontend `WorkspaceSwitcher`.
**API Endpoints:**
- `POST /api/v1/workspaces`
- `GET /api/v1/workspaces`
- `GET /api/v1/workspaces/:id`
- `PUT /api/v1/workspaces/:id`
- `DELETE /api/v1/workspaces/:id`
**Database entities:** `Workspace`, `WorkspaceMember`
**Execution Flow:** Upon creation, the creator is assigned the `OWNER` role. Workflows subsequently created are tightly bound to a specific `workspaceId`. API endpoints validate the `req.user.id` against the `WorkspaceMember` mapping.

---

## 3. Workflow CRUD & State Management
**Purpose:** Create, configure, and persist pipeline blueprints.
**Components involved:** `WorkflowsController`, Database Prisma Models.
**API Endpoints:**
- `POST /api/v1/workflows/workspace/:workspaceId`
- `GET /api/v1/workflows/workspace/:workspaceId`
- `GET /api/v1/workflows/:id`
- `PUT /api/v1/workflows/:id`
- `DELETE /api/v1/workflows/:id`
**Database entities:** `Workflow`
**Execution Flow:** Workflows contain boolean states for `isActive`. They serve as the parent entity for Nodes, Edges, and Triggers.

---

## 4. Visual Workflow Builder
**Purpose:** Interactive React Flow canvas allowing users to construct logic visually.
**Components involved:** `apps/web` (`WorkflowDetail`, `Canvas`, `Custom Nodes`).
**API Endpoints:**
- `GET /api/v1/workflows/:id/graph`
- `POST /api/v1/nodes/workflow/:workflowId`
- `PUT /api/v1/nodes/:id/position`
- `DELETE /api/v1/nodes/:id`
- `POST /api/v1/edges/workflow/:workflowId`
- `DELETE /api/v1/edges/:id`
**Database entities:** `Node`, `Edge`
**Execution Flow:** The frontend leverages `reactflow` to manage X/Y coordinate state. Node creation and edge connections are debounced and persisted via REST to the API.

---

## 5. Automated Triggers
**Purpose:** Instantiate executions based on user intent, HTTP callbacks, or temporal schedules.
**Components involved:** `TriggersController`, Frontend trigger modals.
**API Endpoints:**
- `POST /api/v1/triggers/workflow/:workflowId`
- `GET /api/v1/triggers/workflow/:workflowId`
- `PUT /api/v1/triggers/:id`
- `DELETE /api/v1/triggers/:id`
**Database entities:** `WorkflowTrigger`, `TriggerExecution`
**Execution Flow:** Triggers dictate *how* a workflow starts. A Manual trigger generates an instant execution payload. Webhooks expose a public URL endpoint. Scheduled triggers leverage chronometer queues.

---

## 6. Asynchronous Execution Engine
**Purpose:** Offload processing logic to a dedicated microservice avoiding API bottlenecking.
**Components involved:** `apps/worker` (`BullMQ`, Redis), `apps/api` (`ExecutionsService`).
**API Endpoints:**
- `POST /api/v1/executions/workflow/:workflowId`
- `GET /api/v1/executions/workflow/:workflowId`
**Database entities:** `WorkflowExecution`, `NodeExecution`
**Execution Flow:** The API enqueues a Job to a Redis list. The `stargate-worker-1` container consumes the job, evaluates the DAG, and executes the nodes consecutively, marking status as `QUEUED` -> `RUNNING` -> `SUCCESS` or `FAILED`.

---

## 7. HTTP Execution Node
**Purpose:** Perform real outbound network requests natively in the worker.
**Components involved:** `apps/worker` (`NodeExecutor`).
**Database entities:** `Node.config` (JSON)
**Execution Flow:** The worker fetches the `Node` configuration containing `url`, `method`, `headers`, and `body`. It triggers an isolated `fetch()` promise with configurable timeouts and strict SSRF validations. Output is written to `NodeExecution.output`.

---

## 8. Conditional Branching (IF Node)
**Purpose:** Route execution dynamically based on upstream evaluations.
**Components involved:** `apps/worker` (`execution.processor.ts`).
**Execution Flow:** Edges contain a `condition` string (e.g., `TRUE` or `FALSE`). An `IF` node evaluates a JavaScript-like expression (using `jexl`). Based on the boolean resolution, the worker traces matching edges and skips non-matching branches, writing `SKIPPED` status for orphaned nodes.

---

## 9. Variable Resolution Engine
**Purpose:** Pass execution context outputs to downstream configurations natively.
**Components involved:** `apps/worker` (`VariableResolver`).
**Execution Flow:** Utilizing a double-curly-brace syntax `{{nodeId.body.data}}`, downstream nodes can template their config (e.g., URL parameters, body payloads). Before node execution, the worker parses the `ExecutionContext` history map and recursively interpolates the tokens.

---

## 10. Observability & Monitoring
**Purpose:** Provide full transparency into execution health and performance.
**Components involved:** `Dashboard` metrics, System Health API, Execution History Timeline.
**API Endpoints:**
- `GET /api/v1/metrics/workspace/:workspaceId`
- `GET /api/v1/health`
**Execution Flow:** Nodes log their `startedAt` and `completedAt` timestamps generating `durationMs`. System Health endpoints evaluate the DB, Redis, Worker, and API availability simultaneously. The UI highlights executions exceeding bounds with a `SLOW` badge.

---

## 11. Workflow Export / Import
**Purpose:** Transport workflow logic across workspaces or environments.
**Components involved:** `WorkflowsController`.
**API Endpoints:**
- `GET /api/v1/workflows/:id/export`
- `POST /api/v1/workflows/workspace/:workspaceId/import`
**Execution Flow:** Workflows are serialized alongside their nested nodes and edges. The Import controller maps previous UUIDs to freshly generated UUIDs via an internal `Map`, recreating the topology safely within the new workspace constraints.

---

## 12. Security & Hardening
**Purpose:** Protect Stargate from malicious inputs and internal network scanning.
**Components involved:** `SSRF Validator`, `WorkflowValidator`, `Express Size Limits`.
**Execution Flow:**
- Workflows are validated for cycles via topological sorting prior to job creation.
- HTTP nodes resolving to `localhost` or local IPs (127.0.0.x, 10.x.x.x, 192.168.x.x) are immediately rejected by the worker.
- Express middlewares enforce a strict 1MB JSON payload boundary.
- The worker enforces a global 5-minute timeout per workflow to prevent thread-locking.
