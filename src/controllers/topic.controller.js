import {
  fetchTopics,
  fetchDsaTopics,
  fetchTopicByIdOrSlug,
} from "../services/topic.service.js";

/**
 * GET /topics or GET /topic
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
 * GET /topics/dsa or GET /topic/dsa
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
 * GET /topics/:identifier
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
