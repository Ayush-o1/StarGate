# Database — Stargate

This document explains the PostgreSQL schema, the purpose of each table, the relationships between them, and the rationale behind key design decisions.

All schema information comes directly from `packages/database/prisma/schema.prisma`.

---

## Schema Overview

The database has **10 tables** organized into three conceptual areas:

```
Identity & Access          Workflow Graph             Execution & Triggers
─────────────────          ──────────────             ────────────────────
User                       Workflow                   WorkflowExecution
RefreshToken               Node                       NodeExecution
Workspace                  Edge                       WorkflowTrigger
WorkspaceMember                                       TriggerExecution
```

---

## Table Reference

### `User`

Stores registered accounts.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Auto-generated |
| `email` | String (unique) | Login identifier |
| `passwordHash` | String | bcrypt hash, salt rounds = 10 |
| `name` | String? | Optional display name |
| `createdAt` | DateTime | Auto set on insert |
| `updatedAt` | DateTime | Auto updated on change |

Relations:
- One user → many `WorkspaceMember` rows (their memberships)
- One user → many `Workspace` rows (workspaces they created)
- One user → many `Workflow` rows (workflows they created)
- One user → many `WorkflowExecution` rows (runs they started)
- One user → many `RefreshToken` rows

---

### `RefreshToken`

Stores hashed refresh tokens to support token rotation and revocation.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `hashedToken` | String (unique) | bcrypt hash of the actual refresh token |
| `userId` | String (FK → User) | Owner |
| `revoked` | Boolean | False = valid; True = revoked |
| `expiresAt` | DateTime | 7 days from issuance |
| `createdAt` | DateTime | |

**Design decision**: The actual refresh token JWT is never stored. Only its bcrypt hash is saved. At refresh time, the server finds all non-revoked tokens for the user and bcrypt-compares the incoming token against each stored hash. This prevents exposure of raw tokens even if the database is leaked.

**Trade-off**: The bcrypt comparison loop over multiple tokens is slower than a direct DB lookup. Acceptable for a development-scale system.

---

### `Workspace`

A named grouping that contains workflows. Enables multi-tenancy at the application level.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | String | Required |
| `description` | String? | Optional |
| `createdById` | String (FK → User) | Creator |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

Relations:
- One workspace → many `WorkspaceMember` (who has access)
- One workspace → many `Workflow`

---

### `WorkspaceMember`

Join table between `User` and `Workspace`. Also carries the RBAC role.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `userId` | String (FK → User) | |
| `workspaceId` | String (FK → Workspace) | |
| `role` | String | `"OWNER"` or `"MEMBER"` |
| `createdAt` | DateTime | |

Unique constraint: `(userId, workspaceId)` — a user can only be a member of a workspace once.

**RBAC rules enforced at the application layer:**
- Only `OWNER` can delete a workspace
- Only `OWNER` can delete a workflow
- Only `OWNER` can update a workspace
- Any member can view and run workflows

When a workspace is created, the creator is automatically inserted as `OWNER` in a single Prisma transaction.

---

### `Workflow`

Represents a named automation workflow owned by a workspace.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | String | Required |
| `description` | String? | |
| `workspaceId` | String (FK → Workspace) | |
| `createdById` | String (FK → User) | |
| `status` | Enum: `DRAFT` \| `ACTIVE` | Separate from isActive |
| `version` | Int | Default 1; incremented manually |
| `isActive` | Boolean | Only active workflows can be triggered |
| `createdAt` / `updatedAt` | DateTime | |

Relations:
- One workflow → many `Node`
- One workflow → many `Edge`
- One workflow → many `WorkflowExecution`
- One workflow → many `WorkflowTrigger`

**Note**: Both `status` (enum: DRAFT/ACTIVE) and `isActive` (boolean) exist. In practice, `isActive` is what the execution engine checks to decide whether to run a workflow. `status` is a user-visible label on the frontend but is not independently enforced in the execution path.

Cascade delete: deleting a workflow removes all its nodes, edges, executions, and triggers automatically (Prisma `onDelete: Cascade`).

---

### `Node`

A single step in a workflow graph. Persists the visual position and configuration.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `workflowId` | String (FK → Workflow) | |
| `type` | String | `"HTTP"` or `"IF"` |
| `label` | String | User-defined name |
| `positionX` | Float | Canvas X coordinate |
| `positionY` | Float | Canvas Y coordinate |
| `config` | JSON | Type-specific configuration |
| `createdAt` | DateTime | |

**`config` shapes by node type:**

HTTP node:
```json
{
  "method": "GET",
  "url": "https://api.example.com/endpoint",
  "headers": { "Authorization": "Bearer token" },
  "body": { "key": "value" },
  "timeout": 30000
}
```

IF node:
```json
{
  "expression": "response.status === 200"
}
```

Relations:
- One node → many `Edge` (as source)
- One node → many `Edge` (as target)
- One node → many `NodeExecution`

---

### `Edge`

A directed connection between two nodes. Can carry an optional conditional expression.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `workflowId` | String (FK → Workflow) | |
| `sourceNodeId` | String (FK → Node) | |
| `targetNodeId` | String (FK → Node) | |
| `condition` | String? | jexl expression; null = always pass |
| `createdAt` | DateTime | |

If `condition` is set, it is evaluated at runtime using jexl. If the expression returns falsy, the target node (and all its descendants) are skipped.

Example condition: `"response.status === 200"` (passes if previous node returned HTTP 200)

---

### `WorkflowExecution`

A single run of a workflow. Created every time a workflow is triggered.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | Also used as the BullMQ job ID |
| `workflowId` | String (FK → Workflow) | |
| `startedById` | String (FK → User) | For automated triggers, this is the workflow creator |
| `status` | Enum | `QUEUED` → `RUNNING` → `SUCCESS` \| `FAILED` |
| `errorMessage` | String? | Top-level error if execution failed |
| `startedAt` | DateTime | When record was created |
| `completedAt` | DateTime? | When worker finished |
| `durationMs` | Int? | `completedAt - startedAt` in milliseconds |
| `retryCount` | Int | Number of BullMQ retry attempts made |
| `createdAt` | DateTime | |

Status transitions:
```
QUEUED (API writes this on enqueue)
  ↓
RUNNING (Worker updates on job start)
  ↓
SUCCESS or FAILED (Worker updates on completion)
```

`PENDING` and `SKIPPED` exist as enum values but are used at the `NodeExecution` level, not the `WorkflowExecution` level.

---

### `NodeExecution`

Records the result of a single node within an execution run.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `workflowExecutionId` | String (FK → WorkflowExecution) | |
| `nodeId` | String (FK → Node) | |
| `status` | Enum | `PENDING` → `RUNNING` → `SUCCESS` \| `FAILED` \| `SKIPPED` |
| `input` | JSON? | Not currently populated (reserved for future) |
| `output` | JSON? | Full HTTP response or IF result stored here |
| `error` | String? | Error message if node failed |
| `startedAt` | DateTime | |
| `completedAt` | DateTime? | |
| `durationMs` | Int? | `completedAt - startedAt` |

For HTTP nodes, `output` contains:
```json
{
  "url": "https://...",
  "method": "GET",
  "status": 200,
  "statusText": "OK",
  "headers": { ... },
  "body": { ... },
  "durationMs": 243
}
```

For IF nodes, `output` contains:
```json
{ "result": true }
```

---

### `WorkflowTrigger`

Defines how a workflow can be automatically started.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `workflowId` | String (FK → Workflow) | |
| `type` | Enum | `MANUAL` \| `WEBHOOK` \| `SCHEDULE` |
| `webhookPath` | String? | Random hex token; used as URL path for WEBHOOK type |
| `cron` | String? | Cron expression for SCHEDULE type; e.g., `*/5 * * * *` |
| `enabled` | Boolean | Enabled by default |
| `createdAt` | DateTime | |

The webhook URL is constructed as: `/api/v1/webhooks/{webhookPath}`

The `cron` field stores a standard 5-field cron expression validated by `node-cron` before saving.

---

### `TriggerExecution`

Tracks each time a trigger fires and its outcome.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `triggerId` | String (FK → WorkflowTrigger) | |
| `status` | Enum (ExecutionStatus) | |
| `startedAt` | DateTime | |
| `finishedAt` | DateTime? | |

When a webhook or cron trigger fires, a `TriggerExecution` is created with status `RUNNING`. When the associated `WorkflowExecution` completes, the `TriggerExecution` is updated to `SUCCESS` or `FAILED`.

---

## Entity Relationships (Summary)

```
User
 ├── WorkspaceMember (many, via join table)
 │    └── Workspace
 │         └── Workflow (many)
 │              ├── Node (many)
 │              │    └── NodeExecution (many, per execution)
 │              ├── Edge (many)
 │              ├── WorkflowExecution (many)
 │              │    └── NodeExecution (many)
 │              └── WorkflowTrigger (many)
 │                   └── TriggerExecution (many)
 └── RefreshToken (many)
```

---

## Design Decisions and Trade-offs

### Why UUIDs instead of integers?
UUIDs are used for all primary keys. This avoids sequential ID enumeration in API endpoints (security) and makes IDs safe to expose publicly (e.g., webhook paths). Trade-off: UUIDs are larger and slightly slower to index than integers.

### Why store node config as JSON?
Node configuration varies by type (HTTP nodes need URL/method/headers/body; IF nodes need an expression). Using a JSON column avoids having separate tables for each node type, keeping the schema simpler. Trade-off: no column-level database constraints on the JSON structure; validation is done at the application layer with the WorkflowValidator.

### Why cascade delete everywhere?
When a workspace is deleted, all its workflows, nodes, edges, executions, and triggers should be removed. Cascade delete handles this automatically at the database level without requiring application-layer cleanup code. Trade-off: accidental deletes have permanent consequences with no soft-delete protection.

### Why hash refresh tokens?
If the database is compromised, raw refresh tokens would allow attackers to impersonate users. Bcrypt hashing the stored token means even a full database dump cannot be used to generate valid sessions. Trade-off: token lookup requires a bcrypt comparison loop instead of a direct `WHERE hashedToken = ?` query, which is slower.

### Why a separate WorkflowExecution per run?
This creates a full audit trail. You can see every run, its duration, which nodes succeeded or failed, and the exact output. This is also what makes the execution detail modal possible in the UI.
