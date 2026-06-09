const { execSync } = require('child_process');

const API = 'http://localhost:3000/api/v1';

async function run() {
  const getEdgeCount = () => {
    const res = execSync(`docker exec stargate-postgres-1 psql -U stargate -d stargate_dev -t -c 'SELECT COUNT(*) FROM "Edge";'`).toString().trim();
    return parseInt(res, 10);
  };

  const initialCount = getEdgeCount();
  console.log(`[DB] Initial Edge Count: ${initialCount}`);

  // Register & Login
  const email = `test-${Date.now()}@example.com`;
  await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password', name: 'Tester' }) });
  
  let res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password' }) });
  const auth = await res.json();
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.tokens.accessToken}` };

  // Create Workspace
  res = await fetch(`${API}/workspaces`, { method: 'POST', headers, body: JSON.stringify({ name: 'Test WS' }) });
  const ws = await res.json();

  // Create Workflow
  res = await fetch(`${API}/workflows/workspace/${ws.id}`, { method: 'POST', headers, body: JSON.stringify({ name: 'E2E Workflow' }) });
  const wf = await res.json();

  // Add Nodes
  res = await fetch(`${API}/nodes/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ type: 'http', label: 'Node A' }) });
  const nodeA = await res.json();
  res = await fetch(`${API}/nodes/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ type: 'script', label: 'Node B' }) });
  const nodeB = await res.json();

  // Connect Nodes
  res = await fetch(`${API}/edges/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: nodeA.id, targetNodeId: nodeB.id }) });
  const edge = await res.json();

  // Check DB count after create
  const afterCreateCount = getEdgeCount();
  console.log(`[DB] Edge Count after create: ${afterCreateCount}`);
  if (afterCreateCount === initialCount + 1) {
    console.log(`[Pass] Edge Persistence`);
  } else {
    console.log(`[Fail] Edge Persistence`);
  }

  // Refresh
  res = await fetch(`${API}/edges/workflow/${wf.id}`, { headers });
  const edges = await res.json();
  if (edges.length === 1 && edges[0].id === edge.id) {
    console.log(`[Pass] Refresh Persistence`);
  } else {
    console.log(`[Fail] Refresh Persistence`);
  }

  // Run Workflow
  res = await fetch(`${API}/workflows/${wf.id}/run`, { method: 'POST', headers });
  const exec = await res.json();
  if (exec.id) {
    console.log(`[Pass] Workflow Execution`);
  } else {
    console.log(`[Fail] Workflow Execution`);
  }

  // Delete Edge
  res = await fetch(`${API}/edges/${edge.id}`, { method: 'DELETE', headers });
  if (res.status === 204) {
    const finalCount = getEdgeCount();
    console.log(`[DB] Final Edge Count: ${finalCount}`);
    if (finalCount === initialCount) {
      console.log(`[Pass] Delete Verification`);
    } else {
      console.log(`[Fail] Delete Verification`);
    }
  } else {
    console.log(`[Fail] Delete Request Failed`);
  }
}

run().catch(console.error);
