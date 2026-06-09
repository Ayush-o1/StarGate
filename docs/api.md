# Stargate API Documentation

Base URL: `http://localhost:3000/api/v1`
Global Payload Limit: `1MB`

## 1. Authentication
All endpoints under `/auth` do not require a bearer token.

### Register
`POST /auth/register`
**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```
**Response:** `201 Created`
```json
{
  "user": { "id": "uuid", "email": "jane@example.com", "name": "Jane Doe" },
  "tokens": { "accessToken": "...", "refreshToken": "..." }
}
```

### Login
`POST /auth/login`
**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123!"
}
```

### Refresh Token
`POST /auth/refresh`
**Request Body:**
```json
{
  "refreshToken": "..."
}
```

---

## 2. Workspaces
Requires `Authorization: Bearer <accessToken>`

### List Workspaces
`GET /workspaces`
**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Production Setup",
    "createdAt": "2026-06-01T12:00:00Z"
  }
]
```

### Create Workspace
`POST /workspaces`
**Request Body:**
```json
{
  "name": "Data Analytics",
  "description": "ETL pipelines"
}
```

---

## 3. Workflows

### List Workflows in Workspace
`GET /workflows/workspace/:workspaceId`

### Create Workflow
`POST /workflows/workspace/:workspaceId`
**Request Body:**
```json
{
  "name": "Sync Stripe Customers",
  "description": "Daily stripe sync to internal CRM"
}
```
**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Sync Stripe Customers",
  "isActive": false,
  "workspaceId": "uuid"
}
```

### Export Workflow
`GET /workflows/:id/export`
**Response:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Workflow Name",
  "nodes": [...],
  "edges": [...],
  "triggers": [...]
}
```

### Import Workflow
`POST /workflows/workspace/:workspaceId/import`
**Request Body:** (The JSON from Export endpoint)

---

## 4. Execution Engine

### Run Workflow Manually
`POST /executions/workflow/:workflowId`
**Response:** `202 Accepted`
```json
{
  "executionId": "uuid",
  "status": "QUEUED"
}
```
*Note: A `400 Bad Request` will be thrown if the Graph is cyclic or misconfigured.*

### Get Execution Details
`GET /executions/:executionId`
**Response:** `200 OK`
```json
{
  "id": "uuid",
  "status": "SUCCESS",
  "startedAt": "2026-06-01T12:00:00Z",
  "completedAt": "2026-06-01T12:00:05Z",
  "nodes": [
    {
      "nodeId": "uuid",
      "status": "SUCCESS",
      "output": { "statusCode": 200, "body": { "id": 1 } },
      "durationMs": 420
    }
  ]
}
```

---

## 5. Triggers

### Create Trigger
`POST /triggers/workflow/:workflowId`
**Request Body:**
```json
{
  "type": "CRON",
  "cron": "*/5 * * * *"
}
```

### Webhook Execution
`POST /webhooks/:webhookId`
Allows external systems to push payloads to stargate workflows.
**Response:** `202 Accepted`

---

## 6. System & Observability

### Workspace Metrics
`GET /metrics/workspace/:workspaceId`
**Response:** `200 OK`
```json
{
  "totalExecutions": 152,
  "successRate": 94.7,
  "averageDurationMs": 1850,
  "failedExecutions": 8
}
```

### System Health
`GET /health`
**Response:** `200 OK`
```json
{
  "api": "healthy",
  "worker": "healthy",
  "redis": "healthy",
  "database": "healthy"
}
```
