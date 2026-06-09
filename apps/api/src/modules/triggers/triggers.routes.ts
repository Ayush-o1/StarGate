import { Router, RequestHandler } from 'express';
import { authenticateToken } from '../../middleware/auth';
import {
  createTrigger,
  listTriggers,
  deleteTrigger,
  enableTrigger,
  disableTrigger,
} from './triggers.controller';

// /api/v1/workflows/:workflowId/triggers
export const workflowTriggersRouter: Router = Router({ mergeParams: true });
workflowTriggersRouter.use(authenticateToken as RequestHandler);
workflowTriggersRouter.post('/', createTrigger);
workflowTriggersRouter.get('/', listTriggers);

// /api/v1/triggers/:id
export const triggersRouter: Router = Router();
triggersRouter.use(authenticateToken as RequestHandler);
triggersRouter.delete('/:id', deleteTrigger);
triggersRouter.post('/:id/enable', enableTrigger);
triggersRouter.post('/:id/disable', disableTrigger);
