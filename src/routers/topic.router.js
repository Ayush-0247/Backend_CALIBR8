import { Router } from "express";
import {
  getAllTopics,
  getDsaTopics,
  getTopicDetail,
  getAllDsaTopics, 
  getProblemsByDsaTopic 
} from "../controllers/topic.controller.js";

const router = Router();

// GET /topics/dsa - only DSA topics
router.get("/dsa", getDsaTopics);

// GET /topics/:identifier - single topic by ID or slug
router.get("/:identifier", getTopicDetail);

// GET /topics - all topics
router.get("/", getAllTopics);

router.get("/dsa", getAllDsaTopics)
router.get("/dsa/:slug/problems", getProblemsByDsaTopic)

export default router;
