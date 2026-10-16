import { Router } from 'express';
import { onboard, getStatus } from '../controllers/onboarding.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', protect, onboard);
router.put('/levels', protect, onboard);
router.get('/status', protect, getStatus);

export default router;
