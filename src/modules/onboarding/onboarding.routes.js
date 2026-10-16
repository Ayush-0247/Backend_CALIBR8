import { Router } from 'express';
import { z } from 'zod';
import { auth } from '../../middleware/auth.js';
import prisma from '../../config/db.js';

const router = Router();

const schema = z.object({ difficulty: z.enum(['easy', 'medium', 'hard']), topicIds: z.array(z.string()).min(1) });
const ratingMap = { easy: 800, medium: 1200, hard: 1600 };

router.post('/onboarding', auth, async (req, res, next) => {
  try {
    const { difficulty, topicIds } = schema.parse(req.body);
    const rating = ratingMap[difficulty];

    await prisma.$transaction(async (tx) => {
      await tx.userTopicRating.deleteMany({ where: { userId: req.user.id } });
      await tx.userTopicRating.createMany({ data: topicIds.map(topicId => ({ userId: req.user.id, topicId, rating })) });
      await tx.user.update({ where: { id: req.user.id }, data: { onboarded: true } });
    });

    res.json({ ok: true, rating });
  } catch (e) { next(e); }
});

export default router;