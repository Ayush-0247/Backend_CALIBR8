import {
  getUserProfile,
  updateUserProfile,
  updateUserLanguage,
} from "../services/user.service.js";

/**
 * GET /me
 * Returns the currently authenticated user with topics, calibration, and preferences.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await getUserProfile(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /me
 * Updates the currently authenticated user's profile details.
 */
export const updateMe = async (req, res, next) => {
  try {
    const { name } = req.body;
    const updated = await updateUserProfile(req.user.id, { name });
    res.status(200).json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /users/language or PATCH /me/language
 * Update user's preferred programming language
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
