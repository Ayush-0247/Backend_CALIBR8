import prisma from "../config/db.js";
import { completeOnboarding } from "../services/onboarding.service.js";
import { updateUserLanguage } from "../services/user.service.js";

/**
 * POST /onboarding
 * Protected — complete the authenticated user's onboarding & calibration.
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
        preferredLanguage: true,
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

/**
 * PATCH /onboarding/language
 * Protected — update preferred programming language during or after onboarding.
 */
export const updateLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    const result = await updateUserLanguage(req.user.id, language);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
