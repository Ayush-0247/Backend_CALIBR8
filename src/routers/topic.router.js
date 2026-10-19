import { Router } from "express";
import {
  getAllTopics,
  getDsaTopics,
  getTopicDetail,
} from "../controllers/topic.controller.js";

const router = Router();

// GET /topics/dsa - only DSA topics
router.get("/dsa", getDsaTopics);

// GET /topics/:identifier - single topic by ID or slug
router.get("/:identifier", getTopicDetail);

// GET /topics - all topics
router.get("/", getAllTopics);

export default router;
