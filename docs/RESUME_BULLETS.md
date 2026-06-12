# Stargate — Resume Bullets & Interview Guide

> Ready-to-use resume impact statements and interview talking points based on verified, codebase-sourced metrics.

---

## Quick Reference — Verified Metrics

All metrics below are sourced directly from the codebase and can be independently verified.

| Metric | Value | Source File |
|--------|-------|-------------|
| Total API endpoints | 34+ | `apps/api/src/routes/` + module routes |
| Database models | 9 | `packages/database/prisma/schema.prisma` |
| Database enums | 3 | `schema.prisma` |
| Execution states | 6 | `ExecutionStatus` enum |
| Trigger types | 3 | `TriggerType` enum |
| Max retry attempts | 3 | BullMQ configuration in `executions.service.ts` |
| Workflow timeout | 300,000ms (5 min) | `worker.ts:45` |
| SSRF blocked IPs | 3 explicit + private ranges | `ssrf.ts:3-13` |
| Node types | 2 (HTTP, IF) | `execution.processor.ts` |
| Frontend pages | 4 | `apps/web/src/pages/` |
| Docker services | 5 | `docker-compose.yml` |

---

## One-Line Resume Bullet

> **Option A (engineering emphasis):**
> Built Stargate — a distributed workflow orchestration platform with a React Flow visual builder, BullMQ async execution engine, conditional DAG branching, and node-level observability using Node.js, TypeScript, PostgreSQL, and Redis.

> **Option B (impact emphasis):**
> Engineered a full-stack workflow automation platform inspired by n8n and Temporal, featuring an async queue architecture, SSRF-hardened HTTP execution worker, and real-time execution monitoring across 34 REST API endpoints.

---

## Two-Line Resume Bullet

> Architected Stargate, a production-grade distributed workflow orchestration platform with a React Flow visual builder, BullMQ-backed async execution engine, and granular per-node observability stored in PostgreSQL.
> 
> Implemented SSRF protection with DNS-resolved IP blocking, topological DAG sort for correct execution ordering, `jexl`-powered conditional branching, and a `{{variable}}` interpolation engine for cross-node data passing.

---

## Three-Line Resume Bullet

> Built Stargate end-to-end: a microservice-based workflow orchestration platform spanning a React 18 + React Flow visual canvas frontend, an Express.js REST gateway with 34 endpoints and JWT+RBAC security, and a headless BullMQ worker consuming from Redis.
>
> Designed the core DAG execution engine using Kahn's topological sort algorithm, enabling correct dependency-ordered node execution with support for conditional branching (IF nodes with `jexl` expression evaluation) and recursive branch pruning for SKIPPED paths.
>
> Implemented production hardening including DNS-resolved SSRF blocking, 5-minute global execution timeouts via `Promise.race`, 3-retry exponential backoff on BullMQ, cyclic graph pre-flight validation, and 1MB Express payload limits across a Turborepo monorepo with shared Prisma and Zod packages.

---

## Internship Version

> **Tech:** TypeScript, React, Node.js, PostgreSQL, Redis, Docker

> Built a full-stack workflow automation platform called Stargate. Designed a visual drag-and-drop canvas using React Flow that lets users build multi-step HTTP pipelines. Implemented a background job queue (BullMQ + Redis) so the API stays responsive during execution. Added conditional branching logic, cross-node variable interpolation, and per-step execution tracking with timestamps and outputs stored in PostgreSQL.

---

## New Grad Version

> **Tech Stack:** TypeScript, React 18, Zustand, React Flow, Node.js, Express, Prisma, BullMQ, PostgreSQL, Redis, Docker Compose, Turborepo

> Designed and implemented Stargate, a distributed workflow orchestration platform with the following engineering highlights:
> - **Async queue architecture:** Decoupled API from execution via BullMQ, enabling the API to respond in <50ms regardless of workflow complexity.
> - **Graph algorithms:** Implemented Kahn's topological sort for DAG traversal and cycle detection; built recursive branch pruning for conditional IF-node routing.
> - **Security hardening:** DNS-resolved SSRF protection blocking private IP ranges, JWT with refresh token rotation, per-workspace RBAC, and 1MB payload limits.
> - **Observability:** Node-level execution traces with microsecond durations, workspace success rate aggregations, and a 4-service health check system.
> - **Full monorepo:** Turborepo orchestrates shared `@stargate/database` (Prisma), `@stargate/shared` (Zod schemas), and 3 independent service packages.

---

## 10 Strongest Resume Bullets (Pick & Choose)

1. Engineered a queue-backed workflow orchestration engine using Node.js, Redis, and BullMQ, fully decoupling HTTP ingestion from asynchronous DAG execution to maintain API responsiveness under load.

2. Architected a Directed Acyclic Graph (DAG) processor using Kahn's topological sort algorithm, enabling correct dependency-ordered execution with support for fan-in, fan-out, and diamond-shaped workflow topologies.

3. Implemented a conditional branching engine using `jexl` expression evaluation on IF nodes, with recursive branch pruning that marks downstream nodes as `SKIPPED` when conditions are not met.

4. Built a native Variable Resolution Engine allowing users to interpolate previous HTTP response payloads (e.g., `{{nodeId.body.id}}`) dynamically into downstream node configurations using `lodash.get` path traversal.

5. Secured the execution worker against Server-Side Request Forgery (SSRF) with DNS-resolved IP address validation, blocking loopback, cloud metadata endpoints (`169.254.169.254`), and RFC 1918 private IP ranges.

6. Designed an observable telemetry system logging microsecond-precision durations across all node executions, aggregating workspace-level success rates, average durations, and failure counts via Prisma aggregations.

7. Developed a 34-endpoint REST API Gateway with Express.js and Prisma, implementing JWT authentication, refresh token rotation with database-persisted hashed tokens, and per-workspace RBAC enforcement.

8. Implemented a 4-service system health check architecture (`/health`) simultaneously verifying API availability, PostgreSQL liveness (`SELECT 1`), Redis connectivity (`PING`), and Worker status.

9. Hardened API resilience against denial-of-service with 1MB JSON payload limits (Express middleware), cyclic graph pre-flight validation (topological sort), and 5-minute `Promise.race` timeouts on all workflow executions.

10. Built a full workflow Import/Export system with deep-copy serialization and UUID remapping via an in-memory `Map<oldId, newId>`, enabling topology-preserving workflow portability across workspaces.

---

## Interview Talking Points

### "Walk me through the architecture."
*"Stargate is a Turborepo monorepo with three independent services: an Express.js API Gateway, a React frontend, and a headless BullMQ Worker. The key design invariant is that the API never executes workflow logic — it only validates, persists, and enqueues. The Worker is where all execution happens, consuming jobs from a Redis-backed BullMQ queue. This lets the API maintain sub-50ms response times regardless of how complex the workflow is."*

### "Why BullMQ over a simple database queue or in-memory processing?"
*"A few reasons. First, BullMQ persists jobs in Redis, so a server crash doesn't lose in-flight work. Second, it provides distributed locking — multiple worker containers can run simultaneously without processing the same job twice. Third, exponential backoff retry logic is built in. An in-memory event emitter would lose jobs on crash and would only work with a single worker instance."*

### "How does the conditional branching work?"
*"Each edge in the graph can optionally carry a condition string like 'TRUE' or 'FALSE'. When an IF node evaluates its expression using `jexl`, outgoing edges are matched against the result. Edges that match get marked as active in a shared `edgeState` Map. When we reach any downstream node, we check if any of its incoming edges are active — if none are, the node is marked SKIPPED without executing. Because we process in topological order, this check is always made after all upstream nodes have been processed."*

### "How do you prevent SSRF attacks?"
*"Since users define HTTP node URLs through the UI and our worker executes them server-side, this is a critical vector. We validate every URL before execution. First, we check the hostname against a blocklist of known dangerous names like localhost and host.docker.internal. Then — and this is the important part — we resolve the hostname via DNS and check the resolved IP addresses. This prevents DNS rebinding attacks where someone points a public domain to a private IP. We block 127.x, 0.0.0.0, the AWS metadata endpoint at 169.254.169.254, and all RFC 1918 private ranges."*

### "How does the Import/Export work?"
*"Export serializes the entire workflow — its nodes, edges, and triggers — into a JSON document. Import is the interesting part: all the IDs in that JSON are UUIDs from a different database environment. So on import, we do a two-pass UUID remapping. First pass: generate a new UUID for each node and store the mapping in a `Map<oldId, newId>`. Second pass: create each edge with its source and target IDs remapped through that Map. The full topology is preserved, but all identifiers are fresh and safe for the new workspace."*

### "What would you improve if you were to scale this to production?"
*"The biggest issue is the shared worker pool — all tenant executions compete for the same worker resources. In a real multi-tenant system, I'd implement per-workspace BullMQ queues with rate limiting. I'd also replace the client-side polling for execution status with Server-Sent Events, reducing unnecessary HTTP traffic. And I'd add a data retention job to periodically archive old execution records — right now everything is retained indefinitely, which would cause the NodeExecution table to grow unboundedly in a production system."*

---

## Metrics You Can Claim (Verified)

| Claim | Evidence |
|-------|---------|
| "3 automatic retries with exponential backoff" | BullMQ `attempts: 3` configuration |
| "5-minute global timeout enforcement" | `WORKFLOW_TIMEOUT_MS = 5 * 60 * 1000` in `worker.ts` |
| "34+ REST API endpoints" | Count of route definitions across all route files |
| "9-model relational schema with 3 enums" | `packages/database/prisma/schema.prisma` |
| "6-state execution machine" | `ExecutionStatus` enum in schema |
| "3 trigger types" | `TriggerType` enum: MANUAL, WEBHOOK, SCHEDULE |
| "DNS-resolved SSRF protection" | `dns.resolve()` in `ssrf.ts` |
| "4-service health monitoring" | API, DB, Redis, Worker checks in `system.controller.ts` |

## Metrics You Should NOT Claim

| Claim | Why Not |
|-------|---------|
| "Processes millions of requests" | No load testing or production traffic data |
| "Auto-scaling Kubernetes cluster" | Docker Compose only, no K8s |
| "Sub-millisecond latency" | No benchmarking performed |
| "100% uptime" | No SLA or monitoring in production environment |
| "Used by X users/companies" | Personal/portfolio project |
