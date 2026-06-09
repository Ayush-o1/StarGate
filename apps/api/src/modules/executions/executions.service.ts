import { prisma } from '@stargate/database';

export const runWorkflowNodes = async (
  workflowExecutionId: string,
  nodes: any[],
  edges: any[]
): Promise<void> => {
  let hasFailure = false;
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
      // 3. Mock Execution (Wait 500ms, Return JSON)
      await new Promise((resolve) => setTimeout(resolve, 500));

      const output = {
        status: 200,
        message: 'Mock HTTP Success',
        nodeId: node.id,
        nodeType: node.type,
      };

      // 4. Mark as SUCCESS
      await prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: 'SUCCESS',
          output: output,
          completedAt: new Date(),
        },
      });
    } catch (error: any) {
      hasFailure = true;
      // Mark as FAILED
      await prisma.nodeExecution.update({
        where: { id: nodeExecution.id },
        data: {
          status: 'FAILED',
          error: error.message || 'Execution failed',
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
        completedAt,
        durationMs,
      },
    });
  }
};
