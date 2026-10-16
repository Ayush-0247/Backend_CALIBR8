import { Router } from 'express';
import { onboard } from '../controllers/onboarding.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', protect, onboard);

export default router;
