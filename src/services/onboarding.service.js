import prisma from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

const VALID_LEVELS = ['easy', 'medium', 'hard', 'mid'];
const LEVEL_RATING_MAP = { easy: 800, medium: 1200, mid: 1200, hard: 1600 };

export const normalizeLevel = (level) => {
  if (!level) return 'easy';
  const clean = String(level).trim().toLowerCase();
  if (clean === 'mid' || clean === 'medium') return 'medium';
  if (clean === 'hard') return 'hard';
  return 'easy';
};

export const completeOnboarding = async (userId, payload = {}) => {
  const {
    beginner, isBeginner, difficulty,
    topicLevels, topics: inputTopics,
    dsaLevels, topicIds,
  } = payload;

  const checkBeginner = beginner === true || isBeginner === true || 
    (typeof difficulty === 'string' && difficulty.toLowerCase() === 'beginner');

  const allTopics = await prisma.topic.findMany();
  if (allTopics.length === 0) throw new ApiError(400, 'No topics seeded');

  // FIX: case-insensitive category check
  const dsaTopics = allTopics.filter(t => String(t.category).toUpperCase() === 'DSA');
  const targetDsaList = dsaTopics.length > 0 ? dsaTopics : allTopics;

  let assignedSelections = [];

  if (checkBeginner) {
    assignedSelections = targetDsaList.map(t => ({ topicId: t.id, level: 'easy' }));
  } else if (topicLevels || inputTopics || dsaLevels) {
    const rawItems = [];
    if (Array.isArray(topicLevels)) rawItems.push(...topicLevels);
    else if (Array.isArray(inputTopics)) rawItems.push(...inputTopics);
    else if (topicLevels && typeof topicLevels === 'object') {
      for (const [k, v] of Object.entries(topicLevels)) rawItems.push({ topicId: k, level: v });
    } else if (dsaLevels && typeof dsaLevels === 'object') {
      for (const [k, v] of Object.entries(dsaLevels)) rawItems.push({ topicId: k, level: v });
    }

    if (rawItems.length === 0) throw new ApiError(400, 'Provide at least 1 topic with level');

    for (const item of rawItems) {
      const idOrSlug = item.topicId || item.id || item.slug;
      const matchedTopic = allTopics.find(
        t => t.id === idOrSlug || t.slug === idOrSlug || t.name.toLowerCase() === String(idOrSlug).toLowerCase()
      );
      if (!matchedTopic) throw new ApiError(400, `Topic "${idOrSlug}" not recognized`);
      
      const rawLevel = item.level || item.difficulty || 'easy';
      if (!VALID_LEVELS.includes(String(rawLevel).toLowerCase())) {
        throw new ApiError(400, `Level for "${matchedTopic.name}" must be easy, medium, hard`);
      }
      assignedSelections.push({ topicId: matchedTopic.id, level: normalizeLevel(rawLevel) });
    }
  } else if (Array.isArray(topicIds) && topicIds.length > 0) {
    const normalizedDiff = normalizeLevel(difficulty || 'easy');
    for (const idOrSlug of topicIds) {
      const matchedTopic = allTopics.find(t => t.id === idOrSlug || t.slug === idOrSlug);
      if (!matchedTopic) throw new ApiError(400, `Topic ID "${idOrSlug}" is invalid. Use t-arrays, t-strings etc`);
      assignedSelections.push({ topicId: matchedTopic.id, level: normalizedDiff });
    }
  } else {
    // default: beginner
    assignedSelections = targetDsaList.map(t => ({ topicId: t.id, level: 'easy' }));
  }

  // Deduplicate
  const uniqueMap = new Map();
  assignedSelections.forEach(s => uniqueMap.set(s.topicId, s));
  const finalSelections = Array.from(uniqueMap.values());

  if (finalSelections.length === 0) throw new ApiError(400, 'No valid topics selected');

  // Calculate rating
  let totalRating = 0;
  finalSelections.forEach(s => totalRating += LEVEL_RATING_MAP[s.level] || 800);
  const calculatedRating = Math.round(totalRating / finalSelections.length);
  let overallDifficulty = 'easy';
  if (calculatedRating >= 1400) overallDifficulty = 'hard';
  else if (calculatedRating >= 1000) overallDifficulty = 'medium';

  // DB Transaction - THIS WAS CAUSING 500
  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        difficulty: checkBeginner ? 'easy' : overallDifficulty,
        rating: calculatedRating,
        onboarded: true,
      },
    });
    await tx.userTopic.deleteMany({ where: { userId } });
    await tx.userTopic.createMany({
      data: finalSelections.map(s => ({
        userId,
        topicId: s.topicId,
        level: s.level,
      })),
    });
    return tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true,
        difficulty: true, rating: true, onboarded: true,
        createdAt: true, updatedAt: true,
        topics: { include: { topic: true } },
      },
    });
  });

  return updatedUser;
};

export const getOnboardingStatus = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true,
      difficulty: true, rating: true, onboarded: true,
      topics: { include: { topic: true } },
    },
  });
  if (!user) throw new ApiError(404, 'User not found');

  const allTopics = await prisma.topic.findMany({ orderBy: { name: 'asc' } });
  const userTopicMap = new Map((user.topics || []).map(ut => [ut.topicId, ut.level]));

  return {
    onboarded: user.onboarded,
    rating: user.rating,
    difficulty: user.difficulty,
    dsaTopics: allTopics.filter(t => String(t.category).toUpperCase() === 'DSA').map(t => ({
      ...t, selectedLevel: userTopicMap.get(t.id) || null
    })),
    coreTopics: allTopics.filter(t => String(t.category).toUpperCase() !== 'DSA').map(t => ({
      ...t, selectedLevel: userTopicMap.get(t.id) || null
    })),
    selectedTopicsCount: user.topics?.length || 0,
  };
};