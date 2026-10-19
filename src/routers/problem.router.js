import { Router } from "express";
import {
  getAllProblems,
  getProblemBySlug,
  addProblem,
} from "../controllers/problem.controller.js";

const router = Router();

// GET /api/problems or /problems - list all
router.get("/", getAllProblems);

// POST /api/problems - add problem
router.post("/", addProblem);

// GET /api/problems/:slug - problem detail with testcases + templates
router.get("/:slug", getProblemBySlug);

export default router;
