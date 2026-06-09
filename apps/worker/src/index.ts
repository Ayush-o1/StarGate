import * as dotenv from 'dotenv';
dotenv.config();

import { initWorker } from './worker';

console.log('[Worker] Starting Stargate Worker Process...');

const worker = initWorker();

// Graceful shutdown
const shutdown = async () => {
  console.log('[Worker] Shutting down gracefully...');
  await worker.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
