import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createWorkflow,
  listWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '../controllers/workflows.controller';

const router = Router();

router.use(authenticateToken as any);

// Routes nested under a workspace
router.post('/workspace/:workspaceId', createWorkflow);
router.get('/workspace/:workspaceId', listWorkflows);

// Direct workflow routes
router.get('/:id', getWorkflow);
router.put('/:id', updateWorkflow);
router.delete('/:id', deleteWorkflow);

export const workflowsRouter: Router = router;
