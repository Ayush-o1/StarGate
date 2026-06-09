
const API_BASE = 'http://localhost:3000/api/v1';

async function seedUserAndWorkspace() {
  const email = `test-phase10-${Date.now()}@example.com`;
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', name: 'Phase 10 Tester' })
  });
  const registerData = await registerRes.json();
  const token = registerData.tokens.accessToken;

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
    console.log('Workflow created:', wf.id);

    // Create Nodes
    // 1. Initial HTTP Request (will succeed, status 200)
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

    // Create Edges
    // n1 -> n2
    await fetch(`${API_BASE}/edges/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: n1.id, targetNodeId: n2.id }) });
    
    // n2 -> n3 (Condition: previousNode.result === true)
    const edgeTrueRes = await fetch(`${API_BASE}/edges/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: n2.id, targetNodeId: n3.id }) });
    const edgeTrue = await edgeTrueRes.json();
    await fetch(`${API_BASE}/edges/${edgeTrue.id}`, { method: 'PATCH', headers, body: JSON.stringify({ condition: 'previousNode.result == true' }) });
    
    // n2 -> n4 (Condition: previousNode.result === false)
    const edgeFalseRes = await fetch(`${API_BASE}/edges/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: n2.id, targetNodeId: n4.id }) });
    const edgeFalse = await edgeFalseRes.json();
    await fetch(`${API_BASE}/edges/${edgeFalse.id}`, { method: 'PATCH', headers, body: JSON.stringify({ condition: 'previousNode.result == false' }) });

    console.log('Executing True Branch...');
    // Execute Workflow
    const runRes = await fetch(`${API_BASE}/workflows/${wf.id}/run`, { method: 'POST', headers });
    const executionData = await runRes.json();
    console.log('Execution queued:', executionData.executionId);

    // Wait for execution
    await new Promise(r => setTimeout(r, 6000));

    const execDetailRes = await fetch(`${API_BASE}/executions/${executionData.executionId}`, { headers });
    const execDetail = await execDetailRes.json();

    const nodeExecDetailRes = await fetch(`${API_BASE}/executions/${executionData.executionId}/nodes`, { headers });
    const nodeExecutions = await nodeExecDetailRes.json();
    
    console.log('Status:', execDetail.status);
    console.log('Nodes Executed:');
    nodeExecutions.forEach(ne => {
      const nodeLabel = [n1, n2, n3, n4].find(n => n.id === ne.nodeId).label;
      console.log(`- ${nodeLabel}: ${ne.status}`);
    });

    // Test Security (process.exit)
    console.log('\nTesting Security...');
    const nodeBadRes = await fetch(`${API_BASE}/nodes/workflow/${wf.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'IF', label: 'Bad IF', positionX: 0, positionY: 0, config: { expression: 'process.exit()' } })
    });
    const nBad = await nodeBadRes.json();
    
    // Disconnect old edges, connect n1 -> nBad
    await fetch(`${API_BASE}/edges/workflow/${wf.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: n1.id, targetNodeId: nBad.id }) });
    
    const runBadRes = await fetch(`${API_BASE}/workflows/${wf.id}/run`, { method: 'POST', headers });
    const badExecutionData = await runBadRes.json();
    await new Promise(r => setTimeout(r, 4000));
    const badExecDetailRes = await fetch(`${API_BASE}/executions/${badExecutionData.executionId}`, { headers });
    const badExecDetail = await badExecDetailRes.json();

    const badNodeExecDetailRes = await fetch(`${API_BASE}/executions/${badExecutionData.executionId}/nodes`, { headers });
    const badNodeExecutions = await badNodeExecDetailRes.json();

    console.log('Security Test Execution Status:', badExecDetail.status);
    const badNodeExec = badNodeExecutions.find(ne => ne.nodeId === nBad.id);
    console.log('Bad Node Status:', badNodeExec.status);
    console.log('Bad Node Error:', badNodeExec.error);

  } catch (err) {
    console.error('Test failed:', err);
  }
}

runTests();
