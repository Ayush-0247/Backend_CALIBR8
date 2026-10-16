import { Router } from 'express';
import prisma from '../../config/db.js';

const router = Router();

router.get('/topics', async (req, res) => {
  const topics = await prisma.topic.findMany({ orderBy: { name: 'asc' } });
  res.json({ topics });
});

export default router;