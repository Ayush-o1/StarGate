import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createNode,
  listNodes,
  updateNode,
  deleteNode,
  updateNodePosition,
} from '../controllers/nodes.controller';

const router = Router();

router.use(authenticateToken as any);

router.post('/workflow/:workflowId', createNode);
router.get('/workflow/:workflowId', listNodes);

router.put('/:id', updateNode);
router.put('/:id/position', updateNodePosition);
router.delete('/:id', deleteNode);

export const nodesRouter: Router = router;
