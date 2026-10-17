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

    const isDsa = (t) =>
      (t.category && t.category.toUpperCase() === 'DSA') ||
      t.slug.toLowerCase().startsWith('dsa');

    const dsaTopics = all.filter(isDsa);
    const coreTopics = all.filter((t) => !isDsa(t));

    const rawCategory = Array.isArray(req.query.category)
      ? req.query.category[0]
      : req.query.category;
    const categoryParam = rawCategory
      ? String(rawCategory).trim().toLowerCase()
      : null;

    let returnTopics = all;
    if (categoryParam === 'dsa') {
      returnTopics = dsaTopics;
    } else if (categoryParam === 'core') {
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
      (t) => (t.category && t.category.toUpperCase() === 'DSA') || t.slug.toLowerCase().startsWith('dsa')
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
