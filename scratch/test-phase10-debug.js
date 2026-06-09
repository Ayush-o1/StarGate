
const API_BASE = 'http://localhost:3000/api/v1';

async function seedUserAndWorkspace() {
  const email = `test-phase10-${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', name: 'Phase 10 Tester' })
  });
  const registerData = await registerRes.json();
  const token = registerData.token;

  const wsRes = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Phase 10 Workspace' })
  });
  const wsData = await wsRes.json();
  return { token, workspaceId: wsData.id };
}

async function runTests() {
  try {
    const { token, workspaceId } = await seedUserAndWorkspace();
    console.log('User and workspace created');

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // Create workflow
    const wfRes = await fetch(`${API_BASE}/workflows/workspace/${workspaceId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Phase 10 Test Workflow', description: 'Testing branching' })
    });
    const wf = await wfRes.json();
    console.log('Workflow created:', wf);

  } catch (err) {
    console.error('Test failed:', err);
  }
}

runTests();
