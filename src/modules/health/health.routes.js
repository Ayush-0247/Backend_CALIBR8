import { Router } from 'express';
import prisma from '../../config/db.js';
const router = Router();

router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'up', requestId: req.id });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'down', requestId: req.id });
  }
});

export default router;