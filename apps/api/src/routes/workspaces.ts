import { Router, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from '../controllers/workspaces.controller';

const router = Router();

// Protect all workspace routes
router.use(authenticateToken as RequestHandler);

router.post('/', createWorkspace);
router.get('/', listWorkspaces);
router.get('/:id', getWorkspace);
router.put('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);

export const workspacesRouter: Router = router;
