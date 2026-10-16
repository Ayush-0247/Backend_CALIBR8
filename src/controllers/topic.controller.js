import prisma from '../config/db.js';

/**
 * GET /topics
 * Public route — returns all available topics.
 */
export const getAllTopics = async (req, res, next) => {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ success: true, topics });
  } catch (err) {
    next(err);
  }
};
