import { Router } from 'express';
import { onboard, getStatus ,updateLanguage } from '../controllers/onboarding.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', protect, onboard);
router.put('/levels', protect, onboard);
router.get('/status', protect, getStatus);
router.get('/lanuguage',protect,updateLanguage)

export default router;
