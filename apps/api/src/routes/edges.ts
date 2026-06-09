import { Router, RequestHandler } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createEdge,
  listEdges,
  deleteEdge,
  updateEdge,
} from '../controllers/edges.controller';

const router = Router();

router.use(authenticateToken as RequestHandler);

router.post('/workflow/:workflowId', createEdge);
router.get('/workflow/:workflowId', listEdges);

router.patch('/:id', updateEdge);
router.delete('/:id', deleteEdge);

export const edgesRouter: Router = router;
