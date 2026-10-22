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


// GET /api/topics/dsa  OR  /api/dsa-topics
export const getAllDsaTopics = async (req, res) => {
  try {
    const topics = await prisma.dsaTopic.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: { select: { problems: true } }
      }
    })

    const data = topics.map(t => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      order: t.order,
      totalProblems: t._count.problems
    }))

    res.json(data)
  } catch (err) {
    console.error("getAllDsaTopics error:", err)
    res.status(500).json({ error: "Failed to fetch dsa topics" })
  }
}

// GET /api/topics/dsa/:slug/problems
export const getProblemsByDsaTopic = async (req, res) => {
  try {
    const { slug } = req.params
    const { difficulty, search } = req.query

    const topic = await prisma.dsaTopic.findUnique({ where: { slug } })
    if (!topic) return res.status(404).json({ error: "Topic not found" })

    const problems = await prisma.problem.findMany({
      where: {
        dsaTopicId: topic.id,
        ...(difficulty ? { difficulty: { equals: difficulty, mode: "insensitive" } } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } }
          ]
        } : {})
      },
      orderBy: { problemNumber: "asc" },
      select: {
        id: true,
        problemNumber: true,
        slug: true,
        title: true,
        difficulty: true,
        tags: true
      }
    })

    res.json({
      topic: { id: topic.id, slug: topic.slug, name: topic.name },
      count: problems.length,
      problems
    })
  } catch (err) {
    console.error("getProblemsByDsaTopic error:", err)
    res.status(500).json({ error: "Failed to fetch problems" })
  }
}