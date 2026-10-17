import { Router } from 'express';
import {
  register,
  login,
  logout,
  verifyAuth,
  changePassword,
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, verifyAuth);
router.get('/verify', protect, verifyAuth);
router.post('/change-password', protect, changePassword);

export default router;
