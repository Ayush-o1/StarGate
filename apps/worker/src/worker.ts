import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@stargate/database';
import { ExecuteWorkflowPayload } from '@stargate/shared';
import { runWorkflowNodes } from './execution.processor';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

const redisConnection = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
});

export const initWorker = () => {
  console.log(`[Worker] Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`);

  const worker = new Worker<ExecuteWorkflowPayload>(
    'workflow-execution',
    async (job: Job<ExecuteWorkflowPayload>) => {
      const { workflowId, executionId, triggerExecutionId } = job.data;
      console.log(`[Worker] Processing execution ${executionId} for workflow ${workflowId}`);

      // 1. Mark workflow as RUNNING and update retryCount
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'RUNNING', retryCount: job.attemptsMade },
      });

      // Fetch the workflow nodes and edges
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          nodes: { orderBy: { createdAt: 'asc' } },
          edges: true,
        },
      });

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // 2. Execute nodes sequentially with a global timeout of 5 minutes
      const WORKFLOW_TIMEOUT_MS = 5 * 60 * 1000;
      let timeoutId: NodeJS.Timeout;
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Workflow execution exceeded maximum time limit of ${WORKFLOW_TIMEOUT_MS}ms`)), WORKFLOW_TIMEOUT_MS);
      });

      try {
        await Promise.race([
          runWorkflowNodes(executionId, workflow.nodes, workflow.edges),
          timeoutPromise
        ]);
        clearTimeout(timeoutId!);
        
        // 3. Mark trigger execution if passed
        if (triggerExecutionId) {
          await prisma.triggerExecution.update({
            where: { id: triggerExecutionId },
            data: { status: 'SUCCESS', finishedAt: new Date() },
          });
        }
      } catch (error) {
        if (triggerExecutionId) {
          await prisma.triggerExecution.update({
            where: { id: triggerExecutionId },
            data: { status: 'FAILED', finishedAt: new Date() },
          });
        }
        clearTimeout(timeoutId!);
        // Rethrow so BullMQ knows the job failed
        throw error;
      }
    },
    { connection: redisConnection as any }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
};
