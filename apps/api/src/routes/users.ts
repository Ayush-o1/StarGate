import { Router } from 'express';
import { getMe, updateMe } from '../controllers/users.controller';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

router.get('/me', authenticateToken, getMe);
router.patch('/me', authenticateToken, updateMe);

export { router as usersRouter };
