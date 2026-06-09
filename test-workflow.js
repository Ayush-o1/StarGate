const http = require('http');

async function run() {
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
  });
  if (!loginRes.ok) {
    await fetch('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123', name: 'Test User' })
    });
  }
  const tokenRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
  });
  const { accessToken } = await tokenRes.json();

  const wsRes = await fetch('http://localhost:3000/api/v1/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ name: 'Test Workspace' })
  });
  const ws = await wsRes.json();
  console.log("Workspace:", ws);

  const wfRes = await fetch(`http://localhost:3000/api/v1/workflows/workspace/${ws.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({ name: 'Test Workflow' })
  });
  console.log('Workflow Creation Status:', wfRes.status);
  console.log('Workflow Data:', await wfRes.text());
}
run();
