import { completeOnboarding } from '../services/onboarding.service.js';

/**
 * POST /onboarding
 * Protected — complete the authenticated user's onboarding.
 */
export const onboard = async (req, res, next) => {
  try {
    const { difficulty, topicIds, topicSelections } = req.body;
    const user = await completeOnboarding(req.user.id, { difficulty, topicIds, topicSelections });
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
