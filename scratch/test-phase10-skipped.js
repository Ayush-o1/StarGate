const API_BASE = 'http://localhost:3000/api/v1';

async function runTests() {
  try {
    const email = `test-phase10-skipped-${Date.now()}@example.com`;
    const registerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', name: 'Tester' })
    });
    const { tokens } = await registerRes.json();
    const token = tokens.accessToken;

    const wsRes = await fetch(`${API_BASE}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Phase 10 Workspace' })
    });
    const wsData = await wsRes.json();
    const workspaceId = wsData.id;

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const wfRes = await fetch(`${API_BASE}/workflows/workspace/${workspaceId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Phase 10 SKIPPED Test', description: '' })
    });
    const wf = await wfRes.json();

    // 1. Initial HTTP Request
    const node1Res = await fetch(`${API_BASE}/nodes/workflow/${wf.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'HTTP', label: 'Fetch Data', positionX: 0, positionY: 0, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1', timeout: 5000 } })
    });
    const n1 = await node1Res.json();

    // 2. IF Node
    const node2Res = await fetch(`${API_BASE}/nodes/workflow/${wf.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'IF', label: 'Check Status', positionX: 0, positionY: 0, config: { expression: 'response.status == 200' } })
    });
    const n2 = await node2Res.json();

    // 3. TRUE Branch Node
    const node3Res = await fetch(`${API_BASE}/nodes/workflow/${wf.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'HTTP', label: 'True Action', positionX: 0, positionY: 0, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/2' } })
    });
    const n3 = await node3Res.json();

    // 4. FALSE Branch Node
    const node4Res = await fetch(`${API_BASE}/nodes/workflow/${wf.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'HTTP', label: 'False Action', positionX: 0, positionY: 0, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/3' } })
    });
    const n4 = await node4Res.json();

    // Edges
    await fetch(`${API_BASE}/edges/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: n1.id, targetNodeId: n2.id }) });
    
    const edgeTrueRes = await fetch(`${API_BASE}/edges/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: n2.id, targetNodeId: n3.id }) });
    const edgeTrue = await edgeTrueRes.json();
    await fetch(`${API_BASE}/edges/${edgeTrue.id}`, { method: 'PATCH', headers, body: JSON.stringify({ condition: 'previousNode.result == true' }) });
    
    const edgeFalseRes = await fetch(`${API_BASE}/edges/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: n2.id, targetNodeId: n4.id }) });
    const edgeFalse = await edgeFalseRes.json();
    await fetch(`${API_BASE}/edges/${edgeFalse.id}`, { method: 'PATCH', headers, body: JSON.stringify({ condition: 'previousNode.result == false' }) });

    const runRes = await fetch(`${API_BASE}/workflows/${wf.id}/run`, { method: 'POST', headers });
    const executionData = await runRes.json();

    await new Promise(r => setTimeout(r, 4000));

    const nodeExecDetailRes = await fetch(`${API_BASE}/executions/${executionData.executionId}/nodes`, { headers });
    const nodeExecutions = await nodeExecDetailRes.json();
    
    console.log('Nodes Executed:');
    nodeExecutions.forEach(ne => {
      const nodeLabel = [n1, n2, n3, n4].find(n => n.id === ne.nodeId).label;
      console.log(`- ${nodeLabel}: ${ne.status}`);
    });
  } catch (err) {
    console.error('Test failed:', err);
  }
}

runTests();
