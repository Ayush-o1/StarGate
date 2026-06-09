# Stargate Architecture

This document describes the high-level system design, data flow, and microservice responsibilities of the Stargate platform.

---

## High-Level Architecture

Stargate is built on a scalable, decoupled architecture where the API Gateway and the Execution Worker operate as independent microservices. They communicate asynchronously via a Redis-backed message queue, while sharing state through a centralized PostgreSQL database.

```mermaid
graph TD
    Client["Client (React SPA)"] -->|REST| API["API Gateway (Express)"]
    
    subgraph Core
        API
        Worker["Worker Service (Node.js)"]
    end
    
    subgraph Data Layer
        DB[(PostgreSQL)]
        Redis[(Redis)]
    end
    
    API -->|Read/Write State| DB
    API -->|Enqueue Job| Redis
    Worker <-->|Consume & Acknowledge| Redis
    Worker -->|Update Execution State| DB
```

---

## Frontend Architecture
**Tech Stack:** React, TypeScript, Zustand, React Flow, Vite, TailwindCSS

The frontend serves as the presentation layer. It manages the visual canvas state locally using `React Flow` and synchronizes structurally with the backend using debounced REST requests.

```mermaid
flowchart LR
    UI[Components] --> Store[Zustand Store]
    Store --> API_Lib[API Client / Fetch]
    API_Lib -.-> API_Gateway[Backend API]
    
    ReactFlow[Canvas UI] <--> Store
```
- **Zustand** is utilized for lightweight global state (Auth, Workspaces, Workflows, Execution Polling).
- **React Flow** manages node positions, edge connections, and canvas pan/zoom interactions.

---

## Backend Architecture (API Gateway)
**Tech Stack:** Express.js, TypeScript, Prisma ORM, Zod

The API Gateway is responsible for CRUD operations, authentication, webhook ingestion, and workflow validation. It does *not* execute workflows synchronously.

**Key Responsibilities:**
1. Validating acyclic graphs (Topological Sort).
2. Authenticating users via JWT and RBAC.
3. Managing Prisma schema mappings.
4. Enqueueing verified workflow executions to BullMQ.

---

## Worker Architecture (Execution Engine)
**Tech Stack:** BullMQ, Node.js, `jexl`, `lodash`

The Worker is a headless background process that constantly polls Redis for jobs.

**Key Responsibilities:**
1. Hydrating workflow graphs from PostgreSQL.
2. Managing the `ExecutionContext` (Variable Interpolation).
3. Routing execution based on edge conditionals.
4. Executing raw HTTP network requests safely.
5. Updating `WorkflowExecution` and `NodeExecution` statuses in real-time.

---

## Redis / BullMQ Data Flow

```mermaid
sequenceDiagram
    participant API as API Gateway
    participant Redis as Redis (BullMQ)
    participant Worker as Execution Worker
    participant DB as PostgreSQL
    
    API->>DB: 1. Create WorkflowExecution (PENDING)
    API->>Redis: 2. Job.add(executionId)
    Redis-->>Worker: 3. Job Picked Up
    Worker->>DB: 4. Mark WorkflowExecution (RUNNING)
    
    loop Per Node
        Worker->>Worker: 5. Evaluate Variables & Conditions
        Worker->>ExternalAPI: 6. Execute Node Task
        Worker->>DB: 7. Log NodeExecution (SUCCESS/FAILED)
    end
    
    Worker->>DB: 8. Mark WorkflowExecution (SUCCESS)
    Worker->>Redis: 9. Job.completed()
```

---

## Branching Logic & Variable Resolution Flow

### Conditional Branching (DAG Routing)
Workflows are represented as Directed Acyclic Graphs (DAGs). When a node completes, the worker evaluates outgoing edges.
If the edge contains a `condition` (e.g., `status === 200`), the worker evaluates it against the Node's output.
- **TRUE:** The target node is added to the execution queue.
- **FALSE:** The target node, and all subsequent children exclusively attached to it, are marked `SKIPPED`.

### Variable Resolution
Before evaluating conditions or executing an HTTP node, the worker runs the `VariableResolver`.
It scans the node's `config` (URLs, headers, JSON body) for interpolation markers: `{{node123.body.userId}}`.
It replaces these tokens natively by querying the hydrated `ExecutionContext` (a Map of all previously completed node outputs in the current workflow instance).

```mermaid
graph LR
    Context["ExecutionContext (Map)"] -->|Injects| Resolver["Variable Resolver"]
    Config["Raw Config: {{id}}"] --> Resolver
    Resolver -->|Produces| Exec["Execution Engine: 123"]
```

---

## Database Schema (Abridged)

```mermaid
erDiagram
    WORKFLOW ||--o{ NODE : contains
    WORKFLOW ||--o{ EDGE : contains
    WORKFLOW ||--o{ WORKFLOW_EXECUTION : has
    WORKFLOW_EXECUTION ||--o{ NODE_EXECUTION : logs
    
    WORKFLOW {
        string id
        string name
        boolean isActive
    }
    NODE {
        string id
        string type
        json config
    }
    EDGE {
        string sourceNodeId
        string targetNodeId
        string condition
    }
```
