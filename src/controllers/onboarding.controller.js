import {
  completeOnboarding,
  getOnboardingStatus as fetchStatus,
} from '../services/onboarding.service.js';

/**
 * POST /onboarding
 * Protected — complete the authenticated user's onboarding or update DSA topic levels.
 */
export const onboard = async (req, res, next) => {
  try {
    const user = await completeOnboarding(req.user.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Onboarding completed and topic levels updated successfully.',
      user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /onboarding/status
 * Protected — get user's current onboarding status and topic levels.
 */
export const getStatus = async (req, res, next) => {
  try {
    const status = await fetchStatus(req.user.id);
    res.status(200).json({ success: true, ...status });
  } catch (err) {
    next(err);
  }
};
