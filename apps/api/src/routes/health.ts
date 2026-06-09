import { Router } from 'express';


import { getHealth } from '../modules/system/system.controller';

const router: Router = Router();

router.get('/', getHealth);

export { router as healthRouter };
