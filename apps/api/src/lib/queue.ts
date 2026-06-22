import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { ExecuteWorkflowPayload } from '@stargate/shared';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

export const redisConnection = REDIS_URL
  ? new Redis(REDIS_URL, { maxRetriesPerRequest: null })
  : new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: null,
    });

export const executionQueue = new Queue<ExecuteWorkflowPayload>('workflow-execution', {
  connection: redisConnection as any,
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Error:', err);
});
