import { Router } from 'express';
import { getHealth, getMetrics } from './system.controller';
import { authenticateToken } from '../../middleware/auth';

export const systemRouter: Router = Router();

systemRouter.get('/health', getHealth);
systemRouter.get('/metrics', authenticateToken, getMetrics);
