import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createEdge,
  listEdges,
  deleteEdge,
} from '../controllers/edges.controller';

const router = Router();

router.use(authenticateToken as any);

router.post('/workflow/:workflowId', createEdge);
router.get('/workflow/:workflowId', listEdges);

router.delete('/:id', deleteEdge);

export const edgesRouter: Router = router;
