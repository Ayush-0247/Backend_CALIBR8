import { Router } from 'express';
import { getMe } from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/me', protect, getMe);

export default router;
