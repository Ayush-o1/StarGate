# Interview Preparation — Stargate

This document is written specifically to help you defend this project in campus placement interviews. Every question and answer is grounded in what the code actually does.

---

## How to Explain This Project in 2 Minutes

> **"I built a full-stack workflow automation tool that lets users design visual automation pipelines using a drag-and-drop interface. You connect HTTP request nodes with condition nodes, and the system executes them in the correct order using a background job queue.**
>
> **On the backend, I used Express with TypeScript, PostgreSQL with Prisma, and BullMQ with Redis for async job processing. The core execution engine implements Kahn's algorithm for topological sorting to figure out the order to run nodes and handle conditional branching.**
>
> **On the frontend, I used React with ReactFlow for the canvas, Zustand for state management, and implemented automatic JWT token refresh so users never see unexpected logouts.**
>
> **The project is organized as a monorepo with Turborepo, with three separate deployable services sharing one database."**

---

## Quick Project Facts (Memorize These)

| Fact | Value |
|---|---|
| Total DB tables | 10 |
| API endpoints | ~30+ |
| Services | 3 (API, Worker, Web) |
| Node types | 2 (HTTP, IF) |
| Trigger types | 3 (Manual, Webhook, Schedule) |
| Execution timeout | 5 minutes |
| JWT access token lifetime | 15 minutes |
| JWT refresh token lifetime | 7 days |
| BullMQ retry attempts | 3 (exponential backoff) |
| Queue name | `"workflow-execution"` |
| Auth rate limit | 20 req / 15 min per IP |

---

## Most Asked Questions

### General Questions

---

**Q: What problem does this project solve?**

A: It eliminates the need to write custom glue code when you want to chain multiple API calls with conditional logic. Instead of writing a script that calls API A, checks the result, then conditionally calls API B, you model the same flow visually as a graph and the system executes it for you.

---

**Q: Why did you build this as three separate services instead of one?**

A: The API needs to stay responsive. If a workflow has 10 HTTP nodes each taking 2 seconds, the API can't block for 20 seconds on a request. By separating the worker, the API immediately returns after putting the job in the queue, and the worker handles the slow part asynchronously. This also means failed jobs can be retried by BullMQ without the API needing to do anything.

---

**Q: Walk me through what happens when a user clicks "Run".**

A:
1. Frontend sends `POST /api/v1/workflows/:id/run`
2. API validates the workflow graph — checks for cycles, validates node configs, checks variable references
3. API creates a `WorkflowExecution` record in the database with status `QUEUED`
4. API adds a job to the BullMQ Redis queue with the workflow ID and execution ID
5. API responds immediately — the client sees "QUEUED"
6. The Worker picks up the job from the queue
7. Worker fetches the workflow's nodes and edges from the database
8. Worker runs a topological sort to determine execution order
9. For each node in order: creates a NodeExecution record, runs the node, saves the result
10. Worker updates the WorkflowExecution status to SUCCESS or FAILED
11. The frontend was polling every 3 seconds, so it sees the updated status

---

**Q: What is a DAG and why does it matter here?**

A: DAG stands for Directed Acyclic Graph. "Directed" means edges have a direction (source → target). "Acyclic" means no cycles — you can't create a loop where A → B → A. Workflows must be DAGs because you need a clear execution order. If there was a cycle, topological sort wouldn't work and the execution order would be undefined. The validator rejects workflows with cycles before they are ever enqueued.

---

**Q: How does topological sort work in your code?**

A: I used Kahn's algorithm:
1. Compute the in-degree (number of incoming edges) for every node
2. Put all nodes with in-degree = 0 (no dependencies) into a queue
3. While the queue is not empty: dequeue a node, add it to the sorted list, then reduce the in-degree of all its neighbors. If any neighbor's in-degree becomes 0, add it to the queue
4. If the sorted list length equals the number of nodes, we have a valid topological order. If it's shorter, there was a cycle

This runs in O(V + E) where V is nodes and E is edges.

---

**Q: How does conditional branching work?**

A: Each edge can have an optional condition (a jexl expression like `response.status === 200`). After a node executes successfully, each outgoing edge's condition is evaluated using jexl with the current execution context. The result is stored as `edgeState[edgeId] = true/false`.

When processing a node, we first check if it should execute: it should execute if it has no incoming edges, OR if any incoming edge has `edgeState = true`. If none of the incoming edges passed, the node is marked SKIPPED, and all its outgoing edges are automatically set to false — which causes all downstream nodes to also be skipped.

---

**Q: How does data pass from one node to the next?**

A: After each node executes, its output is stored in `executionContext[nodeId]`. When a downstream node's configuration is being resolved before execution, the `VariableResolver` scans for `{{nodeId.path}}` patterns and replaces them using lodash `get(executionContext, path)`. So if node A (ID: `abc`) returns `{ body: { id: 5 } }`, node B can use `https://api.com/users/{{abc.body.id}}` which resolves to `https://api.com/users/5` at runtime.

---

**Q: How does authentication work?**

A: Standard JWT with refresh token rotation:
- At login: two JWTs issued — a short-lived access token (15 min) and a long-lived refresh token (7 days)
- The refresh token is hashed with bcrypt and stored in the `RefreshToken` table. Only the hash is stored, never the raw token
- Protected API routes verify the access token signature
- When the access token expires (the frontend gets a 401/403), the frontend automatically calls `/auth/refresh` with the refresh token, gets new tokens, and retries the original request. The user never sees a logout
- On refresh: the old token's hash is found via bcrypt comparison, revoked, and a new pair is issued (rotation)
- On logout: the refresh token is revoked in the database

---

**Q: Why hash the refresh token in the database?**

A: If the database was compromised, storing raw tokens would give an attacker the ability to impersonate all users. Bcrypt hashing means even with full database access, the attacker can't derive the original refresh tokens. The trade-off is that lookup requires a bcrypt comparison loop rather than a direct WHERE clause query.

---

**Q: What is SSRF and how did you protect against it?**

A: SSRF (Server-Side Request Forgery) is a vulnerability where an attacker tricks your server into making HTTP requests to internal resources — like `http://localhost:3000`, `http://192.168.1.1` (the router), or AWS metadata endpoint `http://169.254.169.254`. In a workflow tool where users configure URLs, this is a real risk.

Before every HTTP request in the worker, I call `validateSSRF(url)` which:
1. Parses the URL
2. Blocks known hostnames like `localhost`, `host.docker.internal`
3. If the hostname is a raw IP, checks it against private CIDR ranges (RFC 1918 + loopback + link-local)
4. If it's a domain, resolves it via DNS and checks each resolved IP against the same CIDR ranges

Blocked ranges include `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`.

---

**Q: How are workspace roles enforced?**

A: At the controller layer. Every operation checks if the requesting user has a `WorkspaceMember` record for the relevant workspace. For sensitive operations (delete workspace, delete workflow), the code additionally checks `membership.role !== 'OWNER'` and returns 403 if they are just a MEMBER. There is no middleware-level RBAC — it's done per-controller.

---

**Q: What is a monorepo and why did you use Turborepo?**

A: A monorepo is a single Git repository that contains multiple separate packages or apps. Here, all three apps (API, Worker, Web) and shared packages (database, shared types, config) live in one repo. Turborepo adds:
- Parallelization: builds all apps concurrently where possible
- Caching: if code hasn't changed, it skips rebuilding (to be verified based on actual cache usage)
- Dependency ordering: builds `@stargate/database` and `@stargate/shared` before the apps that depend on them

pnpm workspaces make it so apps can import shared packages as `@stargate/database` without publishing them to npm.

---

**Q: What is BullMQ?**

A: BullMQ is a Node.js job queue library built on Redis. When the API enqueues a job, BullMQ serializes it to Redis. The worker process has a registered handler for the queue. BullMQ manages:
- Job pickup (exactly once delivery per worker)
- Retries (3 attempts here, with exponential backoff starting at 2000ms)
- Job state tracking (waiting, active, completed, failed)
- The `jobId = execution.id` ensures idempotency — the same execution can't be enqueued twice with conflicting state

---

**Q: What does Prisma do?**

A: Prisma is an ORM (Object-Relational Mapper) for TypeScript. The schema is written in `schema.prisma`, and Prisma generates a fully type-safe client. So instead of writing raw SQL, you write:
```typescript
const workflow = await prisma.workflow.findUnique({
  where: { id },
  include: { nodes: true, edges: true }
});
```
Prisma also handles migrations — schema changes create versioned `.sql` migration files that can be applied to any environment consistently.

---

**Q: Why PostgreSQL and not MongoDB?**

A: The data is heavily relational. A workflow has nodes and edges. Executions belong to workflows, node executions belong to executions and nodes. These relations benefit from foreign key constraints and cascade deletes. MongoDB's flexible schema wouldn't add value here because the structure is well-defined. The JSON columns in Prisma (for node `config` and execution `output`) handle the parts that genuinely need flexibility.

---

**Q: What is Zustand?**

A: Zustand is a lightweight state management library for React. It's an alternative to Redux. Each store is a function that returns an object with state values and setter functions. Components subscribe to specific slices of store state using hooks, and only re-render when those specific values change.

The project has 5 Zustand stores: auth, workspace, workflow (includes graph state), execution, and trigger.

---

**Q: Why poll every 3 seconds instead of using WebSockets?**

A: WebSockets would require a persistent connection between the browser and the server. For a development-scale project, polling every 3 seconds is simpler to implement, doesn't require additional infrastructure, and is acceptable given that workflow executions typically complete within a few seconds. The limitation is that updates have up to a 3-second lag. WebSocket or SSE is listed as a future improvement.

---

### System Design Questions

---

**Q: How would you scale this if you needed to handle more workflows running concurrently?**

A: The cleanest scaling point is the worker. Currently one worker process handles all jobs serially within a BullMQ concurrency limit. You could:
1. Run multiple worker processes (horizontally scale) — BullMQ ensures each job is processed by exactly one worker
2. Increase worker concurrency (`{ concurrency: 10 }` in the Worker constructor)
3. The API is stateless (except for the in-process cron scheduler) so it could be scaled behind a load balancer, though the cron would need to be moved to a separate scheduler process to avoid duplicate fires

The database would become a bottleneck at very high scale, but for most practical use cases within a campus project, this architecture is appropriate.

---

**Q: What would you change about the authentication approach?**

A: Two things:
1. The bcrypt comparison loop for refresh tokens doesn't scale if a user has many active sessions. A better approach would be to include a unique token ID (jti claim) in the refresh JWT, store that ID directly in the database, and use a simple `WHERE id = ?` lookup instead of a loop
2. The refresh token itself is in localStorage on the frontend, which exposes it to XSS. HttpOnly cookies would be safer but require more careful CORS and cookie configuration

---

**Q: What trade-offs did you make in the SSRF implementation?**

A: Two notable ones:
1. **Fail open on DNS error**: If DNS resolution fails (network hiccup, bad hostname), the code currently allows the request through rather than blocking it. This avoids false positives blocking legitimate requests. A stricter implementation would fail closed.
2. **IPv6 is partially handled**: Private IPv4 ranges are blocked correctly. For IPv6, only loopback (`::1`) and private ranges starting with `fc`, `fd`, `fe80` are blocked. A complete implementation would need to handle more IPv6 edge cases.

---

**Q: The validator runs before enqueueing. Why not just let the worker validate?**

A: Two reasons:
1. **Better UX**: If the workflow has a validation error (like a missing URL), the user gets the error immediately when clicking "Run", rather than having to wait for the worker to pick up the job
2. **Avoid wasted queue jobs**: There's no point queuing a job you know will fail. The validator runs in O(V + E) which is fast enough to do synchronously

The trade-off: there's technically a race condition where a user could edit a node between the validation check and the worker picking up the job. But since the worker re-fetches the workflow from the database, if the node config changed, the execution would fail at the worker level with a clear error.

---

**Q: Why use Zod for validation?**

A: Zod provides runtime type checking that TypeScript alone can't do. TypeScript types are erased at runtime — any JSON from an HTTP request could have any shape. Zod schemas like `CreateWorkflowSchema.parse(req.body)` throw at runtime if the request body doesn't match the expected shape. The schemas in `@stargate/shared` are used by both the API (for request validation) and the web (for type information), keeping validation logic in one place.

---

## Resume Bullet Points

These are accurate, verifiable statements from the codebase:

- Implemented a **DAG-based workflow execution engine** using Kahn's topological sort algorithm with conditional branching, per-node output tracking, and `{{variable}}` interpolation between nodes
- Built a **three-service monorepo** (REST API, BullMQ worker, React SPA) using Turborepo and pnpm workspaces with shared TypeScript packages
- Designed a **10-table PostgreSQL schema** using Prisma ORM with cascade deletes, RBAC via a WorkspaceMember join table, and JSON columns for node configuration
- Implemented **JWT authentication with refresh token rotation**: tokens stored hashed (bcrypt) in the database, automatic silent refresh in the frontend API client
- Integrated **BullMQ + Redis** for async job processing with 3-attempt exponential backoff and a 5-minute per-workflow execution timeout
- Built **SSRF protection** in the worker: pre-flight DNS resolution with CIDR-range validation (RFC 1918, loopback, link-local) before any outbound HTTP call
- Implemented **three trigger types**: manual (UI button), webhook (auto-generated URL token), and scheduled (cron expression via node-cron, loaded on startup)
- Built **workflow import/export**: exports nodes + edges + triggers to JSON; imports with full ID remapping inside a Prisma database transaction
- Built a **drag-and-drop workflow canvas** with ReactFlow: node drag position persistence (PUT /nodes/:id/position), edge condition configuration, and real-time execution status overlay

---

## Keywords for ATS / Recruiters

The following are genuine technologies and concepts in this project:

`TypeScript` `Node.js` `Express.js` `React` `PostgreSQL` `Redis` `Docker` `REST API` `JWT Authentication` `OAuth-style token rotation` `BullMQ` `Job Queue` `Async Processing` `Prisma ORM` `Zod Validation` `ReactFlow` `Zustand` `Vite` `Turborepo` `Monorepo` `pnpm` `Directed Acyclic Graph` `Topological Sort` `Kahn's Algorithm` `Conditional Branching` `SSRF Protection` `CIDR Validation` `bcrypt` `Rate Limiting` `Helmet` `CORS` `node-cron` `Webhook` `Docker Compose` `Tailwind CSS` `Full-stack`
