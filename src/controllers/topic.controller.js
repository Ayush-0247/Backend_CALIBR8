import prisma from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Helper to identify whether a topic belongs to DSA
 */
export const isDsa = (t) =>
  (t.category && t.category.toUpperCase() === "DSA") ||
  (t.slug && t.slug.toLowerCase().startsWith("dsa"));

/**
 * Get list of topics, optionally filtered by category
 */
export const fetchTopics = async (categoryParam = null) => {
  const all = await prisma.topic.findMany({
    orderBy: { name: "asc" },
  });

  const dsaTopics = all.filter(isDsa);
  const coreTopics = all.filter((t) => !isDsa(t));

  let returnTopics = all;
  if (categoryParam) {
    const target = String(categoryParam).trim().toLowerCase();
    if (target === "dsa") {
      returnTopics = dsaTopics;
    } else if (target === "core") {
      returnTopics = coreTopics;
    }
  }

  return {
    topics: returnTopics,
    dsaTopics,
    coreTopics,
  };
};

/**
 * Get specifically DSA topics
 */
export const fetchDsaTopics = async () => {
  const { dsaTopics } = await fetchTopics();
  return dsaTopics;
};

/**
 * Get a single topic by ID or slug
 */
export const fetchTopicByIdOrSlug = async (identifier) => {
  let topic = await prisma.topic.findUnique({
    where: { id: identifier },
  });

  if (!topic) {
    topic = await prisma.topic.findUnique({
      where: { slug: identifier },
    });
  }

  if (!topic) {
    throw new ApiError(404, `Topic '${identifier}' not found.`);
  }

  return topic;
};

/**
 * GET /api/topics
 * Returns available topics with category filtering
 */
export const getAllTopics = async (req, res, next) => {
  try {
    const rawCategory = Array.isArray(req.query.category)
      ? req.query.category[0]
      : req.query.category;

    const { topics, dsaTopics, coreTopics } = await fetchTopics(rawCategory);

    res.status(200).json({
      success: true,
      count: topics.length,
      topics,
      dsaTopics,
      coreTopics,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/topics/dsa
 * Returns only DSA topics
 */
export const getDsaTopics = async (req, res, next) => {
  try {
    const dsaTopics = await fetchDsaTopics();
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

/**
 * GET /api/topics/:identifier
 * Returns a specific topic by ID or slug
 */
export const getTopicDetail = async (req, res, next) => {
  try {
    const topic = await fetchTopicByIdOrSlug(req.params.identifier);
    res.status(200).json({ success: true, topic });
  } catch (err) {
    next(err);
  }
};
