# Stargate Observability

> Monitoring, metrics, health checks, and execution telemetry in the Stargate platform.

---

## Table of Contents

- [Overview](#overview)
- [Execution Telemetry](#execution-telemetry)
- [System Health Checks](#system-health-checks)
- [Workspace Metrics](#workspace-metrics)
- [Slow Execution Detection](#slow-execution-detection)
- [Observability API Reference](#observability-api-reference)
- [Data Retention](#data-retention)

---

## Overview

Stargate implements **three layers of observability**:

| Layer | What It Measures | Where Stored |
|-------|-----------------|--------------|
| **Node Execution Traces** | Per-step inputs, outputs, durations, errors | `NodeExecution` table (PostgreSQL) |
| **Workflow Execution Summaries** | Overall status, total duration, error message | `WorkflowExecution` table (PostgreSQL) |
| **System Health** | API, Worker, Redis, PostgreSQL availability | Live health check (not persisted) |
| **Workspace Metrics** | Aggregated success rates, counts, averages | Computed at query time from PostgreSQL |

---

## Execution Telemetry

### Node-Level Tracing

Every single node execution is tracked with microsecond granularity:

```typescript
// NodeExecution schema
{
  id: string,                   // UUID
  workflowExecutionId: string,  // Parent execution
  nodeId: string,               // The node definition
  status: ExecutionStatus,      // PENDING | RUNNING | SUCCESS | FAILED | SKIPPED
  input: Json?,                 // Raw node config at time of execution (after variable resolution)
  output: Json?,                // Full response object (status, headers, body, durationMs)
  error: string?,               // Error message if status === FAILED
  startedAt: DateTime,          // Millisecond-precision start timestamp
  completedAt: DateTime?,       // Millisecond-precision completion timestamp
  durationMs: Int?,             // Derived: completedAt - startedAt
}
```

### HTTP Node Output Structure

For HTTP nodes, the complete response context is persisted in `NodeExecution.output`:

```json
{
  "url": "https://api.example.com/users/1",
  "method": "GET",
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json; charset=utf-8",
    "x-response-time": "14ms"
  },
  "body": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com"
  },
  "durationMs": 142
}
```

This enables:
- **Debugging** — see exactly what the external API returned
- **Variable validation** — confirm what values are available for downstream `{{tokens}}`
- **Performance analysis** — identify which external APIs are slow

### Workflow-Level Summary

```typescript
// WorkflowExecution schema
{
  id: string,
  workflowId: string,
  startedById: string,
  status: ExecutionStatus,   // QUEUED | RUNNING | SUCCESS | FAILED
  errorMessage: string?,     // High-level error if workflow failed
  startedAt: DateTime,
  completedAt: DateTime?,
  durationMs: Int?,          // Total workflow duration
  retryCount: Int,           // BullMQ retry attempt count
}
```

---

## System Health Checks

### Health Endpoint
`GET /health` (root health endpoint)
`GET /api/v1/system/health` (system-level, authenticated)

The health check verifies all four critical system components:

```typescript
// Checks performed in parallel
const checks = await Promise.allSettled([
  checkAPI(),      // Always resolves immediately (we're responding)
  checkDatabase(), // prisma.$queryRaw`SELECT 1`
  checkRedis(),    // redis.ping()
  checkWorker(),   // Query latest WorkflowExecution from DB
]);
```

### Health Response Structure
```json
{
  "api": "healthy",
  "database": "healthy",
  "redis": "healthy",
  "worker": "healthy"
}
```

| Component | Check Method | Failure Indicator |
|-----------|-------------|-------------------|
| `api` | Always `healthy` if responding | Server unreachable |
| `database` | `SELECT 1` via Prisma | `unhealthy` if query fails |
| `redis` | `PING` command via ioredis | `unhealthy` if connection fails |
| `worker` | Recent `WorkflowExecution` query | `unhealthy` if DB unreachable |

### Using Health Checks
```bash
# Verify all services are up after deployment
curl http://localhost:3000/health

# Expected response
{"api":"healthy","database":"healthy","redis":"healthy","worker":"healthy"}

# Check with Docker Compose
docker compose ps
```

---

## Workspace Metrics

### Metrics Endpoint
`GET /api/v1/system/metrics/workspace/:workspaceId`

Returns aggregated execution statistics for a workspace:

```json
{
  "totalExecutions": 48,
  "successCount": 45,
  "failedCount": 3,
  "successRate": 93.75,
  "averageDurationMs": 1240,
  "totalNodeExecutions": 213,
  "recentExecutions": [...]
}
```

### Aggregation Logic
Metrics are computed at query time from the `WorkflowExecution` table:

```sql
-- Conceptual SQL (executed via Prisma aggregations)
SELECT
  COUNT(*) AS totalExecutions,
  SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS successCount,
  SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failedCount,
  AVG(durationMs) AS averageDurationMs
FROM WorkflowExecution
WHERE workflowId IN (
  SELECT id FROM Workflow WHERE workspaceId = :workspaceId
);
```

### Dashboard Metrics Display
The frontend Dashboard page renders these metrics as:
- **Success rate percentage** with visual indicator
- **Total execution count** 
- **Average duration** in milliseconds
- **Failed execution count**
- **Recent execution list** with status badges and timestamps

---

## Slow Execution Detection

Executions exceeding **5,000ms** are automatically flagged in the UI with a `SLOW` badge. This is implemented as a client-side computation:

```typescript
// Frontend ExecutionList component
const isSlow = execution.durationMs && execution.durationMs > 5000;
// Renders a warning badge in the execution history table
```

This threshold helps engineers quickly identify which workflows are experiencing performance issues with external API calls.

---

## Observability API Reference

### Get Execution Details
`GET /api/v1/executions/:executionId`

Returns the complete execution trace including all node-level logs:

```json
{
  "id": "exec-uuid",
  "workflowId": "workflow-uuid",
  "status": "SUCCESS",
  "startedAt": "2026-06-11T10:00:00.000Z",
  "completedAt": "2026-06-11T10:00:01.420Z",
  "durationMs": 1420,
  "retryCount": 0,
  "errorMessage": null,
  "nodeExecutions": [
    {
      "nodeId": "node-uuid",
      "status": "SUCCESS",
      "output": {
        "status": 200,
        "body": { "id": 1 },
        "durationMs": 142
      },
      "startedAt": "2026-06-11T10:00:00.010Z",
      "completedAt": "2026-06-11T10:00:00.152Z",
      "durationMs": 142
    }
  ]
}
```

### List Workflow Executions
`GET /api/v1/workflows/:workflowId/executions`

Returns paginated execution history for a workflow with status summaries.

### Workspace Metrics
`GET /api/v1/system/metrics/workspace/:workspaceId`

Returns aggregated performance metrics scoped to all workflows in a workspace.

---

## Data Retention

Currently, all execution data is retained indefinitely in PostgreSQL. This includes:
- All `WorkflowExecution` records
- All `NodeExecution` records with full input/output JSON blobs
- All `TriggerExecution` records

For production deployments with high execution volumes, a data retention policy (e.g., purging executions older than 30 days) should be implemented via a scheduled cleanup job. This is noted in the [Future Roadmap](../README.md#-future-roadmap).
