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
const RATING_MAP = {
  easy: 800,
  beginner: 800,
  medium: 1200,
  mid: 1200,
  intermediate: 1200,
  hard: 1600,
  advanced: 1600,
};

/**
 * Complete a user's onboarding.
 * Supports:
 * 1) beginner: true — 1-click beginner preset (sets all DSA/all topics to easy, rating 800)
 * 2) topicLevels: [{ topicId, level }] — from interactive UI
 * 3) topicSelections: [{ topicId, difficulty }]
 * 4) difficulty & topicIds: 'all' or ['id1', 'id2']
 * @param {string} userId
 * @param {object} payload
 */
export const completeOnboarding = async (userId, payload = {}) => {
  let { difficulty, topicIds, topicSelections, topicLevels, beginner } = payload;

  // 1-Click beginner preset
  if (beginner === true) {
    difficulty = 'easy';
    topicIds = 'all';
  }

  // Support topicLevels alias from interactive dashboard [{ topicId, level }]
  if (Array.isArray(topicLevels) && topicLevels.length > 0) {
    topicSelections = topicLevels.map((item) => ({
      topicId: item.topicId,
      difficulty: item.level || item.difficulty || 'easy',
    }));
  }

  let resolvedTopicIds = [];
  const levelByTopicId = new Map();

  if (Array.isArray(topicSelections) && topicSelections.length > 0) {
    resolvedTopicIds = topicSelections.map((item) => {
      const id = typeof item === 'string' ? item : item.topicId;
      const diff = typeof item === 'object' ? (item.difficulty || item.level || 'easy') : 'easy';
      levelByTopicId.set(id, diff);
      return id;
    });
  } else if (Array.isArray(topicIds)) {
    resolvedTopicIds = [...topicIds];
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

  // Verify all topic IDs actually exist
  const topics = await prisma.topic.findMany({
    where: { id: { in: resolvedTopicIds } },
  });
  if (topics.length !== resolvedTopicIds.length) {
    throw new ApiError(400, 'One or more topic IDs are invalid.');
  }

  // Calculate composite rating & normalized difficulty
  let rating = 800;
  let normalizedDifficulty = 'easy';

  if (levelByTopicId.size > 0) {
    let totalScore = 0;
    for (const [, level] of levelByTopicId.entries()) {
      const norm = DIFFICULTY_NORMALIZE[String(level).toLowerCase()] || 'easy';
      totalScore += RATING_MAP[norm] || 800;
    }
    rating = Math.round(totalScore / levelByTopicId.size);
    if (rating >= 1400) normalizedDifficulty = 'hard';
    else if (rating >= 1000) normalizedDifficulty = 'medium';
    else normalizedDifficulty = 'easy';
  } else {
    const rawDifficulty = (difficulty || 'easy').toLowerCase();
    normalizedDifficulty = DIFFICULTY_NORMALIZE[rawDifficulty];
    if (!normalizedDifficulty) {
      throw new ApiError(
        400,
        `difficulty must be one of: easy (beginner), medium (mid), hard (advanced).`
      );
    }
    rating = RATING_MAP[normalizedDifficulty];
  }

  const isMock = typeof prisma.$isMock === 'function' ? prisma.$isMock() : false;

  // Run everything in a transaction
  const updatedUser = await prisma.$transaction(async (tx) => {
    // Update user fields
    await tx.user.update({
      where: { id: userId },
      data: { difficulty: normalizedDifficulty, rating, onboarded: true },
    });

    // Remove existing topic selections
    await tx.userTopic.deleteMany({ where: { userId } });

    // Create new topic selections (attach level only for mock store to prevent schema mismatch on live DB)
    await tx.userTopic.createMany({
      data: resolvedTopicIds.map((topicId) => {
        const base = { userId, topicId };
        if (isMock) {
          base.level = levelByTopicId.get(topicId) || normalizedDifficulty;
        }
        return base;
      }),
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