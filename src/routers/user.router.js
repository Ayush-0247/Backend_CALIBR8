import { Router } from 'express';
import { getMe, updateMe } from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;
