# Stargate Final Manual QA Guide

This document is the definitive end-to-end manual testing guide for the Stargate platform. It contains every command, API endpoint, SQL query, and UI screen needed to verify that the system works as intended.

---

## SECTION 1 — ENVIRONMENT CHECK

**Objective:** Verify that all 5 Docker containers are running and healthy.

**Commands to run:**
```bash
# Check container status
docker compose ps
```
**Expected Output:** You should see `stargate-postgres-1`, `stargate-redis-1`, `stargate-api-1`, `stargate-worker-1`, and `stargate-web-1` with status `Up`.

```bash
# Verify API Logs
docker logs stargate-api-1 --tail 50
```
**Expected Output:** `[stargate-api] Server running on port 3000`

```bash
# Verify Worker Logs
docker logs stargate-worker-1 --tail 50
```
**Expected Output:** `[Worker] Connecting to Redis at redis:6379`

```bash
# Verify Redis Connectivity
docker exec -it stargate-redis-1 redis-cli ping
```
**Expected Output:** `PONG`

```bash
# Verify System Health Endpoint
curl -s http://localhost:3000/health
```
**Expected Output:** `{"api":"healthy","worker":"healthy","redis":"healthy","database":"healthy"}`

**Pass / Fail Criteria:**
- **PASS:** All commands return the expected output without errors.
- **FAIL:** Any container is exited, logs show connection refused, or health endpoint shows "unhealthy".

---

## SECTION 2 — AUTHENTICATION

**Objective:** Verify user registration and JWT session generation.

**Manual Steps:**
1. Open `http://localhost:5173` in your browser.
2. Click "Create an account" (or equivalent registration flow).
3. Enter name, email (e.g., `test@example.com`), and password.
4. Click Register.
5. Logout using the user profile menu.
6. Login again with the exact same credentials.

**Expected Behavior:**
- Registration redirects immediately to the Dashboard view.
- Logout successfully drops the session and returns to the login screen.
- Login successfully grants access to the Dashboard again.

**Pass / Fail Criteria:**
- **PASS:** Seamless transitions between states. Refreshing the dashboard stays logged in (verifying token refresh).
- **FAIL:** 401 errors, stuck on login screen, or dashboard flashing and forcing a logout.

---

## SECTION 3 — WORKSPACE MANAGEMENT

**Objective:** Verify RBAC, workspace isolation, and state persistence.

**Manual Steps:**
1. From the Dashboard, click "Create Workspace".
2. Name it "QA Workspace".
3. Switch to it using the top navigation workspace dropdown.
4. Rename the workspace via settings (if UI available).
5. Refresh the browser page.

**SQL Verification:**
```sql
-- Run inside postgres container: docker exec -it stargate-postgres-1 psql -U stargate -d stargate_dev
SELECT id, name, "createdById" FROM "Workspace" WHERE name = 'QA Workspace';
SELECT "workspaceId", role FROM "WorkspaceMember";
```

**Expected Output:**
- **UI:** Workspace is created, selectable, and persists as the active workspace after a page refresh.
- **SQL:** A record in `Workspace` exists. A corresponding record in `WorkspaceMember` shows the role `OWNER`.

**Pass / Fail Criteria:**
- **PASS:** Workspace appears in UI, SQL confirms `OWNER` role attachment.
- **FAIL:** Workspace disappears on refresh, or missing `WorkspaceMember` record.

---

## SECTION 4 — WORKFLOW MANAGEMENT

**Objective:** Verify workflow CRUD operations.

**Manual Steps:**
1. In "QA Workspace", click "Create Workflow".
2. Name it "Test Flow".
3. Click on the workflow card to open the visual canvas.
4. Return to the dashboard and click "Delete" on the workflow.

**Database Verification:**
```sql
SELECT id, name, "workspaceId", "isActive" FROM "Workflow" WHERE name = 'Test Flow';
```

**Expected Output:**
- **UI:** Creating and opening the workflow transitions smoothly. Deleting removes it from the list immediately.
- **SQL:** Record is created, then subsequently removed completely after deletion (no orphans).

**Pass / Fail Criteria:**
- **PASS:** UI accurately reflects DB state.
- **FAIL:** Workflows fail to delete, or opening the canvas crashes the UI.

---

## SECTION 5 — NODE SYSTEM

**Objective:** Verify the visual builder and node configuration parameters.

**Manual Steps:**
1. Create a new workflow "Node Test Flow" and open the canvas.
2. Drag an "HTTP Request" node onto the canvas from the "Add Node" dropdown.
3. Click the node to open the configuration modal/sidebar.
4. Set Method to `GET` and URL to `https://jsonplaceholder.typicode.com/todos/1`.
5. Drag an "IF Logic" node onto the canvas.
6. Connect the HTTP node handle to the IF node handle.

**Expected UI Visuals:**
- Smooth dragging, edge connections snap to node handles clearly.
- Sidebar reflects the active selected node properties.
- No React re-render freezing or lag.

**Pass / Fail Criteria:**
- **PASS:** Nodes are created, configured, and connected seamlessly.
- **FAIL:** Edges won't connect, or configuration sidebar doesn't update on node selection.

---

## SECTION 6 — TRIGGERS

**Objective:** Verify trigger creation and configuration.

**Manual Steps:**
1. Open the Triggers panel in your test workflow.
2. Add a **Manual Trigger**.
3. Add a **Webhook Trigger** (copy the generated URL path).
4. Add a **Schedule Trigger** (Set Cron to: `*/5 * * * *`).

**Verification Commands:**
```bash
# Test Manual Trigger (Replace IDs and Token)
curl -X POST http://localhost:3000/api/v1/executions/workflow/<WORKFLOW_ID> -H "Authorization: Bearer <TOKEN>"

# Test Webhook Trigger (Replace WEBHOOK_PATH)
curl -X POST http://localhost:3000/api/v1/webhooks/<WEBHOOK_PATH> -H "Content-Type: application/json" -d '{"test": true}'
```

**SQL Verification:**
```sql
SELECT type, enabled, "webhookPath", cron FROM "WorkflowTrigger" WHERE "workflowId" = '<WORKFLOW_ID>';
```

**Expected Output:**
- API curl commands return `202 Accepted`.
- SQL shows exactly 3 trigger rows with correct enum types (`MANUAL`, `WEBHOOK`, `SCHEDULE`).

**Pass / Fail Criteria:**
- **PASS:** All triggers configure properly and APIs accept the requests.
- **FAIL:** Webhook returns 404 or Cron fails to save.

---

## SECTION 7 — EXECUTION ENGINE

**Objective:** Verify asynchronous execution via BullMQ.

**Manual Steps:**
1. Ensure your workflow has an HTTP node: `GET https://jsonplaceholder.typicode.com/posts/1`
2. Click "Run / Execute Workflow" in the UI.
3. Open the "Executions" details panel.

**SQL Verification:**
```sql
SELECT id, status, "durationMs" FROM "WorkflowExecution" ORDER BY "createdAt" DESC LIMIT 1;
SELECT "nodeId", status, "durationMs" FROM "NodeExecution" ORDER BY "createdAt" DESC LIMIT 1;
```

**Expected Output:**
- **UI:** Status indicator shows `QUEUED` → `RUNNING` → `SUCCESS`.
- **SQL:** `WorkflowExecution` and `NodeExecution` rows show `SUCCESS` status and a populated `durationMs`.

**Pass / Fail Criteria:**
- **PASS:** End-to-end execution completes and persists successfully.
- **FAIL:** Execution stays stuck in `QUEUED`, or worker container crashes.

---

## SECTION 8 — HTTP POST EXECUTION

**Objective:** Verify complex HTTP payloads and body execution.

**Manual Steps:**
1. Create a new HTTP node.
2. Set Method: `POST`
3. Set URL: `https://jsonplaceholder.typicode.com/posts`
4. Set Body: `{"title": "foo", "body": "bar", "userId": 1}`
5. Run the workflow.

**SQL Verification:**
```sql
SELECT output->>'status' as status, output->'body' as body FROM "NodeExecution" ORDER BY "createdAt" DESC LIMIT 1;
```

**Expected Output:**
- SQL returns status `201` and the JSONPlaceholder response echoing the payload confirming it was received successfully.

**Pass / Fail Criteria:**
- **PASS:** Node execution succeeds and captures the 201 response.
- **FAIL:** 400 errors, malformed JSON payloads, or missing Content-Type headers.

---

## SECTION 9 — CONDITIONAL BRANCHING

**Objective:** Verify DAG routing, Jexl parsing, and branch pruning.

**Manual Steps:**
1. Node 1: HTTP GET `https://jsonplaceholder.typicode.com/posts/1`
2. Node 2: IF Node with condition: `response.status === 200`
3. Node 3: HTTP GET (connects to IF `TRUE` branch)
4. Node 4: HTTP GET (connects to IF `FALSE` branch)
5. Execute workflow.

**SQL Verification:**
```sql
SELECT "nodeId", status FROM "NodeExecution" WHERE "workflowExecutionId" = '<EXEC_ID>';
```

**Expected Output:**
- **UI & SQL:** Node 1 (`SUCCESS`), Node 2 (`SUCCESS`), Node 3 (`SUCCESS`), Node 4 (`SKIPPED`).
- **Inverse Test:** Change condition to `response.status === 404`. Run again. Node 3 (`SKIPPED`), Node 4 (`SUCCESS`).

**Pass / Fail Criteria:**
- **PASS:** Branches correctly prune unselected paths recursively.
- **FAIL:** Both branches execute, or whole workflow fails abruptly.

---

## SECTION 10 — VARIABLE RESOLUTION

**Objective:** Verify data passing between nodes using templating.

**Manual Steps:**
1. Node A (HTTP): `GET https://jsonplaceholder.typicode.com/todos/1`
2. Node B (HTTP): `GET https://jsonplaceholder.typicode.com/posts/{{nodeA.body.id}}` (Assuming Node A's ID is 'nodeA')
3. Run workflow.

**SQL Verification:**
```sql
SELECT input->>'url' as resolved_url, output->>'url' as final_url FROM "NodeExecution" WHERE "nodeId" = '<NODE_B_ID>';
```

**Expected Result:**
- **UI:** Node B's execution details show the URL resolved to `.../posts/1`.
- Node B executes successfully against the resolved URL.

**Pass / Fail Criteria:**
- **PASS:** Variables hydrate correctly using the `lodash.get` context execution.
- **FAIL:** Variables remain unparsed strings (`{{...}}`) or resolve to `undefined`.

---

## SECTION 11 — SSRF PROTECTION

**Objective:** Verify security hardening against internal network scanning.

**Manual Steps:**
1. Create an HTTP Node targeting `http://localhost:3000` or `http://127.0.0.1`.
2. Run workflow.

**SQL Verification:**
```sql
SELECT status, error FROM "NodeExecution" ORDER BY "createdAt" DESC LIMIT 1;
```

**Expected Output:**
- **UI & SQL:** Node status is `FAILED`. Error message explicitly states "SSRF blocked: Host/IP is forbidden."

**Pass / Fail Criteria:**
- **PASS:** Worker immediately rejects the execution with an SSRF error.
- **FAIL:** Worker hangs, or successfully hits the local endpoint.

---

## SECTION 12 — IMPORT / EXPORT

**Objective:** Verify workflow serialization and UUID regeneration.

**Manual Steps:**
1. Open any built workflow and click "Export JSON".
2. Switch to a completely different workspace.
3. Click "Import JSON" and upload the file.

**Expected Behavior:**
- The new workflow renders on the canvas mirroring the original topology exactly.
- Nodes, Edges, and Configurations are restored.
- Triggers (if exported) are restored.
- Executing the imported workflow works immediately without duplicate ID errors.

**Pass / Fail Criteria:**
- **PASS:** Graph renders perfectly and operates independently.
- **FAIL:** Graph is empty, edges fail to map, or database constraint SQL errors occur.

---

## SECTION 13 — OBSERVABILITY

**Objective:** Verify metrics, duration tracking, and health endpoints.

**Manual Steps:**
1. View the Dashboard metrics panel.
2. Run a few successful and failed workflows.
3. Observe the metrics update (success rate, counts, average durations).

**Commands & SQL:**
```bash
# Verify metrics endpoint
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/v1/system/metrics/workspace/<WORKSPACE_ID>
```

```sql
# Verify aggregations natively
SELECT COUNT(*) as total, SUM(CASE WHEN status='SUCCESS' THEN 1 ELSE 0 END) as successes, AVG("durationMs") FROM "WorkflowExecution" WHERE "workspaceId" = '<WORKSPACE_ID>';
```

**Expected Outputs:**
- API and UI metrics exactly match the database aggregations.
- Health endpoint correctly queries Redis, DB, API, and Worker limits.
- Retry count tracks BullMQ attempts on failure.

---

## SECTION 14 — PHASE 1–4 UI MODERNIZATION

**Objective:** Verify frontend aesthetics, layout, and user experience.

**Manual Verifications:**
- **Design System:** Confirm global use of modern typography (Inter/Roboto).
- **Dark Mode:** Verify contrast, glassmorphism elements, and readability.
- **Components:** Check buttons, dropdowns, modals, and cards for uniform padding and states.
- **Feedback:** Trigger toasts on success/error; ensure they dismiss smoothly.
- **Execution Panel:** Verify clear status badges (green/red/yellow) and duration metrics.
- **Motion System:** Drag nodes and panels to verify stutter-free animations.

**Expected Visual Result:**
- Professional, high-contrast, stutter-free interface equivalent in feel to premium platforms like Vercel or Linear.

**Pass / Fail Criteria:**
- **PASS:** Smooth animations, clean alignment, readable UI.
- **FAIL:** Broken CSS, unstyled native browser alerts, text overflow.

---

## SECTION 15 — DATABASE AUDIT

**Objective:** Verify schema integrity natively.

**SQL Verification Queries:**
Execute the following to ensure all cascading relations are acting appropriately:

```sql
-- Workspaces
SELECT * FROM "Workspace";
SELECT * FROM "WorkspaceMember";

-- Workflows
SELECT id, name, "workspaceId", status FROM "Workflow";
SELECT id, type, config FROM "Node";
SELECT id, "sourceNodeId", "targetNodeId", condition FROM "Edge";
SELECT type, "webhookPath", cron FROM "WorkflowTrigger";

-- Executions
SELECT id, status, "errorMessage", "durationMs", "retryCount" FROM "WorkflowExecution";
SELECT "nodeId", status, input, output, error, "durationMs" FROM "NodeExecution";
```

**Expected Outputs:**
- All foreign keys correctly link without orphans.
- JSON fields (`config`, `input`, `output`) are properly formatted objects, not escaped strings.
- `durationMs` and timestamps (`startedAt`, `completedAt`) are fully populated for finished executions.

---

## SECTION 16 — FINAL AUDIT

### FINAL PASS CHECKLIST

Print this out or use it to formally mark completion.

- [ ] **Infrastructure** (Docker, Services run independently)
- [ ] **Authentication** (JWT generation, Refresh flow)
- [ ] **Workspaces** (RBAC enforcement, CRUD)
- [ ] **Workflows** (React Flow Builder, Canvas Persistence)
- [ ] **Nodes** (Sidebars, Configuration, Coordinate Position)
- [ ] **Triggers** (Manual dispatch, Webhook listener, Cron scheduler)
- [ ] **Queue** (Redis connection, BullMQ processing)
- [ ] **Worker** (Job processing, Exponental retries)
- [ ] **HTTP Execution** (Outbound network requests, Headers, Body)
- [ ] **Conditional Logic** (IF branches, Jexl eval, Skips)
- [ ] **Variables** (Templating hydration via lodash context)
- [ ] **SSRF** (Localhost / IP blocking)
- [ ] **Import Export** (Deep copy, UUID Remapping)
- [ ] **Observability** (Metrics calculations, Health checks, Durations)
- [ ] **UI** (Aesthetics, Toasts, Responsive feedback)
- [ ] **Documentation** (Accuracy, Readme, Architecture, Complete guide)
