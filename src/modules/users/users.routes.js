import { Router } from 'express';
import { auth } from '../../middleware/auth.js';
import prisma from '../../config/db.js';

const router = Router();

router.get('/me', auth, async (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name, onboarded: req.user.onboarded } });
});

router.patch('/me', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { name: req.body.name } });
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;