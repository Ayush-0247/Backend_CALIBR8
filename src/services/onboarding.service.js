import prisma from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const VALID_LEVELS = ['easy', 'mid', 'medium', 'hard'];
const LEVEL_RATING_MAP = { easy: 800, mid: 1200, medium: 1200, hard: 1600 };

/**
 * Normalize level string: 'mid' -> 'medium'
 * @param {string} level
 * @returns {'easy' | 'medium' | 'hard'}
 */
export const normalizeLevel = (level) => {
  if (!level) return 'easy';
  const clean = String(level).trim().toLowerCase();
  if (clean === 'mid' || clean === 'medium') return 'medium';
  if (clean === 'hard') return 'hard';
  return 'easy';
};

/**
 * Complete or update a user's onboarding and topic level selections.
 * @param {string} userId
 * @param {object} payload
 */
export const completeOnboarding = async (userId, payload = {}) => {
  const {
    beginner,
    isBeginner,
    difficulty,
    topicLevels,
    topics: inputTopics,
    dsaLevels,
    topicIds,
  } = payload;

  const checkBeginner =
    beginner === true ||
    isBeginner === true ||
    (typeof difficulty === 'string' && difficulty.toLowerCase() === 'beginner');

  // Fetch all available topics
  const allTopics = await prisma.topic.findMany();
  const dsaTopics = allTopics.filter((t) => t.category?.toUpperCase() === 'DSA');
  const targetDsaList = dsaTopics.length > 0 ? dsaTopics : allTopics;

  let assignedSelections = []; // array of { topicId, level }

  if (checkBeginner) {
    // ⚡ Case A: User chose beginner — automatically set all DSA topics to 'easy'
    assignedSelections = targetDsaList.map((t) => ({
      topicId: t.id,
      level: 'easy',
    }));
  } else if (topicLevels || inputTopics || dsaLevels) {
    // 🎯 Case B: User specified individual levels for various DSA topics
    const rawItems = [];

    if (Array.isArray(topicLevels)) {
      rawItems.push(...topicLevels);
    } else if (Array.isArray(inputTopics)) {
      rawItems.push(...inputTopics);
    } else if (topicLevels && typeof topicLevels === 'object') {
      for (const [key, val] of Object.entries(topicLevels)) {
        rawItems.push({ topicId: key, level: val });
      }
    } else if (dsaLevels && typeof dsaLevels === 'object') {
      for (const [key, val] of Object.entries(dsaLevels)) {
        rawItems.push({ topicId: key, level: val });
      }
    }

    if (rawItems.length === 0) {
      throw new ApiError(400, 'Please provide at least one topic with its level (easy, mid, or hard).');
    }

    // Map each item to a valid topic in the database
    for (const item of rawItems) {
      const idOrSlug = item.topicId || item.id || item.slug;
      const matchedTopic = allTopics.find(
        (t) => t.id === idOrSlug || t.slug === idOrSlug || t.name.toLowerCase() === String(idOrSlug).toLowerCase()
      );

      if (!matchedTopic) {
        throw new ApiError(400, `Topic "${idOrSlug}" is not recognized.`);
      }

      const rawLevel = item.level || item.difficulty || 'easy';
      if (!VALID_LEVELS.includes(String(rawLevel).toLowerCase())) {
        throw new ApiError(400, `Level for "${matchedTopic.name}" must be easy, mid, or hard.`);
      }

      assignedSelections.push({
        topicId: matchedTopic.id,
        level: normalizeLevel(rawLevel),
      });
    }
  } else if (Array.isArray(topicIds) && topicIds.length > 0) {
    // 🔄 Case C: Legacy format ({ difficulty, topicIds })
    const normalizedDiff = normalizeLevel(difficulty || 'easy');
    for (const idOrSlug of topicIds) {
      const matchedTopic = allTopics.find((t) => t.id === idOrSlug || t.slug === idOrSlug);
      if (!matchedTopic) {
        throw new ApiError(400, `One or more topic IDs are invalid.`);
      }
      assignedSelections.push({
        topicId: matchedTopic.id,
        level: normalizedDiff,
      });
    }
  } else {
    // Default fallback: treat as beginner if nothing else specified
    assignedSelections = targetDsaList.map((t) => ({
      topicId: t.id,
      level: 'easy',
    }));
  }

  // Deduplicate by topicId
  const uniqueSelectionsMap = new Map();
  for (const s of assignedSelections) {
    uniqueSelectionsMap.set(s.topicId, s);
  }
  const finalSelections = Array.from(uniqueSelectionsMap.values());

  // Calculate composite rating and overall difficulty
  let totalRating = 0;
  for (const s of finalSelections) {
    totalRating += LEVEL_RATING_MAP[s.level] || 800;
  }
  const calculatedRating = Math.round(totalRating / finalSelections.length);

  let overallDifficulty = 'easy';
  if (calculatedRating >= 1400) {
    overallDifficulty = 'hard';
  } else if (calculatedRating >= 1000) {
    overallDifficulty = 'medium';
  }

  // Run in database transaction
  const updatedUser = await prisma.$transaction(async (tx) => {
    // Update user difficulty, rating, and onboarded flag
    await tx.user.update({
      where: { id: userId },
      data: {
        difficulty: checkBeginner ? 'easy' : overallDifficulty,
        rating: calculatedRating,
        onboarded: true,
      },
    });

    // Clear old user topic associations
    await tx.userTopic.deleteMany({ where: { userId } });

    // Insert new user topic associations with level
    await tx.userTopic.createMany({
      data: finalSelections.map((s) => ({
        userId,
        topicId: s.topicId,
        level: s.level,
      })),
    });

    // Return the full user profile
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

/**
 * Get onboarding status and full topic list with current user levels.
 * @param {string} userId
 */
export const getOnboardingStatus = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      difficulty: true,
      rating: true,
      onboarded: true,
      topics: {
        include: {
          topic: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const allTopics = await prisma.topic.findMany({ orderBy: { name: 'asc' } });
  const userTopicMap = new Map();
  for (const ut of user.topics || []) {
    userTopicMap.set(ut.topicId, ut.level || 'easy');
  }

  const dsaTopics = allTopics
    .filter((t) => t.category === 'DSA')
    .map((t) => ({
      ...t,
      selectedLevel: userTopicMap.get(t.id) || null,
    }));

  const coreTopics = allTopics
    .filter((t) => t.category !== 'DSA')
    .map((t) => ({
      ...t,
      selectedLevel: userTopicMap.get(t.id) || null,
    }));

  return {
    onboarded: user.onboarded,
    rating: user.rating,
    difficulty: user.difficulty,
    dsaTopics,
    coreTopics,
    selectedTopicsCount: user.topics?.length || 0,
  };
};
