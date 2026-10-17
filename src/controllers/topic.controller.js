import prisma from '../config/db.js';

/**
 * GET /topics
 * Public route — returns all available topics, optionally filtered by ?category=DSA
 */
export const getAllTopics = async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = category ? { category: String(category).toUpperCase() } : undefined;

    const topics = await prisma.topic.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const dsaTopics = topics.filter((t) => t.category === 'DSA');
    const coreTopics = topics.filter((t) => t.category !== 'DSA');

    res.status(200).json({
      success: true,
      count: topics.length,
      topics,
      dsaTopics: dsaTopics.length > 0 ? dsaTopics : topics,
      coreTopics,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /topics/dsa
 * Public route — returns all DSA topics specifically
 */
export const getDsaTopics = async (req, res, next) => {
  try {
    const allTopics = await prisma.topic.findMany({
      orderBy: { name: 'asc' },
    });

    const dsaTopics = allTopics.filter((t) => t.category === 'DSA');

    res.status(200).json({
      success: true,
      count: dsaTopics.length,
      topics: dsaTopics.length > 0 ? dsaTopics : allTopics,
    });
  } catch (err) {
    next(err);
  }
};
