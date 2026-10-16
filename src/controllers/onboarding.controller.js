import { completeOnboarding } from '../services/onboarding.service.js';

/**
 * POST /onboarding
 * Protected — complete the authenticated user's onboarding.
 */
export const onboard = async (req, res, next) => {
  try {
    const { difficulty, topicIds } = req.body;
    const user = await completeOnboarding(req.user.id, { difficulty, topicIds });
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
