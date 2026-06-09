const API_BASE = 'http://localhost:3000/api/v1';

async function runTests() {
  try {
    const email = `test-phase10-full-${Date.now()}@example.com`;
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
      body: JSON.stringify({ name: 'Phase 10 Full Test' })
    });
    const wsData = await wsRes.json();
    const workspaceId = wsData.id;

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // --- TRUE BRANCH WORKFLOW ---
    const wfTrueRes = await fetch(`${API_BASE}/workflows/workspace/${workspaceId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'TRUE Branch Test', description: '' })
    });
    const wfTrue = await wfTrueRes.json();

    const tn1Res = await fetch(`${API_BASE}/nodes/workflow/${wfTrue.id}`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'HTTP', label: 'HTTP Node', positionX: 0, positionY: 0, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' } })
    });
    const tn1 = await tn1Res.json();

    const tn2Res = await fetch(`${API_BASE}/nodes/workflow/${wfTrue.id}`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'IF', label: 'IF Node', positionX: 0, positionY: 0, config: { expression: 'response.status == 200' } })
    });
    const tn2 = await tn2Res.json();

    const tn3Res = await fetch(`${API_BASE}/nodes/workflow/${wfTrue.id}`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'HTTP', label: 'TRUE Branch Node', positionX: 0, positionY: 0, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' } })
    });
    const tn3 = await tn3Res.json();

    const tn4Res = await fetch(`${API_BASE}/nodes/workflow/${wfTrue.id}`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'HTTP', label: 'FALSE Branch Node', positionX: 0, positionY: 0, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' } })
    });
    const tn4 = await tn4Res.json();

    await fetch(`${API_BASE}/edges/workflow/${wfTrue.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: tn1.id, targetNodeId: tn2.id }) });
    
    const eTrueRes = await fetch(`${API_BASE}/edges/workflow/${wfTrue.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: tn2.id, targetNodeId: tn3.id }) });
    const eTrue = await eTrueRes.json();
    await fetch(`${API_BASE}/edges/${eTrue.id}`, { method: 'PATCH', headers, body: JSON.stringify({ condition: 'previousNode.result == true' }) });
    
    const eFalseRes = await fetch(`${API_BASE}/edges/workflow/${wfTrue.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: tn2.id, targetNodeId: tn4.id }) });
    const eFalse = await eFalseRes.json();
    await fetch(`${API_BASE}/edges/${eFalse.id}`, { method: 'PATCH', headers, body: JSON.stringify({ condition: 'previousNode.result == false' }) });

    console.log('--- Triggering TRUE Branch Workflow ---');
    const runTrueRes = await fetch(`${API_BASE}/workflows/${wfTrue.id}/run`, { method: 'POST', headers });
    const tExecutionData = await runTrueRes.json();

    // --- FALSE BRANCH WORKFLOW ---
    const wfFalseRes = await fetch(`${API_BASE}/workflows/workspace/${workspaceId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'FALSE Branch Test', description: '' })
    });
    const wfFalse = await wfFalseRes.json();

    const fn1Res = await fetch(`${API_BASE}/nodes/workflow/${wfFalse.id}`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'HTTP', label: 'HTTP Node', positionX: 0, positionY: 0, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' } })
    });
    const fn1 = await fn1Res.json();

    // The condition here fails! response.status == 404 is false for 200 OK.
    const fn2Res = await fetch(`${API_BASE}/nodes/workflow/${wfFalse.id}`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'IF', label: 'IF Node', positionX: 0, positionY: 0, config: { expression: 'response.status == 404' } })
    });
    const fn2 = await fn2Res.json();

    const fn3Res = await fetch(`${API_BASE}/nodes/workflow/${wfFalse.id}`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'HTTP', label: 'TRUE Branch Node', positionX: 0, positionY: 0, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' } })
    });
    const fn3 = await fn3Res.json();

    const fn4Res = await fetch(`${API_BASE}/nodes/workflow/${wfFalse.id}`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'HTTP', label: 'FALSE Branch Node', positionX: 0, positionY: 0, config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' } })
    });
    const fn4 = await fn4Res.json();

    await fetch(`${API_BASE}/edges/workflow/${wfFalse.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: fn1.id, targetNodeId: fn2.id }) });
    
    const efTrueRes = await fetch(`${API_BASE}/edges/workflow/${wfFalse.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: fn2.id, targetNodeId: fn3.id }) });
    const efTrue = await efTrueRes.json();
    await fetch(`${API_BASE}/edges/${efTrue.id}`, { method: 'PATCH', headers, body: JSON.stringify({ condition: 'previousNode.result == true' }) });
    
    const efFalseRes = await fetch(`${API_BASE}/edges/workflow/${wfFalse.id}`, { method: 'POST', headers, body: JSON.stringify({ sourceNodeId: fn2.id, targetNodeId: fn4.id }) });
    const efFalse = await efFalseRes.json();
    await fetch(`${API_BASE}/edges/${efFalse.id}`, { method: 'PATCH', headers, body: JSON.stringify({ condition: 'previousNode.result == false' }) });

    console.log('--- Triggering FALSE Branch Workflow ---');
    const runFalseRes = await fetch(`${API_BASE}/workflows/${wfFalse.id}/run`, { method: 'POST', headers });
    const fExecutionData = await runFalseRes.json();

    // Wait for executions to process
    await new Promise(r => setTimeout(r, 6000));

    // Display True Execution Results
    const tNodeExecDetailRes = await fetch(`${API_BASE}/executions/${tExecutionData.executionId}/nodes`, { headers });
    const tNodeExecutions = await tNodeExecDetailRes.json();
    
    console.log('\n[RESULTS] TRUE Branch Workflow Execution:');
    tNodeExecutions.forEach(ne => {
      const nodeLabel = [tn1, tn2, tn3, tn4].find(n => n.id === ne.nodeId).label;
      console.log(`- ${nodeLabel}: ${ne.status}`);
    });

    // Display False Execution Results
    const fNodeExecDetailRes = await fetch(`${API_BASE}/executions/${fExecutionData.executionId}/nodes`, { headers });
    const fNodeExecutions = await fNodeExecDetailRes.json();
    
    console.log('\n[RESULTS] FALSE Branch Workflow Execution:');
    fNodeExecutions.forEach(ne => {
      const nodeLabel = [fn1, fn2, fn3, fn4].find(n => n.id === ne.nodeId).label;
      console.log(`- ${nodeLabel}: ${ne.status}`);
    });

  } catch (err) {
    console.error('Test failed:', err);
  }
}

runTests();
