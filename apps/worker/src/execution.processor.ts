import { prisma } from '@stargate/database';
// @ts-ignore
import jexl from 'jexl';
import { VariableResolver } from './utils/resolver';
import { validateSSRF } from './utils/ssrf';

export const runWorkflowNodes = async (
  workflowExecutionId: string,
  nodes: any[],
  edges: any[]
): Promise<void> => {
  let hasFailure = false;
  let finalErrorMessage: string | null = null;
  const nodeExecutionsMap = new Map();

  const inDegree = new Map<string, number>();
  const adj = new Map<string, any[]>();
  
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
    const list = adj.get(edge.sourceNodeId) || [];
    list.push(edge);
    adj.set(edge.sourceNodeId, list);
  }

  const sorted: string[] = [];
  const q: string[] = [];
  const entries = Array.from(inDegree.entries());
  for (const [id, deg] of entries) {
    if (deg === 0) q.push(id);
  }
  
  while (q.length > 0) {
    const u = q.shift()!;
    sorted.push(u);
    for (const edge of adj.get(u) || []) {
      const v = edge.targetNodeId;
      inDegree.set(v, inDegree.get(v)! - 1);
      if (inDegree.get(v) === 0) q.push(v);
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('Cycle detected in workflow DAG or invalid connections.');
  }

  const context: any = { response: {}, previousNode: {}, workflow: {} };
  const executionContext: Record<string, any> = {}; // Full store by node ID
  const executionState = new Map<string, 'SUCCESS' | 'FAILED' | 'SKIPPED'>();
  const edgeState = new Map<string, boolean>();

  for (const nodeId of sorted) {
    const node = nodes.find(n => n.id === nodeId);
    const incomingEdges = edges.filter(e => e.targetNodeId === nodeId);

    // Node should execute if it has no incoming edges, or if ANY incoming edge evaluated to true.
    const shouldExecute = incomingEdges.length === 0 || incomingEdges.some(e => edgeState.get(e.id) === true);

    const nodeExecution = await prisma.nodeExecution.create({
      data: {
        workflowExecutionId,
        nodeId: node.id,
        status: 'PENDING',
      },
    });
    nodeExecutionsMap.set(node.id, nodeExecution.id);

    if (!shouldExecute) {
      executionState.set(nodeId, 'SKIPPED');
      await prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: { status: 'SKIPPED', completedAt: new Date(), durationMs: 0 },
      });

      // Downstream edges from skipped nodes are automatically marked false (skipped)
      const outgoing = adj.get(nodeId) || [];
      for (const e of outgoing) {
        edgeState.set(e.id, false);
      }
      continue;
    }

    await prisma.nodeExecution.update({
      where: { id: nodeExecution.id },
      data: { status: 'RUNNING' },
    });

    try {
      let output: any = null;

      if (node.type === 'IF') {
        const expression = (node.config as any)?.expression || 'false';
        const result = !!(await jexl.eval(expression, context));
        output = { result };
      } else {
        // Standard HTTP execution
        let config = (node.config as any) || {};
        
        // Resolve variables using VariableResolver
        config = VariableResolver.resolveObject(config, executionContext);

        const method = config.method || 'GET';
        const url = config.url;
        const headers = config.headers || {};
        const body = config.body;
        const timeoutMs = config.timeout || 30000;

        if (!url) {
          throw new Error('Node configuration is missing URL');
        }

        await validateSSRF(url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };

        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
          fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
          if (!fetchOptions.headers || !Object.keys(fetchOptions.headers).some(k => k.toLowerCase() === 'content-type')) {
            fetchOptions.headers = { ...fetchOptions.headers, 'Content-Type': 'application/json' };
          }
        }

        const startTime = performance.now();
        let response: Response;
        try {
          response = await fetch(url, fetchOptions);
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
          }
          throw new Error(`Network error: ${err.message}`);
        }

        clearTimeout(timeoutId);
        const durationMs = Math.round(performance.now() - startTime);

        let responseBody;
        const text = await response.text();
        try {
          responseBody = JSON.parse(text);
        } catch (e) {
          responseBody = text;
        }

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        output = {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body: responseBody,
          durationMs,
        };

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }
      }

      // Update context for next nodes
      context.previousNode = output;
      context.response = output;
      
      // Store in global execution context
      executionContext[node.id] = output;

      // Evaluate outgoing edges dynamically
      const outgoing = adj.get(nodeId) || [];
      for (const e of outgoing) {
        let passed = true;
        if (e.condition && e.condition.trim().length > 0) {
          try {
            // Also resolve variables in the condition itself before passing to jexl
            // Jexl provides its own context, but evaluating mapped expressions is helpful too.
            const resolvedCondition = VariableResolver.resolveString(e.condition, executionContext);
            passed = !!(await jexl.eval(resolvedCondition, context));
          } catch (err) {
            console.error(`Edge condition evaluation failed for edge ${e.id}:`, err);
            passed = false;
          }
        }
        edgeState.set(e.id, passed);
      }

      executionState.set(nodeId, 'SUCCESS');
      const completedAt = new Date();
      await prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: 'SUCCESS',
          output: output,
          completedAt,
          durationMs: completedAt.getTime() - nodeExecution.startedAt.getTime(),
        },
      });
    } catch (error: unknown) {
      hasFailure = true;
      finalErrorMessage = error instanceof Error ? error.message : 'Execution failed';
      executionState.set(nodeId, 'FAILED');

      const completedAt = new Date();
      await prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: 'FAILED',
          error: finalErrorMessage,
          completedAt,
          durationMs: completedAt.getTime() - nodeExecution.startedAt.getTime(),
        },
      });

      // Mark outgoing edges as false to skip downstream correctly, but don't break loop so other branches can run
      const outgoing = adj.get(nodeId) || [];
      for (const e of outgoing) {
        edgeState.set(e.id, false);
      }
    }
  }

  // Finalize WorkflowExecution
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: workflowExecutionId },
  });

  if (execution) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - execution.startedAt.getTime();

    await prisma.workflowExecution.update({
      where: { id: workflowExecutionId },
      data: {
        status: hasFailure ? 'FAILED' : 'SUCCESS',
        errorMessage: hasFailure ? finalErrorMessage : null,
        completedAt,
        durationMs,
      },
    });

    if (hasFailure) {
      throw new Error(finalErrorMessage || 'Workflow failed');
    }
  }
};
