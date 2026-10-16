import { Router } from 'express';
import authRouter from './auth.router.js';
import userRouter from './user.router.js';
import topicRouter from './topic.router.js';
import onboardingRouter from './onboarding.router.js';

const router = Router();

// Health & utility routes
router.get('/ping', (req, res) => res.status(200).send('pong'));
router.get('/health', (req, res) =>
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
);

// Feature routers
router.use('/auth', authRouter);
router.use('/topics', topicRouter);
router.use('/onboarding', onboardingRouter);
router.use('/', userRouter);

export default router;
