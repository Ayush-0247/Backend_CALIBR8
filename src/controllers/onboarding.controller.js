import prisma from '../config/db.js';
import { completeOnboarding } from '../services/onboarding.service.js';

/**
 * POST /onboarding
 * Protected — complete the authenticated user's onboarding.
 */
export const onboard = async (req, res, next) => {
  try {
    const user = await completeOnboarding(req.user.id, req.body);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /onboarding/status
 * Protected — get onboarding status and selected topics for the authenticated user.
 */
export const getStatus = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        difficulty: true,
        rating: true,
        onboarded: true,
        topics: {
          include: {
            topic: true,
          },
        },
      },
    });
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};