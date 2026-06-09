import { prisma } from '@stargate/database';
import { executionQueue } from '../../lib/queue';

export const executeWorkflow = async (workflowId: string, triggerExecutionId?: string): Promise<string> => {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  if (!workflow.isActive) {
    throw new Error('Workflow inactive');
  }

  // Create execution record as QUEUED
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      startedById: workflow.createdById, // Use creator ID for automated runs
      status: 'QUEUED',
    },
  });

  // Enqueue job with BullMQ
  await executionQueue.add(
    'execute-workflow',
    {
      workflowId,
      executionId: execution.id,
      triggerExecutionId,
    },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      jobId: execution.id, // Ensure idempotency if possible
    }
  );

  return execution.id;
};
