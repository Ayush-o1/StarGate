import { Router } from 'express';
import { prisma } from '@stargate/database';
import { HealthResponse } from '@stargate/shared';

const router: Router = Router();

router.get('/', async (req, res) => {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e) {
    console.error('Database connection failed', e);
  }

  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  };

  res.status(dbStatus === 'connected' ? 200 : 503).json(response);
});

export { router as healthRouter };
