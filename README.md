<div align="center">

# ⚡ Stargate

**A production-grade, distributed workflow orchestration platform.**

Design, execute, monitor, and automate complex multi-step pipelines through an interactive visual canvas — powered by a decoupled async execution engine.

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-6366f1)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-6366f1)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-6366f1)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-6366f1)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-6366f1)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-6366f1)](https://www.docker.com/)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-6366f1)](https://turbo.build/)

*Inspired by n8n, Temporal, Apache Airflow, and Node-RED.*

</div>

---

## 📖 Table of Contents

- [Problem Statement](#-problem-statement)
- [Product Overview](#-product-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Workflow Lifecycle](#-workflow-lifecycle)
- [System Design](#-system-design)
- [Screenshots](#-screenshots)
- [Local Setup](#-local-setup)
- [Development](#-development)
- [Folder Structure](#-folder-structure)
- [Engineering Highlights](#-engineering-highlights)
- [Why This Project Matters](#-why-this-project-matters)
- [Future Roadmap](#-future-roadmap)
- [License](#-license)

---

## 🎯 Problem Statement

Modern automation requires executing complex sequences of interconnected tasks — each making network calls, transforming data, and passing state downstream. Building these pipelines as monolithic scripts is brittle, opaque, and impossible to monitor at scale.

**Stargate solves this by providing:**

- **Visual Clarity** — A drag-and-drop DAG (Directed Acyclic Graph) editor that makes data flow immediately understandable.
- **Resilience** — A fully decoupled, queue-backed worker architecture that keeps the API responsive even during heavy execution.
- **Observability** — Per-node execution tracking with durations, inputs, outputs, and error traces stored in a relational database.
- **Safety** — Built-in SSRF protections, payload limits, cyclic dependency validation, and global timeout enforcement.

---

## 🧩 Product Overview

### Workspaces
Stargate organizes everything into **Workspaces** — isolated environments where teams can collaborate. Every workspace has an owner and can contain multiple workflows. RBAC enforcement ensures users can only access their own workspace resources.

### Workflow Builder
The heart of Stargate is a **React Flow-powered visual canvas**. Users drag and connect nodes to define their automation logic. Node positions, edge connections, and configurations are persisted in real-time to PostgreSQL.

### Triggers
Workflows can be started in three ways:
- **Manual** — A single click from the UI or a `POST` to the executions API.
- **Webhook** — An inbound HTTP `POST` to a unique webhook URL fires the workflow with the incoming payload as context.
- **Schedule (Cron)** — Standard cron expressions drive time-based automation (e.g., `*/5 * * * *`).

### Execution Engine
When a workflow is triggered, the API **enqueues a job to Redis via BullMQ** and returns `202 Accepted` immediately — never blocking. A dedicated Worker process picks up the job, traverses the DAG topologically, and executes each node in order.

### Conditional Logic (IF Nodes)
`IF` nodes evaluate JavaScript-style expressions (e.g., `response.status === 200`) using an embedded `jexl` expression engine. Edges that pass the condition proceed to execution; failing branches recursively mark their children as `SKIPPED`.

### Queue System
BullMQ provides **persistent job storage in Redis**, automatic retries with exponential backoff (up to 3 attempts), and dead-letter handling. Jobs survive API restarts — work is never lost.

### Observability
Every node execution records a `startedAt`, `completedAt`, and `durationMs` in PostgreSQL. The dashboard aggregates these into workspace-level success rates, average durations, and failure counts. Executions exceeding 5,000ms are automatically flagged as `SLOW`.

---

## ✨ Key Features

### Visual Workflow Construction
| Feature | Details |
|---------|---------|
| Drag-and-drop canvas | React Flow with infinite pan, zoom, and custom node types |
| HTTP nodes | Real `fetch()` requests with configurable method, headers, and body |
| IF conditional nodes | Boolean expression evaluation using `jexl` |
| Variable interpolation | `{{nodeId.body.field}}` syntax resolves prior outputs into downstream configs |
| Edge conditions | Per-edge expression evaluation for branching |
| Resizable bottom panel | Drag-to-resize executions/triggers panel, height persisted to `localStorage` |
| Canvas status bar | Floating node/edge count chip on the canvas |

### Execution & Queue Architecture
| Feature | Details |
|---------|---------|
| Async execution | BullMQ jobs — API never blocks on execution |
| Topological ordering | Kahn's algorithm processes nodes in correct dependency order |
| Retry policy | 3 automatic retries with exponential backoff |
| Global timeout | 300,000ms (5 min) `Promise.race` enforcement per execution |
| Node-level tracking | `QUEUED → RUNNING → SUCCESS / FAILED / SKIPPED` state machine |

### Triggers & Automation
| Feature | Details |
|---------|---------|
| Manual trigger | Instant UI or API-driven execution |
| Webhook trigger | Public inbound URL, accepts any JSON payload as trigger context |
| Cron trigger | Standard cron scheduling via in-process scheduler |

### Authentication & Security
| Feature | Details |
|---------|---------|
| JWT auth | Short-lived access tokens + persisted refresh tokens |
| RBAC | Per-workspace role enforcement (`OWNER` / `MEMBER`) |
| SSRF protection | DNS-resolved IP blocking of loopback, private RFC-1918 ranges, and cloud metadata endpoints |
| Payload limits | 1MB Express middleware limit on all inbound JSON |
| Cycle detection | Topological sort validation rejects cyclic graphs before execution |

### Observability & Dashboard
| Feature | Details |
|---------|---------|
| KPI strip | 4 live metrics — total workflows, active count, execution count, success rate |
| Activity feed | Cross-workflow recent execution feed, grouped by Today/Yesterday/Older |
| Execution history | Full timeline of all runs per workflow with filter pills (All/Success/Failed/Running) |
| Execution summary | "12 total · 10 ✓ · 2 ✗" header in the executions panel |
| Node-level traces | Input, output, error, and duration per node per execution with copy buttons |
| System health endpoint | `/health` checks API, Worker, PostgreSQL, and Redis simultaneously |

### Developer Experience
| Feature | Details |
|---------|---------|
| Command palette | `⌘K` fuzzy search across workflows and actions, keyboard-navigable |
| Import/Export | Full workflow serialization to JSON with UUID remapping on import |
| Monorepo | Turborepo with shared `@stargate/database`, `@stargate/shared`, `@stargate/config` packages |
| Type safety | End-to-end TypeScript with shared Zod schemas |
| Containerized | Docker Compose brings up all 5 services in one command |

---

## 🏗 Architecture

Stargate implements a **microservice-oriented design** ensuring the API Gateway remains non-blocking even during intensive multi-node workflow executions. The API and Worker are independent processes communicating asynchronously via a Redis-backed message queue.

```mermaid
graph TD
    User["👤 User (Browser)"] -->|HTTPS REST| API["🌐 API Gateway\n(Express.js)"]

    subgraph "Core Services"
        API
        Worker["⚙️ Worker Service\n(BullMQ Consumer)"]
        Scheduler["🕐 Scheduler\n(Cron Engine)"]
    end

    subgraph "Infrastructure"
        Redis[("🔴 Redis\n(BullMQ Queue)")]
        DB[("🐘 PostgreSQL\n(Prisma ORM)")]
    end

    API -->|"1. Create Execution\n   (QUEUED)"| DB
    API -->|"2. Dispatch Job"| Redis
    Redis -->|"3. Job Consumed"| Worker
    Worker -->|"4. Mark RUNNING"| DB
    Worker -->|"5. Log Node Results"| DB
    Worker -->|"6. Mark SUCCESS/FAILED"| DB
    Scheduler -->|"Fire Cron Jobs"| API

    style User fill:#6366f1,color:#fff
    style API fill:#1e1b4b,color:#fff
    style Worker fill:#1e1b4b,color:#fff
    style Redis fill:#dc2626,color:#fff
    style DB fill:#1d4ed8,color:#fff
```

---

## 🔄 Workflow Lifecycle

The complete lifecycle of a single workflow execution, from trigger to final state:

```mermaid
stateDiagram-v2
    direction LR
    [*] --> QUEUED : Trigger Fired
    QUEUED --> RUNNING : Worker Picks Up Job
    
    state RUNNING {
        direction TB
        [*] --> EvalNode : Topological Sort
        EvalNode --> ExecHTTP : HTTP Node
        EvalNode --> EvalIF : IF Node
        ExecHTTP --> WriteOutput : Success
        EvalIF --> BranchTrue : TRUE branch
        EvalIF --> BranchFalse : FALSE branch → SKIPPED
        WriteOutput --> NextNode : Resolve Variables
        BranchTrue --> NextNode
        NextNode --> EvalNode : More nodes
        NextNode --> [*] : Graph complete
    }

    RUNNING --> SUCCESS : All nodes resolved
    RUNNING --> FAILED : Node error / Timeout
    SUCCESS --> [*]
    FAILED --> [*]
```

### Execution States
| State | Description |
|-------|-------------|
| `QUEUED` | Job dispatched to Redis, waiting for worker pickup |
| `PENDING` | Node initialized, not yet started |
| `RUNNING` | Node or workflow actively executing |
| `SUCCESS` | Node/workflow completed without errors |
| `FAILED` | Execution error encountered — error message persisted |
| `SKIPPED` | Node bypassed due to failing conditional branch |

---

## 🧠 System Design

### Why Async Queue Architecture?
The core design insight: **workflow execution is unpredictable**. A single workflow might make 10 sequential HTTP calls, each taking 1-2 seconds. Running these synchronously on the API thread would tie up connections, create timeout cascades, and bottleneck the entire system under load.

By dispatching work to BullMQ, the API responds with `202 Accepted` in milliseconds. The Worker processes at its own pace. The API thread remains free to handle dashboard refreshes, new triggers, and other REST operations.

### Variable Resolution Engine
The Worker maintains an `ExecutionContext` — a `Map<nodeId, nodeOutput>` that grows as nodes complete. Before executing any node, the `VariableResolver` scans the node's configuration (URL, headers, body) and replaces `{{nodeId.body.field}}` tokens by traversing the execution context using `lodash.get`.

```
"https://api.example.com/users/{{nodeA.body.userId}}"
                                    ↓  (resolved from nodeA's output)
"https://api.example.com/users/42"
```

### Conditional Branching (DAG Routing)
After each node completes, outgoing edges are evaluated. If an edge has a `condition` expression (e.g., `response.status === 200`), it's evaluated by `jexl` against the current execution context. Edges that fail are set to `false`; their target nodes — and all descendants exclusively downstream of them — are marked `SKIPPED` without executing.

### SSRF Protection
The worker validates every HTTP node URL before executing. It resolves DNS and blocks:
- Known loopback addresses (`127.0.0.1`, `0.0.0.0`, `::1`)
- Cloud metadata endpoint (`169.254.169.254`)
- Internal hostnames (`localhost`, `host.docker.internal`)
- Private IP ranges via CIDR check: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`

Public CDN and cloud IPs (Cloudflare, AWS CloudFront, etc.) are correctly **allowed** — only RFC-1918 private ranges are blocked.

### Database Schema Overview

```mermaid
erDiagram
    User ||--o{ WorkspaceMember : "member of"
    User ||--o{ Workspace : "creates"
    User ||--o{ Workflow : "creates"
    User ||--o{ WorkflowExecution : "triggers"
    
    Workspace ||--o{ WorkspaceMember : "has members"
    Workspace ||--o{ Workflow : "contains"
    
    Workflow ||--o{ Node : "has"
    Workflow ||--o{ Edge : "has"
    Workflow ||--o{ WorkflowExecution : "has"
    Workflow ||--o{ WorkflowTrigger : "has"
    
    WorkflowExecution ||--o{ NodeExecution : "logs"
    WorkflowTrigger ||--o{ TriggerExecution : "records"
    
    Node ||--o{ Edge : "source of"
    Node ||--o{ Edge : "target of"
    Node ||--o{ NodeExecution : "executed as"
```

---

## 📸 Screenshots

<div align="center">

### Authentication — Split Panel Design

<img src="docs/screenshots/auth-split-panel.png" alt="Stargate Login" width="85%" />

*Split-panel auth: feature highlights on the left, glassmorphism form on the right*

---

### Dashboard — KPI Strip + Workflow List + Activity Feed

<img src="docs/screenshots/dashboard-overview.png" alt="Stargate Dashboard" width="85%" />

*4 live KPI metrics with sparkline trends, workflow list with run-history dots, cross-workflow activity feed*

---

### Workflow Editor — Visual DAG Canvas

<img src="docs/screenshots/workflow-editor.png" alt="Workflow Editor" width="85%" />

*React Flow canvas with breadcrumb nav, resizable bottom panel, execution filter pills, canvas status bar, and trigger management*

---

### Command Palette — ⌘K Navigation

<img src="docs/screenshots/command-palette.png" alt="Command Palette" width="85%" />

*Fuzzy search across workflows and actions, full keyboard navigation with ↑↓ Enter Esc*

---

### Execution Detail — Success with Node Timeline

<img src="docs/screenshots/execution-detail-success.png" alt="Execution Detail Success" width="85%" />

*Per-node step timeline with expandable response bodies and copy buttons*

---

### Execution Detail — Failure with SSRF Protection

<img src="docs/screenshots/execution-detail-failed.png" alt="Execution Detail Failed" width="85%" />

*Failed execution showing SSRF protection blocking private IP access, with SKIPPED downstream nodes*

</div>

---

## 🚀 Local Setup

### Prerequisites

| Requirement | Version |
|-------------|---------|
| [Docker & Docker Compose](https://www.docker.com/) | Latest |
| [Node.js](https://nodejs.org/) | 18+ |
| [pnpm](https://pnpm.io/) | 9.0.0+ |

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/Ayush-o1/StarGate.git
cd StarGate
```

**2. Install dependencies:**
```bash
pnpm install
```

**3. Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and set your values:
```env
PORT=3000
DATABASE_URL="postgresql://stargate:password@localhost:5433/stargate_dev?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET="your-secure-secret-here"
JWT_REFRESH_SECRET="your-secure-secret-here"
VITE_API_URL=http://localhost:3000
```

**4. Start all services:**
```bash
docker compose up -d --build
```

This starts: **PostgreSQL** (port 5433), **Redis** (port 6379), **API Gateway** (port 3000), **Worker**, and **Web UI** (port 5173).

**5. Access Stargate:**

| Service | URL |
|---------|-----|
| Frontend UI | http://localhost:5173 |
| API Gateway | http://localhost:3000/api/v1 |
| Health Check | http://localhost:3000/health |

### Verify Setup
```bash
curl http://localhost:3000/health
# Expected: {"api":"healthy","worker":"healthy","redis":"healthy","database":"healthy"}
```

---

## 🛠 Development

### Running Services Locally (without Docker)

```bash
# Start infrastructure only
docker compose up postgres redis -d

# In separate terminals:
pnpm --filter @stargate/api dev       # API Gateway on :3000
pnpm --filter @stargate/worker dev    # Worker (BullMQ consumer)
pnpm --filter @stargate/web dev       # Vite dev server on :5173
```

### Common Commands

```bash
# Build all packages
pnpm build

# Run type checking across monorepo
pnpm typecheck

# Lint all packages
pnpm lint

# Format all files
pnpm format

# Database migrations (from packages/database)
pnpm --filter @stargate/database prisma migrate dev
pnpm --filter @stargate/database prisma studio
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` on API startup | Ensure PostgreSQL and Redis containers are healthy: `docker compose ps` |
| Worker not processing jobs | Check Worker logs: `docker compose logs worker -f` |
| Database migration errors | Reset: `docker compose down -v && docker compose up -d --build` |
| Prisma client not found | Run `pnpm --filter @stargate/database prisma generate` |

---

## 📁 Folder Structure

```
stargate/
├── apps/
│   ├── api/                    # Express.js API Gateway
│   │   └── src/
│   │       ├── controllers/    # Request handlers (auth, workflows, nodes, edges, workspaces)
│   │       ├── middleware/     # Auth guard, error handler
│   │       ├── modules/        # Feature modules (executions, triggers, system)
│   │       └── routes/         # Express router definitions
│   │
│   ├── web/                    # React 18 + Vite Frontend
│   │   └── src/
│   │       ├── components/     # Reusable UI component library
│   │       │   ├── ui/         # Base: Button, Badge, Modal, Toast, Tooltip, etc.
│   │       │   ├── CommandPalette.tsx   # ⌘K fuzzy search palette
│   │       │   ├── KpiStrip.tsx         # Dashboard metrics strip
│   │       │   ├── ActivityFeed.tsx     # Cross-workflow execution feed
│   │       │   ├── CustomNode.tsx       # ReactFlow custom node with status glow
│   │       │   ├── ResizablePanel.tsx   # Drag-to-resize bottom panel
│   │       │   └── CanvasStatusBar.tsx  # Node/edge count overlay
│   │       ├── pages/          # Dashboard, WorkflowDetail, Login, Register
│   │       ├── store/          # Zustand global state stores
│   │       └── lib/            # API client, utilities
│   │
│   └── worker/                 # BullMQ Worker Service
│       └── src/
│           ├── worker.ts               # BullMQ worker initialization & job lifecycle
│           ├── execution.processor.ts  # DAG traversal & node execution engine
│           └── utils/
│               ├── resolver.ts         # Variable interpolation engine
│               └── ssrf.ts             # SSRF protection validator (CIDR-based)
│
├── packages/
│   ├── database/               # Prisma ORM & PostgreSQL schema
│   │   └── prisma/
│   │       └── schema.prisma   # 9 models, 3 enums, full relational schema
│   ├── shared/                 # Shared TypeScript types & Zod schemas
│   └── config/                 # Shared ESLint & TypeScript configurations
│
├── docs/                       # Technical documentation
│   ├── architecture.md         # Deep-dive system architecture
│   ├── SYSTEM_DESIGN.md        # Design decisions & trade-offs
│   ├── EXECUTION_ENGINE.md     # Worker & DAG execution internals
│   ├── OBSERVABILITY.md        # Metrics, health checks, monitoring
│   ├── SECURITY.md             # Auth, SSRF, RBAC, hardening
│   ├── FRONTEND.md             # React architecture & state management
│   ├── CONTRIBUTING.md         # Contribution guidelines
│   ├── RESUME_BULLETS.md       # Resume-ready impact statements
│   └── screenshots/            # Application screenshots
│
├── docker-compose.yml          # 5-service container orchestration
├── turbo.json                  # Turborepo pipeline configuration
└── pnpm-workspace.yaml         # Monorepo workspace definition
```

---

## 🔬 Engineering Highlights

### 1. Decoupled Async Execution Architecture
The API Gateway and Worker are completely independent processes. The API's only responsibility when a workflow is triggered is to validate the graph, create a `WorkflowExecution` record, and enqueue a lightweight job payload (`workflowId`, `executionId`) to Redis. The Worker does all the heavy lifting. This separation means zero execution-related latency bleeds into the API's response times.

### 2. Topological Sort for Correct Execution Order
The Worker implements **Kahn's Algorithm** (BFS-based topological sort) to determine the correct node execution sequence. This handles complex diamond-shaped DAGs where multiple nodes must complete before a downstream node can begin, and correctly detects any cycles that pass API validation.

### 3. Recursive DAG Branch Pruning
When a conditional branch fails, the Worker doesn't just skip the next node — it recursively marks all descendants of that branch as `SKIPPED`. This prevents orphaned nodes from accidentally executing when their required upstream context is missing.

### 4. DNS-Resolved SSRF Protection with CIDR Checking
The SSRF validator resolves DNS to get the actual IP, then performs **CIDR range checking** against RFC-1918 private address space (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) plus loopback. This correctly allows public CDN IPs (Cloudflare, etc.) while still blocking internal infrastructure access — even if a user constructs a URL with a custom domain that resolves to a private IP.

### 5. Atomic Workspace Creation (Prisma Transactions)
When a user creates a workspace, the API uses a **Prisma `$transaction`** to atomically create both the `Workspace` record and the `WorkspaceMember` record (with `OWNER` role). If either operation fails, both roll back — preventing orphaned workspaces with no owner.

### 6. Full Workflow Graph Portability
The Import/Export system performs **deep-copy serialization** with UUID remapping. Each imported node and edge gets a freshly generated UUID while maintaining internal topology references via an in-memory `Map<oldId, newId>`. Workflows can be shared across environments without ID conflicts.

### 7. Premium UI Engineering
The frontend was built to production-grade standards with: a command palette (`⌘K`) with fuzzy search and keyboard navigation, drag-to-resize panels with `localStorage` persistence, animated node execution states, per-node execution timeline with expandable response bodies, run-history sparklines and dot indicators, and a split-panel auth layout.

---

## 🎯 Why This Project Matters

> *For recruiters and hiring managers unfamiliar with workflow orchestration platforms.*

### What Is Workflow Orchestration?
Imagine you need to run this every day at 9 AM: "Call the Stripe API → extract all new customers → for each customer, call your internal CRM to create a contact → if the CRM returns 201, send a Slack notification." 

Doing this manually is tedious. Hardcoding it into a script is brittle and impossible to monitor. **Workflow orchestration** is the engineering discipline of building systems that define, execute, and track these multi-step automated pipelines reliably.

### Why This Is Technically Challenging

| Challenge | Stargate's Solution |
|-----------|---------------------|
| **Distributed systems** — How do you execute work without blocking the main server? | Asynchronous queue architecture (BullMQ + Redis) decouples ingestion from execution |
| **Graph algorithms** — How do you determine execution order with dependencies? | Kahn's topological sort algorithm traverses the DAG correctly |
| **State management** — How do you pass data between steps? | A live `ExecutionContext` map with a templating resolver (`{{node.body.id}}`) |
| **Conditional logic** — How do you branch based on results? | `jexl` expression engine evaluates conditions; failing branches are recursively pruned |
| **Security** — What stops users from scanning internal infrastructure? | DNS-resolved SSRF blocking with CIDR range validation prevents weaponizing the worker |
| **Reliability** — What happens if the server crashes mid-execution? | BullMQ persists jobs in Redis — unfinished work is retried on restart |
| **Observability** — How do you know what went wrong? | Every node execution writes start time, end time, input, output, and errors to PostgreSQL |

This project demonstrates proficiency in **distributed systems design**, **graph algorithms**, **queue-based architectures**, **REST API design**, **relational database modeling**, **security hardening**, and **full-stack TypeScript development** — all applied to a real, working product.

---

## 🛣 Future Roadmap

| Feature | Description |
|---------|-------------|
| **Per-tenant Worker Queues** | Isolate execution pools per workspace to prevent noisy-neighbor interference |
| **Plugin Node Architecture** | Dynamic `integrations/` folder allowing community-contributed node types without touching core worker logic |
| **Workflow Versioning** | Immutable graph snapshots preventing destructive edits to in-flight workflows |
| **Role Differentiation** | Viewer, Editor, and Admin permission tiers within workspaces |
| **Native OAuth Integrations** | Pre-built nodes for Slack, Stripe, GitHub, and Jira using OAuth2 |
| **Retry Policies (Node-Level)** | Configurable exponential backoff per node type, not just per workflow |
| **WebSocket Live Updates** | Replace polling with Redis Pub/Sub → WebSocket for real-time execution status |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with TypeScript, React, Node.js, PostgreSQL, Redis, and BullMQ.</sub><br/>
  <sub>Designed for precision, resilience, and observability.</sub>
</div>
