const { execSync } = require('child_process');

const API = 'http://localhost:3000/api/v1';

async function run() {
  const email = `test-${Date.now()}@example.com`;
  await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password', name: 'Tester' }) });
  
  let res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password' }) });
  const auth = await res.json();
  console.log('Auth:', auth);

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.tokens?.accessToken}` };

  res = await fetch(`${API}/workspaces`, { method: 'POST', headers, body: JSON.stringify({ name: 'Test WS' }) });
  const ws = await res.json();
  console.log('Workspace:', ws);

  res = await fetch(`${API}/workflows/workspace/${ws.id}`, { method: 'POST', headers, body: JSON.stringify({ name: 'E2E Workflow' }) });
  const wf = await res.json();

  res = await fetch(`${API}/nodes/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ type: 'http', label: 'Node A' }) });
  const nodeA = await res.json();
  res = await fetch(`${API}/nodes/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ type: 'script', label: 'Node B' }) });
  const nodeB = await res.json();

  console.log('Nodes:', nodeA.id, nodeB.id);

  res = await fetch(`${API}/edges/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: nodeA.id, targetNodeId: nodeB.id }) });
  const edge = await res.text();
  console.log(`[API] Created Edge Status: ${res.status}, Response:`, edge);
}

run().catch(console.error);
