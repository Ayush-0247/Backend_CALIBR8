import prisma from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

const ALLOWED_LANGUAGES = ["cpp", "c", "java", "python", "javascript"];

/**
 * Get profile for the specified user ID
 * @param {string} userId
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
 * @param {string} userId
 * @param {{ name?: string }} data
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
 * @param {string} userId
 * @param {string} language
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
