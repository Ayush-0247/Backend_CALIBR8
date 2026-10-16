import prisma from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const RATING_MAP = { easy: 800, medium: 1200, hard: 1600 };

/**
 * Complete a user's onboarding.
 * @param {string} userId
 * @param {{ difficulty: string, topicIds: string[] }} data
 */
export const completeOnboarding = async (userId, { difficulty, topicIds }) => {
  // Validate difficulty
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    throw new ApiError(
      400,
      `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}.`
    );
  }

  // Validate topicIds count
  if (!Array.isArray(topicIds) || topicIds.length < 2 || topicIds.length > 5) {
    throw new ApiError(400, 'topicIds must be an array with 2–5 items.');
  }

  // Verify all topic IDs actually exist
  const topics = await prisma.topic.findMany({
    where: { id: { in: topicIds } },
  });
  if (topics.length !== topicIds.length) {
    throw new ApiError(400, 'One or more topic IDs are invalid.');
  }

  const rating = RATING_MAP[difficulty];

  // Run everything in a transaction
  const updatedUser = await prisma.$transaction(async (tx) => {
    // Update user fields
    await tx.user.update({
      where: { id: userId },
      data: { difficulty, rating, onboarded: true },
    });

    // Remove existing topic selections
    await tx.userTopic.deleteMany({ where: { userId } });

    // Create new topic selections
    await tx.userTopic.createMany({
      data: topicIds.map((topicId) => ({ userId, topicId })),
    });

    // Return the fully populated user
    return tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        difficulty: true,
        rating: true,
        onboarded: true,
        createdAt: true,
        updatedAt: true,
        topics: {
          include: {
            topic: true,
          },
        },
      },
    });
  });

  return updatedUser;
};
