# API Reference — Stargate

All endpoints are prefixed with `/api/v1` unless stated otherwise.

**Base URL (local):** `http://localhost:3000`

**Authentication:** Protected endpoints require `Authorization: Bearer <accessToken>` header. Access tokens expire in 15 minutes. Use `POST /api/v1/auth/refresh` to get new ones.

**Error format:**
```json
{ "error": { "message": "Descriptive error string" } }
```

---

## Authentication

Auth routes are rate-limited to **20 requests per 15 minutes per IP**.

---

### Register

`POST /api/v1/auth/register`

Creates a new user account. Automatically issues tokens.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "atleast8chars",
  "name": "Alice"
}
```

| Field | Required | Validation |
|---|---|---|
| `email` | Yes | Valid email format |
| `password` | Yes | Minimum 8 characters |
| `name` | No | Any string |

**Response `201`:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Alice",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors:**
- `400` — Validation failed or email already in use

---

### Login

`POST /api/v1/auth/login`

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response `200`:** Same shape as register response.

**Errors:**
- `401` — Invalid credentials (same message for both wrong email and wrong password to avoid enumeration)

---

### Refresh Token

`POST /api/v1/auth/refresh`

Exchange a refresh token for a new access + refresh token pair. The old refresh token is revoked (rotation).

**Request body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

**Errors:**
- `400` — No refresh token provided
- `403` — Token invalid, expired, or already revoked

---

### Logout

`POST /api/v1/auth/logout`

Revokes the provided refresh token. Always returns `204` even if the token was invalid (safe logout).

**Request body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response `204`:** No content.

---

## Workspaces

All workspace routes require authentication.

---

### List Workspaces

`GET /api/v1/workspaces`

Returns all workspaces the current user is a member of, including their role.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "My Workspace",
    "description": null,
    "createdById": "uuid",
    "createdAt": "...",
    "updatedAt": "...",
    "role": "OWNER"
  }
]
```

---

### Create Workspace

`POST /api/v1/workspaces`

Creates a workspace. The creating user is automatically added as `OWNER`.

**Request body:**
```json
{
  "name": "My Workspace",
  "description": "Optional description"
}
```

**Response `201`:** The created workspace object.

---

### Get Workspace

`GET /api/v1/workspaces/:id`

Returns a single workspace. Requires membership.

**Response `200`:** Workspace object with `role` field.

**Errors:**
- `403` — User is not a member of this workspace

---

### Update Workspace

`PUT /api/v1/workspaces/:id`

Requires `OWNER` role.

**Request body:** `name` and/or `description` (both optional)

**Response `200`:** Updated workspace with `role` field.

---

### Delete Workspace

`DELETE /api/v1/workspaces/:id`

Requires `OWNER` role. Cascades: deletes all workflows, nodes, edges, executions, triggers.

**Response `204`:** No content.

---

## Workflows

All workflow routes require authentication.

---

### List Workflows

`GET /api/v1/workflows/workspace/:workspaceId`

Returns all workflows in a workspace, ordered newest first.

**Response `200`:** Array of workflow objects.

---

### Create Workflow

`POST /api/v1/workflows/workspace/:workspaceId`

**Request body:**
```json
{
  "name": "My Workflow",
  "description": "Optional"
}
```

New workflows start as `DRAFT` status, `isActive: true` by default.

**Response `201`:** The created workflow object.

---

### Get Workflow

`GET /api/v1/workflows/:id`

Returns workflow with its `nodes` and `edges` arrays included.

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "My Workflow",
  "status": "DRAFT",
  "isActive": true,
  "nodes": [...],
  "edges": [...]
}
```

---

### Update Workflow

`PUT /api/v1/workflows/:id`

**Request body (all optional):**
```json
{
  "name": "New Name",
  "description": "Updated",
  "status": "ACTIVE",
  "isActive": false,
  "version": 2
}
```

**Response `200`:** Updated workflow object.

---

### Delete Workflow

`DELETE /api/v1/workflows/:id`

Requires `OWNER` role in the workflow's workspace.

**Response `204`:** No content.

---

### Get Workflow Graph

`GET /api/v1/workflows/:id/graph`

Returns nodes and edges as separate arrays (same data as GET workflow, different shape).

**Response `200`:**
```json
{
  "nodes": [...],
  "edges": [...]
}
```

---

### Export Workflow

`GET /api/v1/workflows/:id/export`

Returns the full workflow object including nodes, edges, and triggers. Can be saved as JSON and re-imported.

**Response `200`:** Workflow + nodes + edges + triggers combined.

---

### Import Workflow

`POST /api/v1/workflows/workspace/:workspaceId/import`

Takes an exported workflow JSON and recreates it in the target workspace. All IDs are regenerated (no conflicts). Wrapped in a database transaction.

**Request body:** The JSON exported from the export endpoint.

**Response `201`:** The newly created workflow object.

---

## Nodes

All node routes require authentication.

---

### Create Node

`POST /api/v1/nodes/workflow/:workflowId`

**Request body:**
```json
{
  "type": "HTTP",
  "label": "Fetch User",
  "positionX": 200,
  "positionY": 150,
  "config": {
    "method": "GET",
    "url": "https://api.example.com/users/1"
  }
}
```

| `type` | Config shape |
|---|---|
| `HTTP` | `{ method, url, headers?, body?, timeout? }` |
| `IF` | `{ expression }` — e.g., `"response.status === 200"` |

**Response `201`:** Created node object.

---

### List Nodes

`GET /api/v1/nodes/workflow/:workflowId`

**Response `200`:** Array of node objects.

---

### Update Node

`PUT /api/v1/nodes/:id`

**Request body (all optional):** `type`, `label`, `positionX`, `positionY`, `config`

**Response `200`:** Updated node object.

---

### Update Node Position

`PUT /api/v1/nodes/:id/position`

Called automatically when a node is dragged on the canvas.

**Request body:**
```json
{
  "positionX": 350,
  "positionY": 200
}
```

**Response `200`:** Updated node object.

---

### Delete Node

`DELETE /api/v1/nodes/:id`

Also deletes connected edges (Prisma cascade).

**Response `204`:** No content.

---

## Edges

All edge routes require authentication.

---

### Create Edge

`POST /api/v1/edges/workflow/:workflowId`

**Request body:**
```json
{
  "sourceNodeId": "uuid",
  "targetNodeId": "uuid",
  "condition": null
}
```

`condition` is a jexl expression string (e.g., `"response.status === 200"`). `null` means the edge always passes.

**Response `201`:** Created edge object.

---

### List Edges

`GET /api/v1/edges/workflow/:workflowId`

**Response `200`:** Array of edge objects.

---

### Update Edge

`PATCH /api/v1/edges/:id`

**Request body:** `condition` (string or null)

**Response `200`:** Updated edge object.

---

### Delete Edge

`DELETE /api/v1/edges/:id`

**Response `204`:** No content.

---

## Executions

All execution routes require authentication.

---

### Run Workflow (Manual Trigger)

`POST /api/v1/workflows/:id/run`

Validates the workflow, creates an execution record, and enqueues the job.

**Response `201`:**
```json
{
  "executionId": "uuid",
  "status": "QUEUED"
}
```

**Errors:**
- `400` — Workflow is inactive or fails validation
- `404` — Workflow not found

---

### List Executions

`GET /api/v1/workflows/:id/executions`

Returns all executions for a workflow, newest first.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "workflowId": "uuid",
    "status": "SUCCESS",
    "errorMessage": null,
    "startedAt": "...",
    "completedAt": "...",
    "durationMs": 1234,
    "retryCount": 0
  }
]
```

---

### Get Execution

`GET /api/v1/executions/:id`

Returns a single execution record.

---

### Get Node Executions

`GET /api/v1/executions/:id/nodes`

Returns per-node execution results for a workflow execution. This is what populates the execution detail modal.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "nodeId": "uuid",
    "status": "SUCCESS",
    "output": {
      "url": "https://...",
      "status": 200,
      "body": { ... },
      "durationMs": 243
    },
    "error": null,
    "durationMs": 243
  },
  {
    "id": "uuid",
    "nodeId": "uuid",
    "status": "SKIPPED",
    "output": null,
    "error": null,
    "durationMs": 0
  }
]
```

---

## Triggers

---

### Create Trigger

`POST /api/v1/workflows/:workflowId/triggers`

**Request body:**
```json
{
  "type": "WEBHOOK"
}
```

or for schedule:
```json
{
  "type": "SCHEDULE",
  "cron": "*/5 * * * *"
}
```

| Type | Required fields | What happens on create |
|---|---|---|
| `MANUAL` | none | Just saves the record |
| `WEBHOOK` | none | Random hex token generated as `webhookPath` |
| `SCHEDULE` | `cron` | Cron expression saved; scheduler registers the task |

**Response `201`:** Created trigger object.

---

### List Triggers

`GET /api/v1/workflows/:workflowId/triggers`

**Response `200`:** Array of trigger objects.

---

### Delete Trigger

`DELETE /api/v1/triggers/:id`

Removes the trigger. For SCHEDULE type, unregisters the cron task from memory.

**Response `204`:** No content.

---

### Enable / Disable Trigger

`POST /api/v1/triggers/:id/enable`
`POST /api/v1/triggers/:id/disable`

Toggles the `enabled` flag. For SCHEDULE type, adds or removes the in-process cron task.

**Response `200`:** Updated trigger object.

---

## Webhooks (Public)

### Trigger via Webhook

`POST /api/v1/webhooks/:token`

No authentication required. The `token` is the `webhookPath` value from the trigger record.

Any JSON body may be sent; it is not currently passed to the workflow nodes.

**Response `200`:**
```json
{ "success": true }
```

**Errors:**
- `404` — No webhook trigger found for this token
- `400` — Trigger is disabled or workflow is inactive

---

## System

---

### Health Check

`GET /health`

Checks all subsystems. No authentication required.

**Response `200`:**
```json
{
  "api": "healthy",
  "worker": "healthy",
  "redis": "healthy",
  "database": "healthy"
}
```

The `worker` status is determined by checking if there are any active BullMQ worker processes registered on the queue.

---

### Metrics

`GET /api/v1/system/metrics`

Returns execution statistics and queue depth. No authentication required.

**Response `200`:**
```json
{
  "workflowMetrics": {
    "totalExecutions": 42,
    "successfulExecutions": 38,
    "failedExecutions": 4,
    "successRate": 90.47,
    "averageDuration": 1532.5
  },
  "queueMetrics": {
    "waiting": 0,
    "active": 1,
    "completed": 38,
    "failed": 4
  },
  "nodeMetrics": [
    {
      "type": "HTTP",
      "executions": 120,
      "successRate": 91.67,
      "averageDuration": 345.2
    }
  ],
  "errorAnalytics": [
    { "category": "Timeout", "count": 2 },
    { "category": "DNS Failure", "count": 1 }
  ]
}
```

Error categories are classified by scanning error message strings from `NodeExecution.error`.

---

## Error Classification

| HTTP Status | Meaning |
|---|---|
| `400` | Bad request — validation error or business rule violation |
| `401` | Not authenticated — missing or invalid access token |
| `403` | Forbidden — authenticated but not authorized (wrong role or not a member) |
| `404` | Resource not found |
| `429` | Rate limit exceeded (auth routes) |
| `500` | Internal server error — caught by the global error handler |
