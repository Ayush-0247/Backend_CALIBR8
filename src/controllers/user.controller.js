import prisma from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

export const ALLOWED_LANGUAGES = ["cpp", "c", "java", "python", "javascript"];

/**
 * Get profile for the specified user ID
 */
export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      difficulty: true,
      rating: true,
      onboarded: true,
      preferredLanguage: true,
      createdAt: true,
      updatedAt: true,
      socialAccounts: true,
      topics: {
        include: {
          topic: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return user;
};

/**
 * Update user editable profile details (e.g. name)
 */
export const updateUserProfile = async (userId, { name }) => {
  if (!name || !name.trim()) {
    throw new ApiError(400, "Name cannot be empty.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: name.trim() },
    select: {
      id: true,
      email: true,
      name: true,
      difficulty: true,
      rating: true,
      onboarded: true,
      preferredLanguage: true,
      createdAt: true,
      updatedAt: true,
      topics: {
        include: {
          topic: true,
        },
      },
    },
  });

  return updated;
};

/**
 * Update preferred programming language
 */
export const updateUserLanguage = async (userId, language) => {
  const normalizedLang = String(language || "").trim().toLowerCase();

  if (!ALLOWED_LANGUAGES.includes(normalizedLang)) {
    throw new ApiError(
      400,
      `Invalid language. Allowed options: ${ALLOWED_LANGUAGES.join(", ")}`,
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { preferredLanguage: normalizedLang },
    select: {
      id: true,
      preferredLanguage: true,
    },
  });

  return {
    success: true,
    language: updated.preferredLanguage,
  };
};

/**
 * GET /api/users/me
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
 * PUT /api/users/me
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
 * PATCH /api/users/me/language
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
