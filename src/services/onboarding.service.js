import prisma from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const DIFFICULTY_NORMALIZE = {
  easy: 'easy',
  beginner: 'easy',
  medium: 'medium',
  mid: 'medium',
  intermediate: 'medium',
  hard: 'hard',
  advanced: 'hard',
};
const RATING_MAP = { easy: 800, medium: 1200, hard: 1600 };

/**
 * Complete a user's onboarding.
 * Supports:
 * 1) Selecting easy/beginner for all topics
 * 2) Selecting easy, mid, hard for chosen DSA and core topics
 * 3) topicSelections array: [{ topicId, difficulty }]
 * @param {string} userId
 * @param {{ difficulty?: string, topicIds?: string[] | string, topicSelections?: Array<{ topicId: string, difficulty?: string }> }} data
 */
export const completeOnboarding = async (userId, { difficulty, topicIds, topicSelections }) => {
  let resolvedTopicIds = Array.isArray(topicIds) ? [...topicIds] : [];
  if (Array.isArray(topicSelections) && topicSelections.length > 0) {
    resolvedTopicIds = topicSelections.map((item) => (typeof item === 'string' ? item : item.topicId));
  }

  // If user requests "all" topics or gives difficulty without topicIds, select all available topics
  if (topicIds === 'all' || (difficulty && resolvedTopicIds.length === 0)) {
    const all = await prisma.topic.findMany();
    resolvedTopicIds = all.map((t) => t.id);
  }

  // Validate topic count (must have at least 1 topic)
  if (!Array.isArray(resolvedTopicIds) || resolvedTopicIds.length < 1) {
    throw new ApiError(400, 'Please select at least 1 topic.');
  }

  // Determine difficulty (support aliases like beginner, mid)
  let rawDifficulty = difficulty;
  if (!rawDifficulty && Array.isArray(topicSelections) && topicSelections.length > 0) {
    rawDifficulty = topicSelections[0].difficulty || 'easy';
  }
  rawDifficulty = (rawDifficulty || 'easy').toLowerCase();

  const normalizedDifficulty = DIFFICULTY_NORMALIZE[rawDifficulty];
  if (!normalizedDifficulty) {
    throw new ApiError(
      400,
      `difficulty must be one of: easy (beginner), medium (mid), hard (advanced).`
    );
  }

  // Verify all topic IDs actually exist
  const topics = await prisma.topic.findMany({
    where: { id: { in: resolvedTopicIds } },
  });
  if (topics.length !== resolvedTopicIds.length) {
    throw new ApiError(400, 'One or more topic IDs are invalid.');
  }

  const rating = RATING_MAP[normalizedDifficulty];

  // Run everything in a transaction
  const updatedUser = await prisma.$transaction(async (tx) => {
    // Update user fields
    await tx.user.update({
      where: { id: userId },
      data: { difficulty: normalizedDifficulty, rating, onboarded: true },
    });

    // Remove existing topic selections
    await tx.userTopic.deleteMany({ where: { userId } });

    // Create new topic selections
    await tx.userTopic.createMany({
      data: resolvedTopicIds.map((topicId) => ({ userId, topicId })),
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
