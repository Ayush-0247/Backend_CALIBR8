import prisma from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Helper to identify whether a topic belongs to DSA
 */
const isDsa = (t) =>
  (t.category && t.category.toUpperCase() === "DSA") ||
  (t.slug && t.slug.toLowerCase().startsWith("dsa"));

/**
 * Get list of topics, optionally filtered by category
 * @param {string|null} categoryParam
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
 * @param {string} identifier
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
