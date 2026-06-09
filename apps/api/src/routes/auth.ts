import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rateLimiter';

const router: Router = Router();

router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

export { router as authRouter };
