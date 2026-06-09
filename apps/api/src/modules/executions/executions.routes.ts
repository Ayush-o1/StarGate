import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import {
  runWorkflow,
  listExecutions,
  getExecution,
  getNodeExecutions
} from './executions.controller';

const router = Router();

router.use(authenticateToken as any);

// Endpoints mounted under /api/v1/workflows/:id
// But since the router doesn't have mergeParams by default, 
// wait, we should mount runWorkflow and listExecutions on the workflowsRouter,
// OR mount them here but map the full paths here. The plan was to mount this router
// at /api/v1 (or /api/v1/executions and /api/v1/workflows for the others).
// Let's export separate routers or just define full paths if mounted at /api/v1.

// For /api/v1/workflows/:id/run and /api/v1/workflows/:id/executions
export const workflowExecutionRouter: Router = Router({ mergeParams: true });
workflowExecutionRouter.use(authenticateToken as any);
workflowExecutionRouter.post('/run', runWorkflow);
workflowExecutionRouter.get('/executions', listExecutions);

// For /api/v1/executions/:id and /api/v1/executions/:id/nodes
export const executionDetailRouter: Router = Router();
executionDetailRouter.use(authenticateToken as any);
executionDetailRouter.get('/:id', getExecution);
executionDetailRouter.get('/:id/nodes', getNodeExecutions);
