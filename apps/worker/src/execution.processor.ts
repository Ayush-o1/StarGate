import { prisma } from '@stargate/database';

export const runWorkflowNodes = async (
  workflowExecutionId: string,
  nodes: any[],
  _edges: any[]
): Promise<void> => {
  let hasFailure = false;
  let finalErrorMessage: string | null = null;
  const nodeExecutionsMap = new Map();

  for (const node of nodes) {
    // 1. Create NodeExecution as PENDING
    const nodeExecution = await prisma.nodeExecution.create({
      data: {
        workflowExecutionId,
        nodeId: node.id,
        status: 'PENDING',
      },
    });

    nodeExecutionsMap.set(node.id, nodeExecution.id);

    // 2. Mark as RUNNING
    await prisma.nodeExecution.update({
      where: { id: nodeExecution.id },
      data: { status: 'RUNNING' },
    });

    try {
      const config = (node.config as any) || {};
      const method = config.method || 'GET';
      const url = config.url;
      const headers = config.headers || {};
      const body = config.body;
      const timeoutMs = config.timeout || 30000;

      if (!url) {
        throw new Error('Node configuration is missing URL');
      }

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

      const output = {
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        durationMs,
      };

      if (!response.ok) {
        hasFailure = true;
        finalErrorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        await prisma.nodeExecution.update({
          where: { id: nodeExecution.id },
          data: {
            status: 'FAILED',
            error: finalErrorMessage,
            output,
            completedAt: new Date(),
          },
        });
        break; // Stop executing sequentially on failure
      }

      // 4. Mark as SUCCESS
      await prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: 'SUCCESS',
          output: output,
          completedAt: new Date(),
        },
      });
    } catch (error: unknown) {
      hasFailure = true;
      finalErrorMessage = error instanceof Error ? error.message : 'Execution failed';
      // Mark as FAILED
      await prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: 'FAILED',
          error: finalErrorMessage,
          completedAt: new Date(),
        },
      });
      break; // Stop executing sequentially on failure
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
