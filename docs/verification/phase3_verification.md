# Phase 3 – Verification Checklist

The following is the exhaustive verification checklist required to declare Phase 3 complete. Do not assume success until every step yields a `PASS`.

---

## 1. Browser Verification Checklist
These checks ensure the frontend handles state and UI interactions correctly.

### Check 1.1: Empty State Rendering
* **Action:** Navigate to `http://localhost:5173/dashboard` with a newly registered user.
* **Expected Result:** The UI displays a placeholder indicating "You don't belong to any workspaces yet" and a button to create one.
* **PASS/FAIL Criteria:** PASS if the empty state is clearly visible and the Create button works. FAIL if it attempts to render a broken list or crashes.

### Check 1.2: Workspace Creation Modal
* **Action:** Click "Create your first workspace". Enter Name: "Test Web App", Description: "Testing Phase 3". Click "Create Workspace".
* **Expected Result:** The modal closes. The Dashboard immediately displays "Test Web App" in the workspaces list without requiring a page refresh.
* **PASS/FAIL Criteria:** PASS if the workspace appears instantly with the "OWNER" tag. FAIL if the UI does not update or throws an error.

### Check 1.3: Workspace Switcher Dropdown
* **Action:** Click the "Select Workspace" dropdown in the top navigation bar.
* **Expected Result:** "Test Web App" appears in the dropdown list. Clicking it changes the active workspace state.
* **PASS/FAIL Criteria:** PASS if the dropdown populates correctly and allows selection. FAIL if the dropdown is empty or broken.

### Check 1.4: State Persistence (Zustand)
* **Action:** Refresh the page (`Cmd + R` / `Ctrl + R`).
* **Expected Result:** The application automatically re-fetches workspaces from the API and retains the previously selected active workspace (or defaults to the first one).
* **PASS/FAIL Criteria:** PASS if the workspaces list populates correctly after refresh. FAIL if workspaces disappear or cause a blank screen.

---

## 2. API Verification Checklist
These checks ensure the Express API enforces logical and security constraints. 
*(Prerequisite: Obtain an `access_token` from `/api/v1/auth/login`)*

### Check 2.1: Unauthorized Access Blocking
* **Command:** 
  ```bash
  curl -X GET http://localhost:3000/api/v1/workspaces -H "Authorization: Bearer INVALID_TOKEN"
  ```
* **Expected Result:** HTTP Status `403 Forbidden` or `401 Unauthorized`.
* **PASS/FAIL Criteria:** PASS if the request is rejected. FAIL if any data is returned.

### Check 2.2: List Workspaces
* **Command:**
  ```bash
  curl -X GET http://localhost:3000/api/v1/workspaces -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
  ```
* **Expected Result:** HTTP Status `200 OK` with a JSON array of workspaces belonging to the user.
* **PASS/FAIL Criteria:** PASS if the list contains the correct items and includes the `role` property (e.g., `OWNER`). FAIL if the response is empty when it shouldn't be or lacks role metadata.

### Check 2.3: Update Workspace (Owner Permission)
* **Command:**
  ```bash
  curl -X PUT http://localhost:3000/api/v1/workspaces/<WORKSPACE_ID> \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
  ```
* **Expected Result:** HTTP Status `200 OK` with the updated JSON payload.
* **PASS/FAIL Criteria:** PASS if the database and response reflect the new name. FAIL if it returns an error or fails to update.

### Check 2.4: Delete Workspace (Owner Permission)
* **Command:**
  ```bash
  curl -X DELETE http://localhost:3000/api/v1/workspaces/<WORKSPACE_ID> \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
  ```
* **Expected Result:** HTTP Status `204 No Content`.
* **PASS/FAIL Criteria:** PASS if the request succeeds and subsequent GET requests no longer return the workspace. FAIL if it throws a 500 error or does not delete the entity.

---

## 3. Database Verification Checklist
These checks ensure Prisma transactions and schema relations are intact inside PostgreSQL.

### Check 3.1: Workspace Entity Creation
* **Command:**
  ```bash
  docker exec -it stargate-postgres-1 psql -U stargate -d stargate_dev -c 'SELECT id, name, "createdById" FROM "Workspace";'
  ```
* **Expected Result:** A table displaying the newly created workspace ID, Name, and the UUID of the user who created it.
* **PASS/FAIL Criteria:** PASS if rows exist and accurately match the API requests. FAIL if the table is empty.

### Check 3.2: Workspace Member (Role Assignment)
* **Command:**
  ```bash
  docker exec -it stargate-postgres-1 psql -U stargate -d stargate_dev -c 'SELECT "workspaceId", "userId", role FROM "WorkspaceMember";'
  ```
* **Expected Result:** A table linking the `workspaceId` to the `userId` with the exact role string `OWNER`.
* **PASS/FAIL Criteria:** PASS if the join table correctly assigns ownership. FAIL if the role is missing, incorrect, or the record wasn't created alongside the Workspace.

---

## 4. Human Verification Checklist
These are the manual actions the QA engineer must physically perform.

1. **[ ] Registration Flow:** Register a new account. Ensure the Dashboard loads successfully.
2. **[ ] Empty State Validation:** Confirm the UI invites the user to create a workspace rather than displaying an empty table.
3. **[ ] Workspace Creation:** Create 2 distinct Workspaces. Ensure both appear in the UI list.
4. **[ ] Workspace Switcher:** Verify that selecting the second workspace from the top navigation dropdown highlights it as the active workspace.
5. **[ ] API Security (Cross-User):** 
   - Register User A, create Workspace A. 
   - Register User B.
   - Attempt to fetch Workspace A's ID using User B's authentication token via curl or Postman.
   - Verify it returns `403 Forbidden`.

---

# Interview Talking Points generated by Phase 3

When discussing this phase in an interview, focus on the following engineering decisions:

1. **Atomic Transactions for Data Integrity (Database/Backend)**
   - *"When a user creates a Workspace, they must simultaneously be granted the `OWNER` role. I utilized Prisma's `$transaction` API to ensure that both the `Workspace` and `WorkspaceMember` records are created atomically. If the membership creation fails, the workspace creation rolls back, completely eliminating the risk of orphaned workspaces."*

2. **Role-Based Access Control (Security/Architecture)**
   - *"I architected a scalable RBAC model using a `WorkspaceMember` junction table. Instead of hardcoding permissions onto the user entity, authorization is scoped dynamically per-workspace. The API strictly verifies that the active session's `userId` has the required `OWNER` role for mutation operations (PUT/DELETE), ensuring tenant isolation."*

3. **Optimistic UI and Global State Management (Frontend/React)**
   - *"I used Zustand for global state management to lift the workspace context out of individual components. When a user creates a new workspace, the store optimistically updates the local state and automatically sets the new workspace as the active context, avoiding redundant API roundtrips and providing a snappy, immediate user experience."*
