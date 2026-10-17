import prisma from '../config/db.js';

/**
 * GET /topics
 * Public route — returns all available topics.
 */
export const getAllTopics = async (req, res, next) => {
  try {
    const all = await prisma.topic.findMany({
      orderBy: { name: 'asc' },
    });

    const dsaTopics = all.filter(
      (t) => t.category === 'DSA' || t.slug.startsWith('dsa')
    );
    const coreTopics = all.filter(
      (t) => t.category !== 'DSA' && !t.slug.startsWith('dsa')
    );

    const { category } = req.query;
    let returnTopics = all;
    if (category === 'dsa') {
      returnTopics = dsaTopics;
    } else if (category === 'core') {
      returnTopics = coreTopics;
    }

    res.status(200).json({
      success: true,
      count: returnTopics.length,
      topics: returnTopics,
      dsaTopics,
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
    const all = await prisma.topic.findMany({
      orderBy: { name: 'asc' },
    });
    const dsaTopics = all.filter(
      (t) => t.category === 'DSA' || t.slug.startsWith('dsa')
    );
    res.status(200).json({
      success: true,
      count: dsaTopics.length,
      topics: dsaTopics,
      dsaTopics,
    });
  } catch (err) {
    next(err);
  }
};
